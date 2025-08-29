import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/lib/database.types"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Debug environment variables
console.log("[v0] Supabase URL:", supabaseUrl ? "✓ Set" : "✗ Missing")
console.log("[v0] Supabase Anon Key:", supabaseAnonKey ? "✓ Set" : "✗ Missing")

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("[v0] Missing Supabase environment variables!")
  console.error("[v0] NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl)
  console.error("[v0] NEXT_PUBLIC_SUPABASE_ANON_KEY:", supabaseAnonKey ? "Present" : "Missing")
}

export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)

console.log("[v0] Supabase client created:", supabase ? "✓ Success" : "✗ Failed")
