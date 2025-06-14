export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          name: string
          code: string
          description: string | null
          logo_url: string | null
          color: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          code: string
          description?: string | null
          logo_url?: string | null
          color?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string
          description?: string | null
          logo_url?: string | null
          color?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
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
          id?: string
          name: string
          description?: string | null
          color?: string | null
          company_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          color?: string | null
          company_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
          company_id: string | null
          created_at: string
          updated_at: string
          departments?: {
            id: string
            name: string
          } | null
          companies?: {
            id: string
            name: string
            code: string
            color: string
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
          company_id?: string | null
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
          company_id?: string | null
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
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
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
          company_id: string | null
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
          company_id?: string | null
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
          company_id?: string | null
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
          {
            foreignKeyName: "documents_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          content: string
          image_url?: string | null
          published?: boolean
          created_by: string
          company_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          content?: string
          image_url?: string | null
          published?: boolean
          created_by?: string
          company_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
          id?: string
          company_id: string
          year: number
          last_number?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          year?: number
          last_number?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_sequences_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
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
      brands: {
        Row: {
          id: string
          name: string
          description: string | null
          company_id: string | null
          logo_url: string | null
          color: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          company_id?: string | null
          logo_url?: string | null
          color?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          company_id?: string | null
          logo_url?: string | null
          color?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brands_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          id: string
          name: string
          description: string | null
          company_id: string | null
          color: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          company_id?: string | null
          color?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          company_id?: string | null
          color?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          id: string
          name: string
          description: string | null
          code: string
          barcode: string | null
          brand_id: string | null
          category_id: string | null
          unit_of_measure: string
          minimum_stock: number
          current_stock: number
          cost_price: number
          sale_price: number
          location: string | null
          notes: string | null
          is_active: boolean
          company_id: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          brands?: {
            id: string
            name: string
            color: string
          } | null
          product_categories?: {
            id: string
            name: string
            color: string
          } | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          code: string
          barcode?: string | null
          brand_id?: string | null
          category_id?: string | null
          unit_of_measure?: string
          minimum_stock?: number
          current_stock?: number
          cost_price?: number
          sale_price?: number
          location?: string | null
          notes?: string | null
          is_active?: boolean
          company_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          code?: string
          barcode?: string | null
          brand_id?: string | null
          category_id?: string | null
          unit_of_measure?: string
          minimum_stock?: number
          current_stock?: number
          cost_price?: number
          sale_price?: number
          location?: string | null
          notes?: string | null
          is_active?: boolean
          company_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          id: string
          movement_type: string
          quantity: number
          sale_price: number | null
          total_amount: number | null
          purchase_order_number: string | null
          destination_entity_name: string | null
          destination_address: string | null
          supplier: string | null
          reason: string | null
          notes: string | null
          movement_date: string
          created_at: string
          products?: {
            id: string
            name: string
            code: string
            unit_of_measure: string
          } | null
          profiles?: {
            full_name: string
          } | null
          peru_departments?: {
            name: string
          } | null
        }
        Insert: {
          id: string
          movement_type: string
          quantity: number
          sale_price: number | null
          total_amount: number | null
          purchase_order_number: string | null
          destination_entity_name: string | null
          destination_address: string | null
          supplier: string | null
          reason: string | null
          notes: string | null
          movement_date: string
          created_at: string
          product_id?: string | null
          profile_id?: string | null
          peru_department_id?: string | null  
        }
        Update: {
          id: string
          movement_type: string
          quantity: number
          sale_price: number | null
          total_amount: number | null
          purchase_order_number: string | null
          destination_entity_name: string | null
          destination_address: string | null
          supplier: string | null
          reason: string | null
          notes: string | null
          movement_date: string
          created_at: string
          product_id?: string | null
          profile_id?: string | null
          peru_department_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_destination_department"
            columns: ["destination_department_id"]
            referencedRelation: "peru_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      peru_departments: {
        Row: {
          id: string
          name: string
          code: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          code: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_document_number: {
        Args: {
          p_company_id: string
          p_user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
