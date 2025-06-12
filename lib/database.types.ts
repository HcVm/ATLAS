export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      departments: {
        Row: {
          id: string
          name: string
          description: string | null
          color: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          color?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          color?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: string
          department_id: string | null
          avatar_url: string | null
          phone: string | null
          created_at: string
          updated_at: string
          departments?: {
            id: string
            name: string
          } | null
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role?: string
          department_id?: string | null
          avatar_url?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: string
          department_id?: string | null
          avatar_url?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          id: string
          title: string
          description: string | null
          document_number: string
          status: string
          priority: string
          current_department_id: string | null
          created_by: string
          file_url: string | null
          file_name: string | null
          qr_code: string | null
          is_certified: boolean | null
          certified_by: string | null
          certified_at: string | null
          verification_hash: string | null
          certification_notes: string | null
          is_public: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          document_number?: string
          status?: string
          priority?: string
          current_department_id?: string | null
          created_by: string
          file_url?: string | null
          file_name?: string | null
          qr_code?: string | null
          is_certified?: boolean | null
          certified_by?: string | null
          certified_at?: string | null
          verification_hash?: string | null
          certification_notes?: string | null
          is_public?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          document_number?: string
          status?: string
          priority?: string
          current_department_id?: string | null
          created_by?: string
          file_url?: string | null
          file_name?: string | null
          qr_code?: string | null
          is_certified?: boolean | null
          certified_by?: string | null
          certified_at?: string | null
          verification_hash?: string | null
          certification_notes?: string | null
          is_public?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_current_department_id_fkey"
            columns: ["current_department_id"]
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: string
          read: boolean
          related_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type: string
          read?: boolean
          related_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: string
          read?: boolean
          related_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_downloads: {
        Row: {
          id: string
          document_id: string
          user_id: string | null
          download_type: string
          file_name: string | null
          file_size: number | null
          ip_address: string | null
          user_agent: string | null
          is_public_access: boolean
          session_id: string | null
          referrer: string | null
          country: string | null
          city: string | null
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          user_id?: string | null
          download_type: string
          file_name?: string | null
          file_size?: number | null
          ip_address?: string | null
          user_agent?: string | null
          is_public_access?: boolean
          session_id?: string | null
          referrer?: string | null
          country?: string | null
          city?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          user_id?: string | null
          download_type?: string
          file_name?: string | null
          file_size?: number | null
          ip_address?: string | null
          user_agent?: string | null
          is_public_access?: boolean
          session_id?: string | null
          referrer?: string | null
          country?: string | null
          city?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_downloads_document_id_fkey"
            columns: ["document_id"]
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_downloads_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
