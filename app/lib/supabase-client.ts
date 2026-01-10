import { createClient, SupabaseClient } from '@supabase/supabase-js'

// For static export, we need to use NEXT_PUBLIC_ variables
// These might not be available during build time, so we provide defaults
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// Only create the client if we have real values (not during build)
export const supabase: SupabaseClient | null = (supabaseUrl !== 'https://placeholder.supabase.co' && supabaseAnonKey !== 'placeholder-key')
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null 