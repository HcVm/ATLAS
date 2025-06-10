import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: false, // DESACTIVAR auto refresh para evitar eventos
    detectSessionInUrl: true,
  },
})

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: "admin" | "supervisor" | "user"
          department_id: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role?: "admin" | "supervisor" | "user"
          department_id?: string | null
          avatar_url?: string | null
        }
        Update: {
          email?: string
          full_name?: string
          role?: "admin" | "supervisor" | "user"
          department_id?: string | null
          avatar_url?: string | null
        }
      }
      documents: {
        Row: {
          id: string
          title: string
          description: string | null
          document_number: string
          status: "pending" | "in_progress" | "completed" | "cancelled"
          qr_code: string | null
          file_url: string | null
          created_by: string
          department_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          title: string
          description?: string | null
          document_number: string
          status?: "pending" | "in_progress" | "completed" | "cancelled"
          qr_code?: string | null
          file_url?: string | null
          created_by: string
          department_id: string
        }
        Update: {
          title?: string
          description?: string | null
          status?: "pending" | "in_progress" | "completed" | "cancelled"
          qr_code?: string | null
          file_url?: string | null
        }
      }
      departments: {
        Row: {
          id: string
          name: string
          description: string | null
          color: string | null
          created_at: string
          updated_at: string
        }
      }
      news: {
        Row: {
          id: string
          title: string
          content: string
          image_url: string | null
          published: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          title: string
          content: string
          image_url?: string | null
          published?: boolean
          created_by: string
        }
        Update: {
          title?: string
          content?: string
          image_url?: string | null
          published?: boolean
        }
      }
      document_movements: {
        Row: {
          id: string
          document_id: string
          from_department_id: string | null
          to_department_id: string | null
          moved_by: string
          notes: string | null
          created_at: string
        }
        Insert: {
          document_id: string
          from_department_id?: string | null
          to_department_id?: string | null
          moved_by: string
          notes?: string | null
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: string
          related_id: string | null
          read: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          title: string
          message: string
          type?: string
          related_id?: string | null
          read?: boolean
        }
        Update: {
          read?: boolean
        }
      }
    }
  }
}
