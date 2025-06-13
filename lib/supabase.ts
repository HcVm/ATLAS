import { createClient } from "@supabase/supabase-js"
import { Database } from "@/lib/database.types" // ajusta la ruta si está en otro lugar

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: false, // DESACTIVAR auto refresh para evitar eventos
    detectSessionInUrl: true,
  },
})
