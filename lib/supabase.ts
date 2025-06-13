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

// Definición de tipos para la base de datos
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          companies: any
          id: string
          email: string
          full_name: string
          role: "admin" | "supervisor" | "user"
          department_id: string | null
          company_id: string | null
          avatar_url: string | null
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role?: "admin" | "supervisor" | "user"
          department_id?: string | null
          company_id?: string | null
          avatar_url?: string | null
          phone?: string | null
        }
        Update: {
          email?: string
          full_name?: string
          role?: "admin" | "supervisor" | "user"
          department_id?: string | null
          company_id?: string | null
          avatar_url?: string | null
          phone?: string | null
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
          company_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          title: string
          description?: string | null
          document_number?: string
          status?: "pending" | "in_progress" | "completed" | "cancelled"
          qr_code?: string | null
          file_url?: string | null
          created_by: string
          department_id: string
          company_id?: string | null
        }
        Update: {
          title?: string
          description?: string | null
          status?: "pending" | "in_progress" | "completed" | "cancelled"
          qr_code?: string | null
          file_url?: string | null
          company_id?: string | null
        }
      }
      departments: {
        Row: {
          id: string
          name: string
          description: string | null
          color: string | null
          company_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          name: string
          description?: string | null
          color?: string | null
          company_id?: string | null
        }
        Update: {
          name?: string
          description?: string | null
          color?: string | null
          company_id?: string | null
        }
      }
      companies: {
        Row: {
          id: string
          name: string
          code: string
          description: string | null
          color: string
          created_at: string
          updated_at: string
        }
        Insert: {
          name: string
          code: string
          description?: string | null
          color?: string
        }
        Update: {
          name?: string
          code?: string
          description?: string | null
          color?: string
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
          company_id: string | null
          is_global: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          title: string
          content: string
          image_url?: string | null
          published?: boolean
          created_by: string
          company_id?: string | null
          is_global?: boolean
        }
        Update: {
          title?: string
          content?: string
          image_url?: string | null
          published?: boolean
          company_id?: string | null
          is_global?: boolean
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
      document_sequences: {
        Row: {
          id: string
          company_id: string
          year: number
          last_number: number
          created_at: string
          updated_at: string
        }
        Insert: {
          company_id: string
          year: number
          last_number?: number
        }
        Update: {
          last_number?: number
        }
      }
    }
  }
}
