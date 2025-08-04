export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          name: string
          ruc: string
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
          ruc: string
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
          ruc?: string
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
            ruc: string
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
          modelo: string | null
          ficha_tecnica: string | null
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
          modelo?: string | null
          ficha_tecnica?: string | null
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
          modelo?: string | null
          ficha_tecnica?: string | null
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
      quotations: {
        Row: {
          id: string
          quotation_date: string | null
          company_id: string
          company_name: string
          company_ruc: string
          entity_id: string
          entity_name: string
          entity_ruc: string
          delivery_location: string
          status: string | null
          valid_until: string | null
          observations: string | null
          created_by: string
          created_at: string | null
          updated_at: string | null
          route_origin_address: string | null
          route_destination_address: string | null
          route_distance_km: number | null
          route_duration_minutes: number | null
          route_google_maps_url: string | null
          route_created_at: string | null
          route_created_by: string | null
          quotation_number: string | null
          is_multi_product: boolean | null
          items_count: number | null
          budget_ceiling_total: number | null
          contact_person: string | null
          commission_percentage: number | null
          commission_base_amount: number | null
          commission_amount: number | null
          commission_notes: string | null
        }
        Insert: {
          id?: string
          quotation_date?: string | null
          company_id: string
          company_name: string
          company_ruc: string
          entity_id: string
          entity_name: string
          entity_ruc: string
          delivery_location: string
          status?: string | null
          valid_until?: string | null
          observations?: string | null
          created_by: string
          created_at?: string | null
          updated_at?: string | null
          route_origin_address?: string | null
          route_destination_address?: string | null
          route_distance_km?: number | null
          route_duration_minutes?: number | null
          route_google_maps_url?: string | null
          route_created_at?: string | null
          route_created_by?: string | null
          quotation_number?: string | null
          is_multi_product?: boolean | null
          items_count?: number | null
          budget_ceiling_total?: number | null
          contact_person?: string | null
          commission_percentage?: number | null
          commission_base_amount?: number | null
          commission_amount?: number | null
          commission_notes?: string | null
        }
        Update: {
          id?: string
          quotation_date?: string | null
          company_id?: string
          company_name?: string
          company_ruc?: string
          entity_id?: string
          entity_name?: string
          entity_ruc?: string
          delivery_location?: string
          status?: string | null
          valid_until?: string | null
          observations?: string | null
          created_by?: string
          created_at?: string | null
          updated_at?: string | null
          route_origin_address?: string | null
          route_destination_address?: string | null
          route_distance_km?: number | null
          route_duration_minutes?: number | null
          route_google_maps_url?: string | null
          route_created_at?: string | null
          route_created_by?: string | null
          quotation_number?: string | null
          is_multi_product?: boolean | null
          items_count?: number | null
          budget_ceiling_total?: number | null
          contact_person?: string | null
          commission_percentage?: number | null
          commission_base_amount?: number | null
          commission_amount?: number | null
          commission_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "sales_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_route_created_by_fkey"
            columns: ["route_created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_items: {
        Row: {
          id: string
          quotation_id: string
          product_id: string | null
          product_code: string
          product_name: string
          product_description: string | null
          product_brand: string | null
          quantity: number
          platform_unit_price_with_tax: number
          platform_total: number
          supplier_unit_price_with_tax: number | null
          supplier_total: number | null
          offer_unit_price_with_tax: number | null
          offer_total_with_tax: number | null
          final_unit_price_with_tax: number | null
          reference_image_url: string | null
          created_at: string | null
          updated_at: string | null
          budget_ceiling_unit_price_with_tax: number | null
          budget_ceiling_total: number | null
          item_commission_percentage: number | null
          item_commission_base_amount: number | null
          item_commission_amount: number | null
        }
        Insert: {
          id?: string
          quotation_id: string
          product_id?: string | null
          product_code: string
          product_name: string
          product_description?: string | null
          product_brand?: string | null
          quantity: number
          platform_unit_price_with_tax: number
          platform_total: number
          supplier_unit_price_with_tax?: number | null
          supplier_total?: number | null
          offer_unit_price_with_tax?: number | null
          offer_total_with_tax?: number | null
          final_unit_price_with_tax?: number | null
          reference_image_url?: string | null
          created_at?: string | null
          updated_at?: string | null
          budget_ceiling_unit_price_with_tax?: number | null
          budget_ceiling_total?: number | null
          item_commission_percentage?: number | null
          item_commission_base_amount?: number | null
          item_commission_amount?: number | null
        }
        Update: {
          id?: string
          quotation_id?: string
          product_id?: string | null
          product_code?: string
          product_name?: string
          product_description?: string | null
          product_brand?: string | null
          quantity?: number
          platform_unit_price_with_tax?: number
          platform_total?: number
          supplier_unit_price_with_tax?: number | null
          supplier_total?: number | null
          offer_unit_price_with_tax?: number | null
          offer_total_with_tax?: number | null
          final_unit_price_with_tax?: number | null
          reference_image_url?: string | null
          created_at?: string | null
          updated_at?: string | null
          budget_ceiling_unit_price_with_tax?: number | null
          budget_ceiling_total?: number | null
          item_commission_percentage?: number | null
          item_commission_base_amount?: number | null
          item_commission_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_validations: {
        Row: {
          id: string
          quotation_id: string
          validation_hash: string
          created_at: string | null
          expires_at: string | null
          is_active: boolean | null
          access_count: number | null
          last_accessed_at: string | null
        }
        Insert: {
          id?: string
          quotation_id: string
          validation_hash: string
          created_at?: string | null
          expires_at?: string | null
          is_active?: boolean | null
          access_count?: number | null
          last_accessed_at?: string | null
        }
        Update: {
          id?: string
          quotation_id?: string
          validation_hash?: string
          created_at?: string | null
          expires_at?: string | null
          is_active?: boolean | null
          access_count?: number | null
          last_accessed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotation_validations_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_product_categories: {
        Row: {
          color: string | null
          company_id: string | null
          created_at: string
          id: string // Changed to string (UUID)
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          company_id?: string | null
          created_at?: string
          id?: string // Changed to string (UUID)
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          company_id?: string | null
          created_at?: string
          id?: string // Changed to string (UUID)
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_product_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_products: {
        Row: {
          category_id: string // Changed to string (UUID)
          cost_price: number | null
          created_at: string
          current_stock: number
          description: string | null
          id: string
          is_active: boolean
          is_serialized: boolean
          location: string | null
          minimum_stock: number
          name: string
          qr_code_hash: string | null
          unit_of_measure: string
          updated_at: string
          company_id: string
          code: string
          created_by: string
          notes: string | null
        }
        Insert: {
          category_id: string // Changed to string (UUID)
          cost_price?: number | null
          created_at?: string
          current_stock?: number
          description?: string | null
          id?: string
          is_active?: boolean
          is_serialized?: boolean
          location?: string | null
          minimum_stock?: number
          name: string
          qr_code_hash?: string | null
          unit_of_measure: string
          updated_at?: string
          company_id: string
          code: string
          created_by: string
          notes?: string | null
        }
        Update: {
          category_id?: string // Changed to string (UUID)
          cost_price?: number | null
          created_at?: string
          current_stock?: number
          description?: string | null
          id?: string
          is_active?: boolean
          is_serialized?: boolean
          location?: string | null
          minimum_stock?: number
          name?: string
          qr_code_hash?: string | null
          unit_of_measure?: string
          updated_at?: string
          company_id?: string
          code?: string
          created_by?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "internal_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "internal_product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_products_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_product_serials: {
        // NEW TABLE
        Row: {
          id: string
          product_id: string
          serial_number: string
          status: string
          current_location: string | null
          company_id: string
          created_by: string
          created_at: string
          updated_at: string
          qr_code_hash: string | null
        }
        Insert: {
          id?: string
          product_id: string
          serial_number: string
          status?: string
          current_location?: string | null
          company_id: string
          created_by: string
          created_at?: string
          updated_at?: string
          qr_code_hash?: string | null
        }
        Update: {
          id?: string
          product_id?: string
          serial_number?: string
          status?: string
          current_location?: string | null
          company_id?: string
          created_by?: string
          created_at?: string
          updated_at?: string
          qr_code_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "internal_product_serials_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_product_serials_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_product_serials_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "internal_products"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          id: string
          user_id: string
          company_id: string | null
          title: string
          description: string | null
          event_date: string
          importance: string
          color: string | null
          is_completed: boolean
          notification_sent: boolean
          created_at: string
          updated_at: string
          category: string | null // Added category field
        }
        Insert: {
          id?: string
          user_id: string
          company_id?: string | null
          title: string
          description?: string | null
          event_date: string
          importance?: string
          color?: string | null
          is_completed?: boolean
          notification_sent?: boolean
          created_at?: string
          updated_at?: string
          category?: string | null // Added category field
        }
        Update: {
          id?: string
          user_id?: string
          company_id?: string | null
          title?: string
          description?: string | null
          event_date?: string
          importance?: string
          color?: string | null
          is_completed?: boolean
          notification_sent?: boolean
          created_at?: string
          updated_at?: string
          category?: string | null // Added category field
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_inventory_movements: {
        Row: {
          id: string
          product_id: string
          serial_id: string | null // Added serial_id
          movement_type: "entrada" | "salida" | "ajuste"
          quantity: number
          cost_price: number | null // Changed to allow null
          total_amount: number | null // Changed to allow null
          reason: string
          notes: string | null
          requested_by: string
          department_requesting: string | null
          supplier: string | null
          movement_date: string
          company_id: string
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          serial_id?: string | null // Added serial_id
          movement_type: "entrada" | "salida" | "ajuste"
          quantity: number
          cost_price?: number | null // Changed to allow null
          total_amount?: number | null // Changed to allow null
          reason: string
          notes?: string | null
          requested_by: string
          department_requesting?: string | null
          supplier?: string | null
          movement_date?: string
          company_id: string
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          serial_id?: string | null // Added serial_id
          movement_type?: "entrada" | "salida" | "ajuste"
          quantity?: number
          cost_price?: number | null // Changed to allow null
          total_amount?: number | null // Changed to allow null
          reason?: string
          notes?: string | null
          requested_by?: string
          department_requesting?: string | null
          supplier?: string | null
          movement_date?: string
          company_id?: string
          created_by?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_inventory_movements_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_inventory_movements_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_inventory_movements_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "internal_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_inventory_movements_serial_id_fkey"
            columns: ["serial_id"]
            referencedRelation: "internal_product_serials"
            referencedColumns: ["id"]
          },
        ]
      open_data_entries: {
        Row: {
          acuerdo_marco: string
          cantidad_entrega: number
          catalogo: string
          categoria: string
          codigo_acuerdo_marco: string
          created_at: string
          dep_entrega: string
          descripcion_ficha_producto: string | null
          direccion_entrega: string | null
          direccion_proveedor: string | null
          dist_entrega: string
          estado_orden_electronica: string
          fecha_aceptacion: string
          fecha_fin_entrega: string
          fecha_inicio_entrega: string
          fecha_publicacion: string
          id: string
          igv_entrega: number
          link_ficha_producto: string | null
          marca_ficha_producto: string | null
          monto_total_entrega: number
          nro_entrega: number
          nro_orden_fisica: string
          nro_parte: string | null
          orden_digitalizada: string | null
          orden_electronica: string
          plazo_entrega: number
          precio_unitario: number
          procedimiento: string
          prov_entrega: string
          razon_social_entidad: string
          razon_social_proveedor: string
          ruc_entidad: string
          ruc_proveedor: string
          sub_total: number
          tipo_compra: string
          total_entregas: number
          unidad_ejecutora: string
          updated_at: string
        }
        Insert: {
          acuerdo_marco: string
          cantidad_entrega: number
          catalogo: string
          categoria: string
          codigo_acuerdo_marco: string
          created_at?: string
          dep_entrega: string
          descripcion_ficha_producto?: string | null
          direccion_entrega?: string | null
          direccion_proveedor?: string | null
          dist_entrega: string
          estado_orden_electronica: string
          fecha_aceptacion: string
          fecha_fin_entrega: string
          fecha_inicio_entrega: string
          fecha_publicacion: string
          id?: string
          igv_entrega: number
          link_ficha_producto?: string | null
          marca_ficha_producto?: string | null
          monto_total_entrega: number
          nro_entrega: number
          nro_orden_fisica: string
          nro_parte?: string | null
          orden_digitalizada?: string | null
          orden_electronica: string
          plazo_entrega: number
          precio_unitario: number
          procedimiento: string
          prov_entrega: string
          razon_social_entidad: string
          razon_social_proveedor: string
          ruc_entidad: string
          ruc_proveedor: string
          sub_total: number
          tipo_compra: string
          total_entregas: number
          unidad_ejecutora: string
          updated_at?: string
        }
        Update: {
          acuerdo_marco?: string
          cantidad_entrega?: number
          catalogo?: string
          categoria?: string
          codigo_acuerdo_marco?: string
          created_at?: string
          dep_entrega?: string
          descripcion_ficha_producto?: string | null
          direccion_entrega?: string | null
          direccion_proveedor?: string | null
          dist_entrega?: string
          estado_orden_electronica?: string
          fecha_aceptacion?: string
          fecha_fin_entrega?: string
          fecha_inicio_entrega?: string
          fecha_publicacion?: string
          id?: string
          igv_entrega?: number
          link_ficha_producto?: string | null
          marca_ficha_producto?: string | null
          monto_total_entrega?: number
          nro_entrega?: number
          nro_orden_fisica?: string
          nro_parte?: string | null
          orden_digitalizada?: string | null
          orden_electronica?: string
          plazo_entrega?: number
          precio_unitario?: number
          procedimiento?: string
          prov_entrega?: string
          razon_social_entidad?: string
          razon_social_proveedor?: string
          ruc_entidad?: string
          ruc_proveedor?: string
          sub_total?: number
          tipo_compra?: string
          total_entregas?: number
          unidad_ejecutora?: string
          updated_at?: string
        }
        Relationships: []
      }
      }
    }
    Views: {
      open_data_view: {
        Row: {
          acuerdo_marco: string | null
          cantidad_entrega: number | null
          catalogo: string | null
          categoria: string | null
          codigo_acuerdo_marco: string | null
          created_at: string | null
          dep_entrega: string | null
          descripcion_ficha_producto: string | null
          direccion_entrega: string | null
          direccion_proveedor: string | null
          dist_entrega: string | null
          estado_orden_electronica: string | null
          fecha_aceptacion: string | null
          fecha_fin_entrega: string | null
          fecha_inicio_entrega: string | null
          fecha_publicacion: string | null
          id: string | null
          igv_entrega: number | null
          link_ficha_producto: string | null
          marca_ficha_producto: string | null
          monto_total_entrega: number | null
          nro_entrega: number | null
          nro_orden_fisica: string | null
          nro_parte: string | null
          orden_digitalizada: string | null
          orden_electronica: string | null
          plazo_entrega: number | null
          precio_unitario: number | null
          procedimiento: string | null
          prov_entrega: string | null
          razon_social_entidad: string | null
          razon_social_proveedor: string | null
          ruc_entidad: string | null
          ruc_proveedor: string | null
          sub_total: number | null
          tipo_compra: string | null
          total_entregas: number | null
          unidad_ejecutora: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      quotations_with_items: {
        Row: {
          id: string | null
          quotation_date: string | null
          company_id: string | null
          company_name: string | null
          company_ruc: string | null
          entity_id: string | null
          entity_name: string | null
          entity_ruc: string | null
          delivery_location: string | null
          status: string | null
          valid_until: string | null
          observations: string | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
          route_origin_address: string | null
          route_destination_address: string | null
          route_distance_km: number | null
          route_duration_minutes: number | null
          route_google_maps_url: string | null
          route_created_at: string | null
          route_created_by: string | null
          quotation_number: string | null
          is_multi_product: boolean | null
          items_count: number | null
          budget_ceiling_total: number | null
          contact_person: string | null
          commission_percentage: number | null
          commission_base_amount: number | null
          commission_amount: number | null
          commission_notes: string | null
          platform_total: number | null
          supplier_total: number | null
          offer_total: number | null
          final_total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "sales_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_route_created_by_fkey"
            columns: ["route_created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations_with_totals: {
        Row: {
          id: string | null
          quotation_number: string | null
          company_name: string | null
          entity_name: string | null
          status: string | null
          items_count: number | null
          total_platform_amount: number | null
          total_supplier_amount: number | null
          total_offer_amount: number | null
          total_final_amount: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      generate_document_number: {
        Args: {
          p_company_id: string
          p_user_id: string
        }
        Returns: string
      }
      generate_internal_product_code: {
        Args: Record<PropertyKey, never>
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] & PublicSchema["Views"]) | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    ? (PublicSchema["Tables"] & PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends keyof PublicSchema["Tables"] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends keyof PublicSchema["Tables"] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends keyof PublicSchema["Enums"] | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never
