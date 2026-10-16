-- ==============================================================================
-- TirfMarket Unified Database Schema (PostgreSQL + PostGIS)
-- Run this in your Supabase SQL Editor
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Profiles Table (Extends Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    phone_number TEXT,
    account_type TEXT DEFAULT 'buyer' CHECK (account_type IN ('buyer', 'seller', 'admin')),
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    is_banned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Merchants Table (Physical Venues with GIS Location)
CREATE TABLE IF NOT EXISTS public.merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT,
    description TEXT,
    logo_url TEXT,
    phone TEXT, -- Merchant payout M-PESA number
    location TEXT NOT NULL, -- e.g. "Bole Atlas", "4 Kilo Campus", "Piazza"
    lat DOUBLE PRECISION NOT NULL CHECK (lat BETWEEN -90 AND 90),
    lon DOUBLE PRECISION NOT NULL CHECK (lon BETWEEN -180 AND 180),
    geom GEOGRAPHY(Point, 4326) GENERATED ALWAYS AS
        (ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography) STORED,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS merchants_geom_idx ON public.merchants USING gist (geom);

-- 3. Deals Table (Flash Deals & Marketplace Offers)
CREATE TABLE IF NOT EXISTS public.deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    seller_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    merchant_name TEXT,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    original_price DECIMAL(10, 2) NOT NULL CHECK (original_price > 0),
    discounted_price DECIMAL(10, 2) NOT NULL CHECK (discounted_price > 0),
    discount_percentage INTEGER GENERATED ALWAYS AS 
        (ROUND(((original_price - discounted_price) / original_price) * 100)) STORED,
    image_url TEXT,
    location TEXT,
    fine_print TEXT,
    highlights TEXT,
    initial_stock INTEGER DEFAULT 20,
    remaining_stock INTEGER DEFAULT 20,
    bought_count INTEGER DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS deals_merchant_idx ON public.deals (merchant_id);
CREATE INDEX IF NOT EXISTS deals_active_status_idx ON public.deals (is_active, status);

-- 4. Orders Table (M-PESA Cashless Transactions)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    deal_id UUID NOT NULL REFERENCES public.deals(id),
    merchant_id UUID NOT NULL REFERENCES public.merchants(id),
    phone TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'pending', 'paid', 'failed')),
    checkout_request_id TEXT UNIQUE,
    mpesa_receipt TEXT,
    paid_amount NUMERIC,
    failure_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS orders_merchant_idx ON public.orders (merchant_id, status);
CREATE INDEX IF NOT EXISTS orders_checkout_idx ON public.orders (checkout_request_id);

-- 5. Reviews Table (Social Proof & Ratings)
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Trigger: Updated At for Orders
CREATE OR REPLACE FUNCTION set_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_updated_at_trg ON public.orders;
CREATE TRIGGER orders_updated_at_trg
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at_column();

-- 7. Trigger: Auto Create Profile upon User Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, phone_number, account_type)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'phone_number',
        COALESCE(NEW.raw_user_meta_data->>'account_type', 'buyer')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 8. Admin Security Helper Function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
    admin_status BOOLEAN;
BEGIN
    SELECT (role = 'admin') INTO admin_status FROM public.profiles WHERE id = auth.uid();
    RETURN COALESCE(admin_status, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Hyperlocal 2km Nearby Deals Spatial Query
DROP FUNCTION IF EXISTS nearby_deals(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER);
CREATE OR REPLACE FUNCTION nearby_deals(
    user_lat DOUBLE PRECISION,
    user_lon DOUBLE PRECISION,
    radius_m INTEGER DEFAULT 2000
)
RETURNS TABLE (
    deal_id UUID,
    title TEXT,
    description TEXT,
    category TEXT,
    original_price DECIMAL,
    discounted_price DECIMAL,
    discount_percentage INTEGER,
    final_amount INTEGER,
    merchant_id UUID,
    merchant_name TEXT,
    location TEXT,
    image_url TEXT,
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    distance_meters DOUBLE PRECISION
) LANGUAGE sql STABLE AS $$
    SELECT
        d.id AS deal_id,
        d.title,
        d.description,
        d.category,
        d.original_price,
        d.discounted_price,
        d.discount_percentage,
        CEIL(d.discounted_price)::INTEGER AS final_amount,
        m.id AS merchant_id,
        m.name AS merchant_name,
        m.location,
        d.image_url,
        m.lat,
        m.lon,
        ROUND(ST_Distance(
            m.geom,
            ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326)::geography
        )) AS distance_meters
    FROM deals d
    JOIN merchants m ON d.merchant_id = m.id
    WHERE d.is_active = true
      AND d.status = 'approved'
      AND (d.expires_at IS NULL OR d.expires_at > now())
      AND ST_DWithin(
          m.geom,
          ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326)::geography,
          radius_m
      )
    ORDER BY distance_meters ASC;
$$;

-- 10. Enable Row Level Security (RLS)
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Public read merchants" ON public.merchants FOR SELECT USING (true);
CREATE POLICY "Public read approved deals" ON public.deals FOR SELECT USING (status = 'approved');
CREATE POLICY "Public read reviews" ON public.reviews FOR SELECT USING (true);

-- User profiles
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins full manage profiles" ON public.profiles FOR ALL USING (public.is_admin());

-- Sellers and Admins deal management
CREATE POLICY "Sellers view own deals" ON public.deals FOR SELECT USING (seller_id = auth.uid());
CREATE POLICY "Sellers insert own deals" ON public.deals FOR INSERT WITH CHECK (
    seller_id = auth.uid() AND 
    (SELECT account_type FROM public.profiles WHERE id = auth.uid()) = 'seller'
);
CREATE POLICY "Admins view all deals" ON public.deals FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins update deals" ON public.deals FOR UPDATE USING (public.is_admin());

-- Orders access
CREATE POLICY "Users read own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Public insert orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Service and Admins manage orders" ON public.orders FOR ALL USING (true);
