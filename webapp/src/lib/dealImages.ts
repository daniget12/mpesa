/**
 * Centralized mapping for authentic Ethiopian deal imagery.
 * All images are locally bundled under /deals/ to guarantee zero CDN rate limiting,
 * fast loading on mobile networks, and 100% Ethiopian visual fidelity.
 */

export const ETHIOPIAN_CATEGORY_IMAGES: Record<string, string> = {
  cafe: '/deals/ethiopian-coffee.jpg',
  coffee: '/deals/ethiopian-coffee.jpg',
  food: '/deals/ethiopian-tibs.jpg',
  restaurant: '/deals/ethiopian-tibs.jpg',
  grocery: '/deals/ethiopian-produce.jpg',
  pharmacy: '/deals/ethiopian-store.jpg',
  tailor: '/deals/ethiopian-habesha-kemis.jpg',
  barbershop: '/deals/ethiopian-barber.jpg',
  barber: '/deals/ethiopian-barber.jpg',
  bakery: '/deals/ethiopian-bakery.jpg',
  juice: '/deals/ethiopian-smoothie.jpg',
  books: '/deals/ethiopian-store.jpg',
};

export const DEFAULT_ETHIOPIAN_DEAL_IMAGE = '/deals/ethiopian-beyaynetu.jpg';

export interface DealImageInput {
  title?: string;
  category?: string;
  image?: string;
  image_url?: string;
}

/**
 * Returns an authentic Ethiopian deal photo based on specific deal keywords,
 * category, or authentic fallback.
 */
export function getDealImage(deal?: DealImageInput | null): string {
  if (!deal) return DEFAULT_ETHIOPIAN_DEAL_IMAGE;

  // If a valid custom image was provided that isn't the old western stock photo fallback
  const explicitImg = deal.image || deal.image_url;
  if (
    explicitImg &&
    !explicitImg.includes('photo-1556742049-0cfed4f6a45d') &&
    !explicitImg.includes('photo-1501339847302') &&
    !explicitImg.includes('photo-1555396273')
  ) {
    return explicitImg;
  }

  const title = (deal.title || '').toLowerCase();

  // 1. Specific Ethiopian dish & product keyword matching
  if (title.includes('tibs') || title.includes('shekla') || title.includes('beef') || title.includes('meat')) {
    return '/deals/ethiopian-tibs.jpg';
  }
  if (title.includes('beyaynetu') || title.includes('fasting') || title.includes('platter') || title.includes('shiro') || title.includes('injera')) {
    return '/deals/ethiopian-beyaynetu.jpg';
  }
  if (title.includes('ertib') || title.includes('fitfit') || title.includes('firfir')) {
    return '/deals/ethiopian-ertib.jpg';
  }
  if (title.includes('kemis') || title.includes('habesha') || title.includes('dress') || title.includes('hemming') || title.includes('suit') || title.includes('alteration')) {
    return '/deals/ethiopian-habesha-kemis.jpg';
  }
  if (title.includes('leather') || title.includes('jacket') || title.includes('craft')) {
    return '/deals/ethiopian-leather.jpg';
  }
  if (title.includes('coffee') || title.includes('buna') || title.includes('jebena') || title.includes('roast') || title.includes('brew') || title.includes('tea') || title.includes('macchiato')) {
    return '/deals/ethiopian-coffee.jpg';
  }
  if (title.includes('pastry') || title.includes('dabo') || title.includes('bread') || title.includes('cake') || title.includes('bakery') || title.includes('bundle') || title.includes('sourdough')) {
    return '/deals/ethiopian-bakery.jpg';
  }
  if (title.includes('fruit') || title.includes('vegetable') || title.includes('produce') || title.includes('box') || title.includes('olive oil') || title.includes('pasta')) {
    return '/deals/ethiopian-produce.jpg';
  }
  if (title.includes('barber') || title.includes('haircut') || title.includes('beard') || title.includes('towel') || title.includes('facial') || title.includes('hair treatment')) {
    return '/deals/ethiopian-barber.jpg';
  }
  if (title.includes('pharmacy') || title.includes('hygiene') || title.includes('first aid') || title.includes('vitamin') || title.includes('supplement') || title.includes('mineral')) {
    return '/deals/ethiopian-store.jpg';
  }
  if (title.includes('smoothie') || title.includes('shake') || title.includes('juice') || title.includes('spris') || title.includes('papaya') || title.includes('avocado') || title.includes('bowl')) {
    return '/deals/ethiopian-smoothie.jpg';
  }

  // 2. Category fallback
  const cat = (deal.category || '').toLowerCase();
  if (cat && ETHIOPIAN_CATEGORY_IMAGES[cat]) {
    return ETHIOPIAN_CATEGORY_IMAGES[cat];
  }

  // 3. Authentic Ethiopian default fallback (Beyaynetu platter)
  return DEFAULT_ETHIOPIAN_DEAL_IMAGE;
}
