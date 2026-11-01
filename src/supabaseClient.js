import { createClient } from '@supabase/supabase-js'

// Configurazione da variabili d'ambiente (.env.local in locale, Environment Variables su Vercel)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Configurazione mancante: imposta VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (vedi .env.example)')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
