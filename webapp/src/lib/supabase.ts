import { createClient } from '@supabase/supabase-js';

const activeSupabaseUrl = 'https://tnvohncdvoafbeqwxypf.supabase.co';
const activeSupabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRudm9obmNkdm9hZmJlcXd4eXBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3NTM1MzcsImV4cCI6MjA4MjMyOTUzN30.KZ6JRUJ1ngN3ylDWo3glSV8ng6jD-XsC_9iXwiS-gPc';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || activeSupabaseUrl;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || activeSupabaseAnonKey;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('dummy') &&
  !supabaseAnonKey.includes('dummy')
);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
