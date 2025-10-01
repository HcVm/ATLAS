export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          attendance_date: string
          check_in_location: string | null
          check_in_time: string | null
          check_out_location: string | null
          check_out_time: string | null
          company_id: string
          created_at: string | null
          department_id: string | null
          id: string
          incomplete_notification_sent: boolean | null
          is_late: boolean | null
          late_minutes: number | null
          late_notification_sent: boolean | null
          lunch_end_time: string | null
          lunch_start_time: string | null
          notes: string | null
          updated_at: string | null
          user_id: string
          worked_hours: number | null
        }
        Insert: {
          attendance_date?: string
          check_in_location?: string | null
          check_in_time?: string | null
          check_out_location?: string | null
          check_out_time?: string | null
          company_id: string
          created_at?: string | null
          department_id?: string | null
          id?: string
          incomplete_notification_sent?: boolean | null
          is_late?: boolean | null
          late_minutes?: number | null
          late_notification_sent?: boolean | null
          lunch_end_time?: string | null
          lunch_start_time?: string | null
          notes?: string | null
          updated_at?: string | null
          user_id: string
          worked_hours?: number | null
        }
        Update: {
          attendance_date?: string
          check_in_location?: string | null
          check_in_time?: string | null
          check_out_location?: string | null
          check_out_time?: string | null
          company_id?: string
          created_at?: string | null
          department_id?: string | null
          id?: string
          incomplete_notification_sent?: boolean | null
          is_late?: boolean | null
          late_minutes?: number | null
          late_notification_sent?: boolean | null
          lunch_end_time?: string | null
          lunch_start_time?: string | null
          notes?: string | null
          updated_at?: string | null
          user_id?: string
          worked_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_alerts: {
        Row: {
          acuerdo_marco: string
          brand_name: string
          created_at: string
          estado_orden_electronica: string | null
          id: string
          notes: string | null
          orden_electronica: string
          razon_social_proveedor: string | null
          ruc_proveedor: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          acuerdo_marco: string
          brand_name: string
          created_at?: string
          estado_orden_electronica?: string | null
          id?: string
          notes?: string | null
          orden_electronica: string
          razon_social_proveedor?: string | null
          ruc_proveedor?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          acuerdo_marco?: string
          brand_name?: string
          created_at?: string
          estado_orden_electronica?: string | null
          id?: string
          notes?: string | null
          orden_electronica?: string
          razon_social_proveedor?: string | null
          ruc_proveedor?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      brands: {
        Row: {
          color: string | null
          company_id: string | null
          created_at: string | null
          description: string | null
          id: string
          logo_url: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brands_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      brands_count: {
        Row: {
          count: number | null
        }
        Insert: {
          count?: number | null
        }
        Update: {
          count?: number | null
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          category: string | null
          color: string | null
          company_id: string | null
          created_at: string
          description: string | null
          event_date: string
          id: string
          importance: string
          is_completed: boolean
          notification_sent: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          color?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          event_date: string
          id?: string
          importance?: string
          is_completed?: boolean
          notification_sent?: boolean
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          color?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          event_date?: string
          id?: string
          importance?: string
          is_completed?: boolean
          notification_sent?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "tech_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      categories_count: {
        Row: {
          count: number | null
        }
        Insert: {
          count?: number | null
        }
        Update: {
          count?: number | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          code: string
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          logo_url: string | null
          name: string
          ruc: string | null
          updated_at: string | null
        }
        Insert: {
          code: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          ruc?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          ruc?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      deliveries: {
        Row: {
          actual_delivery_date: string | null
          assigned_to: string | null
          created_at: string | null
          created_by: string
          delivery_address: string | null
          delivery_status: string
          estimated_delivery_date: string | null
          id: string
          notes: string | null
          sale_id: string
          tracking_number: string | null
          updated_at: string | null
        }
        Insert: {
          actual_delivery_date?: string | null
          assigned_to?: string | null
          created_at?: string | null
          created_by: string
          delivery_address?: string | null
          delivery_status?: string
          estimated_delivery_date?: string | null
          id?: string
          notes?: string | null
          sale_id: string
          tracking_number?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_delivery_date?: string | null
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string
          delivery_address?: string | null
          delivery_status?: string
          estimated_delivery_date?: string | null
          id?: string
          notes?: string | null
          sale_id?: string
          tracking_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "tech_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "tech_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales_with_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales_with_totals"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          abbreviation: string | null
          color: string | null
          company_id: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          abbreviation?: string | null
          color?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          abbreviation?: string | null
          color?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      destination_entities: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      document_attachments: {
        Row: {
          created_at: string | null
          document_id: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          movement_id: string | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string | null
          document_id?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          movement_id?: string | null
          uploaded_by: string
        }
        Update: {
          created_at?: string | null
          document_id?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          movement_id?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_attachments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "complete_download_stats"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "document_attachments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_attachments_movement_id_fkey"
            columns: ["movement_id"]
            isOneToOne: false
            referencedRelation: "document_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "tech_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      document_downloads: {
        Row: {
          anonymous_contact: string | null
          anonymous_name: string | null
          anonymous_organization: string | null
          anonymous_purpose: string | null
          attachment_id: string | null
          city: string | null
          country: string | null
          created_at: string | null
          document_id: string
          download_token: string | null
          download_type: string
          downloaded_at: string | null
          file_name: string | null
          file_size: number | null
          geolocation: Json | null
          id: string
          ip_address: unknown | null
          is_public_access: boolean | null
          referrer: string | null
          session_id: string | null
          terms_accepted: boolean | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          anonymous_contact?: string | null
          anonymous_name?: string | null
          anonymous_organization?: string | null
          anonymous_purpose?: string | null
          attachment_id?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          document_id: string
          download_token?: string | null
          download_type?: string
          downloaded_at?: string | null
          file_name?: string | null
          file_size?: number | null
          geolocation?: Json | null
          id?: string
          ip_address?: unknown | null
          is_public_access?: boolean | null
          referrer?: string | null
          session_id?: string | null
          terms_accepted?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          anonymous_contact?: string | null
          anonymous_name?: string | null
          anonymous_organization?: string | null
          anonymous_purpose?: string | null
          attachment_id?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          document_id?: string
          download_token?: string | null
          download_type?: string
          downloaded_at?: string | null
          file_name?: string | null
          file_size?: number | null
          geolocation?: Json | null
          id?: string
          ip_address?: unknown | null
          is_public_access?: boolean | null
          referrer?: string | null
          session_id?: string | null
          terms_accepted?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_downloads_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "document_attachments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_downloads_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "complete_download_stats"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "document_downloads_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_downloads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_downloads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_downloads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "tech_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      document_movements: {
        Row: {
          company_id: string | null
          created_at: string | null
          document_id: string | null
          from_department_id: string | null
          id: string
          moved_by: string
          notes: string | null
          to_department_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          document_id?: string | null
          from_department_id?: string | null
          id?: string
          moved_by: string
          notes?: string | null
          to_department_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          document_id?: string | null
          from_department_id?: string | null
          id?: string
          moved_by?: string
          notes?: string | null
          to_department_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_movements_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "complete_download_stats"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "document_movements_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_movements_from_department_id_fkey"
            columns: ["from_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_movements_moved_by_fkey"
            columns: ["moved_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_movements_moved_by_fkey"
            columns: ["moved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_movements_moved_by_fkey"
            columns: ["moved_by"]
            isOneToOne: false
            referencedRelation: "tech_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_movements_to_department_id_fkey"
            columns: ["to_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      document_number_sequences: {
        Row: {
          company_id: string
          department_id: string
          last_number: number
          year: number
        }
        Insert: {
          company_id: string
          department_id: string
          last_number?: number
          year: number
        }
        Update: {
          company_id?: string
          department_id?: string
          last_number?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_number_sequences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_number_sequences_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      document_sequences_detailed: {
        Row: {
          company_id: string | null
          created_at: string | null
          department_id: string | null
          id: string
          last_number: number | null
          updated_at: string | null
          user_id: string | null
          year: number
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          department_id?: string | null
          id?: string
          last_number?: number | null
          updated_at?: string | null
          user_id?: string | null
          year: number
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          department_id?: string | null
          id?: string
          last_number?: number | null
          updated_at?: string | null
          user_id?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_sequences_detailed_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_sequences_detailed_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_sequences_detailed_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_sequences_detailed_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_sequences_detailed_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "tech_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      document_verifications: {
        Row: {
          created_at: string | null
          document_id: string | null
          id: string
          location_data: Json | null
          verification_method: string | null
          verified_at: string | null
          verifier_ip: unknown | null
          verifier_user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          document_id?: string | null
          id?: string
          location_data?: Json | null
          verification_method?: string | null
          verified_at?: string | null
          verifier_ip?: unknown | null
          verifier_user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          document_id?: string | null
          id?: string
          location_data?: Json | null
          verification_method?: string | null
          verified_at?: string | null
          verifier_ip?: unknown | null
          verifier_user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_verifications_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "complete_download_stats"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "document_verifications_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          certificate_number: string | null
          certification_type: string | null
          company_id: string | null
          created_at: string | null
          created_by: string
          current_department_id: string
          description: string | null
          document_number: string
          expiry_date: string | null
          file_url: string | null
          id: string
          is_certified: boolean | null
          is_public: boolean | null
          issued_date: string | null
          issuer_name: string | null
          issuer_position: string | null
          qr_code: string | null
          status: Database["public"]["Enums"]["document_status"] | null
          title: string
          updated_at: string | null
          verification_enabled: boolean | null
          verification_hash: string | null
        }
        Insert: {
          certificate_number?: string | null
          certification_type?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by: string
          current_department_id: string
          description?: string | null
          document_number: string
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          is_certified?: boolean | null
          is_public?: boolean | null
          issued_date?: string | null
          issuer_name?: string | null
          issuer_position?: string | null
          qr_code?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
          title: string
          updated_at?: string | null
          verification_enabled?: boolean | null
          verification_hash?: string | null
        }
        Update: {
          certificate_number?: string | null
          certification_type?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string
          current_department_id?: string
          description?: string | null
          document_number?: string
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          is_certified?: boolean | null
          is_public?: boolean | null
          issued_date?: string | null
          issuer_name?: string | null
          issuer_position?: string | null
          qr_code?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
          title?: string
          updated_at?: string | null
          verification_enabled?: boolean | null
          verification_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "tech_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_current_department_id_fkey"
            columns: ["current_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_requests: {
        Row: {
          company_id: string
          created_at: string | null
          department_id: string | null
          end_date: string | null
          end_time: string | null
          equipment_details: Json | null
          expires_at: string
          id: string
          incident_date: string
          incident_time: string | null
          priority: string | null
          reason: string
          request_type: Database["public"]["Enums"]["request_type"]
          review_comments: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["request_status"] | null
          supporting_documents: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          department_id?: string | null
          end_date?: string | null
          end_time?: string | null
          equipment_details?: Json | null
          expires_at: string
          id?: string
          incident_date: string
          incident_time?: string | null
          priority?: string | null
          reason: string
          request_type: Database["public"]["Enums"]["request_type"]
          review_comments?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["request_status"] | null
          supporting_documents?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          department_id?: string | null
          end_date?: string | null
          end_time?: string | null
          equipment_details?: Json | null
          expires_at?: string
          id?: string
          incident_date?: string
          incident_time?: string | null
          priority?: string | null
          reason?: string
          request_type?: Database["public"]["Enums"]["request_type"]
          review_comments?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["request_status"] | null
          supporting_documents?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_requests_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "tech_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "tech_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_assignments: {
        Row: {
          actual_return_date: string | null
          assigned_at: string | null
          assigned_by: string
          assigned_quantity: number
          assigned_to: string
          condition_notes: string | null
          equipment_id: string
          expected_return_date: string | null
          id: string
          request_id: string
          status: string | null
        }
        Insert: {
          actual_return_date?: string | null
          assigned_at?: string | null
          assigned_by: string
          assigned_quantity: number
          assigned_to: string
          condition_notes?: string | null
          equipment_id: string
          expected_return_date?: string | null
          id?: string
          request_id: string
          status?: string | null
        }
        Update: {
          actual_return_date?: string | null
          assigned_at?: string | null
          assigned_by?: string
          assigned_quantity?: number
          assigned_to?: string
          condition_notes?: string | null
          equipment_id?: string
          expected_return_date?: string | null
          id?: string
          request_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "tech_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_assignments_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_assignments_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_assignments_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "tech_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_assignments_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "available_equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_assignments_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_assignments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "employee_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_assignments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_inventory: {
        Row: {
          available_quantity: number | null
          company_id: string
          created_at: string | null
          department_id: string | null
          equipment_name: string
          equipment_type: string
          id: string
          is_active: boolean | null
          specifications: Json | null
          supplier: string | null
          total_quantity: number | null
          unit_cost: number | null
          updated_at: string | null
        }
        Insert: {
          available_quantity?: number | null
          company_id: string
          created_at?: string | null
          department_id?: string | null
          equipment_name: string
          equipment_type: string
          id?: string
          is_active?: boolean | null
          specifications?: Json | null
          supplier?: string | null
          total_quantity?: number | null
          unit_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          available_quantity?: number | null
          company_id?: string
          created_at?: string | null
          department_id?: string | null
          equipment_name?: string
          equipment_type?: string
          id?: string
          is_active?: boolean | null
          specifications?: Json | null
          supplier?: string | null
          total_quantity?: number | null
          unit_cost?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_inventory_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_inventory_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_inventory_movements: {
        Row: {
          company_id: string | null
          cost_price: number | null
          created_at: string | null
          created_by: string | null
          department_requesting: string | null
          id: string
          movement_date: string
          movement_type: string
          notes: string | null
          product_id: string | null
          quantity: number
          reason: string | null
          requested_by: string | null
          serial_id: string | null
          supplier: string | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          created_by?: string | null
          department_requesting?: string | null
          id?: string
          movement_date?: string
          movement_type: string
          notes?: string | null
          product_id?: string | null
          quantity: number
          reason?: string | null
          requested_by?: string | null
          serial_id?: string | null
          supplier?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          created_by?: string | null
          department_requesting?: string | null
          id?: string
          movement_date?: string
          movement_type?: string
          notes?: string | null
          product_id?: string | null
          quantity?: number
          reason?: string | null
          requested_by?: string | null
          serial_id?: string | null
          supplier?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "internal_inventory_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_inventory_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_inventory_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_inventory_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "tech_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "internal_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_inventory_movements_serial_id_fkey"
            columns: ["serial_id"]
            isOneToOne: false
            referencedRelation: "internal_product_serials"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_product_categories: {
        Row: {
          color: string | null
          company_id: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
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
      internal_product_serials: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          current_location: string | null
          id: string
          product_id: string
          qr_code_hash: string | null
          serial_number: string
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          current_location?: string | null
          id?: string
          product_id: string
          qr_code_hash?: string | null
          serial_number: string
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          current_location?: string | null
          id?: string
          product_id?: string
          qr_code_hash?: string | null
          serial_number?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_product_serials_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_product_serials_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_product_serials_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_product_serials_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "tech_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_product_serials_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "internal_products"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_products: {
        Row: {
          barcode: string | null
          category_id: string | null
          code: string
          company_id: string | null
          cost_price: number | null
          created_at: string | null
          created_by: string | null
          current_stock: number | null
          description: string | null
          id: string
          is_active: boolean | null
          is_serialized: boolean
          location: string | null
          minimum_stock: number | null
          name: string
          notes: string | null
          qr_code_hash: string | null
          unit_of_measure: string | null
          updated_at: string | null
        }
        Insert: {
          barcode?: string | null
          category_id?: string | null
          code: string
          company_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          created_by?: string | null
          current_stock?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_serialized?: boolean
          location?: string | null
          minimum_stock?: number | null
          name: string
          notes?: string | null
          qr_code_hash?: string | null
          unit_of_measure?: string | null
          updated_at?: string | null
        }
        Update: {
          barcode?: string | null
          category_id?: string | null
          code?: string
          company_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          created_by?: string | null
          current_stock?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_serialized?: boolean
          location?: string | null
          minimum_stock?: number | null
          name?: string
          notes?: string | null
          qr_code_hash?: string | null
          unit_of_measure?: string | null
          updated_at?: string | null
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
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "tech_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movement_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          movement_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          movement_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          movement_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movement_attachments_movement_id_fkey"
            columns: ["movement_id"]
            isOneToOne: false
            referencedRelation: "inventory_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movement_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movement_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movement_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "tech_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          destination: string | null
          destination_address: string | null
          destination_department_id: string | null
          destination_entity_name: string | null
          entry_price: number | null
          exit_price: number | null
          id: string
          movement_date: string | null
          movement_type: string
          notes: string | null
          product_id: string | null
          purchase_order_number: string | null
          quantity: number
          reason: string | null
          reference_document: string | null
          sale_price: number | null
          supplier: string | null
          total_amount: number | null
          total_cost: number | null
          unit_cost: number | null
          unit_price: number | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          destination?: string | null
          destination_address?: string | null
          destination_department_id?: string | null
          destination_entity_name?: string | null
          entry_price?: number | null
          exit_price?: number | null
          id?: string
          movement_date?: string | null
          movement_type: string
          notes?: string | null
          product_id?: string | null
          purchase_order_number?: string | null
          quantity: number
          reason?: string | null
          reference_document?: string | null
          sale_price?: number | null
          supplier?: string | null
          total_amount?: number | null
          total_cost?: number | null
          unit_cost?: number | null
          unit_price?: number | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          destination?: string | null
          destination_address?: string | null
          destination_department_id?: string | null
          destination_entity_name?: string | null
          entry_price?: number | null
          exit_price?: number | null
          id?: string
          movement_date?: string | null
          movement_type?: string
          notes?: string | null
          product_id?: string | null
          purchase_order_number?: string | null
          quantity?: number
          reason?: string | null
          reference_document?: string | null
          sale_price?: number | null
          supplier?: string | null
          total_amount?: number | null
          total_cost?: number | null
          unit_cost?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_destination_department"
            columns: ["destination_department_id"]
            isOneToOne: false
            referencedRelation: "peru_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "tech_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_low_stock"
            referencedColumns: ["id"]
          },
        ]
      }
      movements_count: {
        Row: {
          count: number | null
        }
        Insert: {
          count?: number | null
        }
        Update: {
          count?: number | null
        }
        Relationships: []
      }
      news: {
        Row: {
          company_id: string | null
          content: string
          created_at: string | null
          created_by: string
          id: string
          image_url: string | null
          published: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          content: string
          created_at?: string | null
          created_by: string
          id?: string
          image_url?: string | null
          published?: boolean | null
          title: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          content?: string
          created_at?: string | null
          created_by?: string
          id?: string
          image_url?: string | null
          published?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "news_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "tech_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          message: string
          read: boolean | null
          related_id: string | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          message: string
          read?: boolean | null
          related_id?: string | null
          title: string
          type?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          related_id?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
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
      payment_vouchers: {
        Row: {
          accounting_confirmed: boolean
          accounting_confirmed_at: string | null
          accounting_confirmed_by: string | null
          admin_confirmed: boolean
          admin_confirmed_at: string | null
          admin_confirmed_by: string | null
          company_id: string
          created_at: string | null
          file_name: string
          file_size: number
          file_url: string
          id: string
          notes: string | null
          sale_id: string
          status: string
          updated_at: string | null
          uploaded_at: string | null
          uploaded_by: string
        }
        Insert: {
          accounting_confirmed?: boolean
          accounting_confirmed_at?: string | null
          accounting_confirmed_by?: string | null
          admin_confirmed?: boolean
          admin_confirmed_at?: string | null
          admin_confirmed_by?: string | null
          company_id: string
          created_at?: string | null
          file_name: string
          file_size: number
          file_url: string
          id?: string
          notes?: string | null
          sale_id: string
          status?: string
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by: string
        }
        Update: {
          accounting_confirmed?: boolean
          accounting_confirmed_at?: string | null
          accounting_confirmed_by?: string | null
          admin_confirmed?: boolean
          admin_confirmed_at?: string | null
          admin_confirmed_by?: string | null
          company_id?: string
          created_at?: string | null
          file_name?: string
          file_size?: number
          file_url?: string
          id?: string
          notes?: string | null
          sale_id?: string
          status?: string
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_vouchers_accounting_confirmed_by_fkey"
            columns: ["accounting_confirmed_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_vouchers_accounting_confirmed_by_fkey"
            columns: ["accounting_confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_vouchers_accounting_confirmed_by_fkey"
            columns: ["accounting_confirmed_by"]
            isOneToOne: false
            referencedRelation: "tech_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_vouchers_admin_confirmed_by_fkey"
            columns: ["admin_confirmed_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_vouchers_admin_confirmed_by_fkey"
            columns: ["admin_confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_vouchers_admin_confirmed_by_fkey"
            columns: ["admin_confirmed_by"]
            isOneToOne: false
            referencedRelation: "tech_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_vouchers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_vouchers_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_vouchers_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales_with_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_vouchers_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales_with_totals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_vouchers_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_vouchers_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_vouchers_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "tech_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      peru_departments: {
        Row: {
          code: string
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          color: string | null
          company_id: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      product_lots: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          delivery_date: string | null
          generated_date: string | null
          id: string
          ingress_date: string | null
          lot_number: string
          product_code: string
          product_id: string | null
          product_name: string
          quantity: number
          sale_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          delivery_date?: string | null
          generated_date?: string | null
          id?: string
          ingress_date?: string | null
          lot_number: string
          product_code: string
          product_id?: string | null
          product_name: string
          quantity: number
          sale_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          delivery_date?: string | null
          generated_date?: string | null
          id?: string
          ingress_date?: string | null
          lot_number?: string
          product_code?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          sale_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_lots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_lots_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_lots_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_lots_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "tech_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_lots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_lots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_low_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_lots_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_lots_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales_with_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_lots_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales_with_totals"
            referencedColumns: ["id"]
          },
        ]
      }
      product_serials: {
        Row: {
          barcode_data: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          lot_id: string | null
          product_code: string
          product_id: string | null
          product_name: string
          sale_id: string | null
          serial_number: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          barcode_data?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          lot_id?: string | null
          product_code: string
          product_id?: string | null
          product_name: string
          sale_id?: string | null
          serial_number: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          barcode_data?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          lot_id?: string | null
          product_code?: string
          product_id?: string | null
          product_name?: string
          sale_id?: string | null
          serial_number?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_serials_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_serials_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_serials_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_serials_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "tech_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_serials_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "product_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_serials_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_serials_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_low_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_serials_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_serials_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales_with_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_serials_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales_with_totals"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          brand_id: string | null
          category_id: string | null
          code: string
          company_id: string | null
          cost_price: number | null
          created_at: string | null
          created_by: string | null
          current_stock: number | null
          description: string | null
          ficha_tecnica: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          location: string | null
          minimum_stock: number | null
          modelo: string | null
          name: string
          notes: string | null
          sale_price: number | null
          unit_of_measure: string | null
          updated_at: string | null
        }
        Insert: {
          barcode?: string | null
          brand_id?: string | null
          category_id?: string | null
          code: string
          company_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          created_by?: string | null
          current_stock?: number | null
          description?: string | null
          ficha_tecnica?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          location?: string | null
          minimum_stock?: number | null
          modelo?: string | null
          name: string
          notes?: string | null
          sale_price?: number | null
          unit_of_measure?: string | null
          updated_at?: string | null
        }
        Update: {
          barcode?: string | null
          brand_id?: string | null
          category_id?: string | null
          code?: string
          company_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          created_by?: string | null
          current_stock?: number | null
          description?: string | null
          ficha_tecnica?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          location?: string | null
          minimum_stock?: number | null
          modelo?: string | null
          name?: string
          notes?: string | null
          sale_price?: number | null
          unit_of_measure?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "tech_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      products_count: {
        Row: {
          count: number | null
        }
        Insert: {
          count?: number | null
        }
        Update: {
          count?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string | null
          current_department_id: string | null
          department_id: string | null
          email: string
          full_name: string
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          current_department_id?: string | null
          department_id?: string | null
          email: string
          full_name: string
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          current_department_id?: string | null
          department_id?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_current_department_id_fkey"
            columns: ["current_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_items: {
        Row: {
          budget_ceiling_total: number | null
          budget_ceiling_unit_price_with_tax: number | null
          created_at: string | null
          final_unit_price_with_tax: number | null
          id: string
          item_commission_amount: number | null
          item_commission_base_amount: number | null
          item_commission_percentage: number | null
          offer_total_with_tax: number | null
          offer_unit_price_with_tax: number | null
          platform_total: number
          platform_unit_price_with_tax: number
          product_brand: string | null
          product_code: string
          product_description: string | null
          product_id: string | null
          product_name: string
          quantity: number
          quotation_id: string
          reference_image_url: string | null
          supplier_total: number | null
          supplier_unit_price_with_tax: number | null
          updated_at: string | null
        }
        Insert: {
          budget_ceiling_total?: number | null
          budget_ceiling_unit_price_with_tax?: number | null
          created_at?: string | null
          final_unit_price_with_tax?: number | null
          id?: string
          item_commission_amount?: number | null
          item_commission_base_amount?: number | null
          item_commission_percentage?: number | null
          offer_total_with_tax?: number | null
          offer_unit_price_with_tax?: number | null
          platform_total: number
          platform_unit_price_with_tax: number
          product_brand?: string | null
          product_code: string
          product_description?: string | null
          product_id?: string | null
          product_name: string
          quantity: number
          quotation_id: string
          reference_image_url?: string | null
          supplier_total?: number | null
          supplier_unit_price_with_tax?: number | null
          updated_at?: string | null
        }
        Update: {
          budget_ceiling_total?: number | null
          budget_ceiling_unit_price_with_tax?: number | null
          created_at?: string | null
          final_unit_price_with_tax?: number | null
          id?: string
          item_commission_amount?: number | null
          item_commission_base_amount?: number | null
          item_commission_percentage?: number | null
          offer_total_with_tax?: number | null
          offer_unit_price_with_tax?: number | null
          platform_total?: number
          platform_unit_price_with_tax?: number
          product_brand?: string | null
          product_code?: string
          product_description?: string | null
          product_id?: string | null
          product_name?: string
          quantity?: number
          quotation_id?: string
          reference_image_url?: string | null
          supplier_total?: number | null
          supplier_unit_price_with_tax?: number | null
          updated_at?: string | null
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
            foreignKeyName: "quotation_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_low_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations_with_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations_with_totals"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_validations: {
        Row: {
          client_name: string
          client_ruc: string
          company_name: string
          company_ruc: string
          created_at: string | null
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          last_validated_at: string | null
          quotation_date: string
          quotation_number: string
          total_amount: number
          validated_count: number | null
          validation_hash: string
        }
        Insert: {
          client_name: string
          client_ruc: string
          company_name: string
          company_ruc: string
          created_at?: string | null
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_validated_at?: string | null
          quotation_date: string
          quotation_number: string
          total_amount: number
          validated_count?: number | null
          validation_hash: string
        }
        Update: {
          client_name?: string
          client_ruc?: string
          company_name?: string
          company_ruc?: string
          created_at?: string | null
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_validated_at?: string | null
          quotation_date?: string
          quotation_number?: string
          total_amount?: number
          validated_count?: number | null
          validation_hash?: string
        }
        Relationships: []
      }
      quotations: {
        Row: {
          budget_ceiling_total: number | null
          commission_amount: number | null
          commission_base_amount: number | null
          commission_notes: string | null
          commission_percentage: number | null
          company_id: string
          company_name: string
          company_ruc: string
          contact_person: string | null
          created_at: string | null
          created_by: string
          delivery_location: string
          entity_id: string
          entity_name: string
          entity_ruc: string
          id: string
          is_multi_product: boolean | null
          items_count: number | null
          observations: string | null
          quotation_date: string | null
          quotation_number: string | null
          route_created_at: string | null
          route_created_by: string | null
          route_destination_address: string | null
          route_distance_km: number | null
          route_duration_minutes: number | null
          route_google_maps_url: string | null
          route_origin_address: string | null
          status: string | null
          updated_at: string | null
          valid_until: string | null
        }
        Insert: {
          budget_ceiling_total?: number | null
          commission_amount?: number | null
          commission_base_amount?: number | null
          commission_notes?: string | null
          commission_percentage?: number | null
          company_id: string
          company_name: string
          company_ruc: string
          contact_person?: string | null
          created_at?: string | null
          created_by: string
          delivery_location: string
          entity_id: string
          entity_name: string
          entity_ruc: string
          id?: string
          is_multi_product?: boolean | null
          items_count?: number | null
          observations?: string | null
          quotation_date?: string | null
          quotation_number?: string | null
          route_created_at?: string | null
          route_created_by?: string | null
          route_destination_address?: string | null
          route_distance_km?: number | null
          route_duration_minutes?: number | null
          route_google_maps_url?: string | null
          route_origin_address?: string | null
          status?: string | null
          updated_at?: string | null
          valid_until?: string | null
        }
        Update: {
          budget_ceiling_total?: number | null
          commission_amount?: number | null
          commission_base_amount?: number | null
          commission_notes?: string | null
          commission_percentage?: number | null
          company_id?: string
          company_name?: string
          company_ruc?: string
          contact_person?: string | null
          created_at?: string | null
          created_by?: string
          delivery_location?: string
          entity_id?: string
          entity_name?: string
          entity_ruc?: string
          id?: string
          is_multi_product?: boolean | null
          items_count?: number | null
          observations?: string | null
          quotation_date?: string | null
          quotation_number?: string | null
          route_created_at?: string | null
          route_created_by?: string | null
          route_destination_address?: string | null
          route_distance_km?: number | null
          route_duration_minutes?: number | null
          route_google_maps_url?: string | null
          route_origin_address?: string | null
          status?: string | null
          updated_at?: string | null
          valid_until?: string | null
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
            referencedRelation: "admin_users"
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
            foreignKeyName: "quotations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "tech_users_view"
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
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_route_created_by_fkey"
            columns: ["route_created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_route_created_by_fkey"
            columns: ["route_created_by"]
            isOneToOne: false
            referencedRelation: "tech_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      request_approvers: {
        Row: {
          approver_user_id: string
          company_id: string
          created_at: string | null
          department_id: string | null
          id: string
          is_active: boolean | null
          request_types: Database["public"]["Enums"]["request_type"][]
          updated_at: string | null
        }
        Insert: {
          approver_user_id: string
          company_id: string
          created_at?: string | null
          department_id?: string | null
          id?: string
          is_active?: boolean | null
          request_types: Database["public"]["Enums"]["request_type"][]
          updated_at?: string | null
        }
        Update: {
          approver_user_id?: string
          company_id?: string
          created_at?: string | null
          department_id?: string | null
          id?: string
          is_active?: boolean | null
          request_types?: Database["public"]["Enums"]["request_type"][]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "request_approvers_approver_user_id_fkey"
            columns: ["approver_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_approvers_approver_user_id_fkey"
            columns: ["approver_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_approvers_approver_user_id_fkey"
            columns: ["approver_user_id"]
            isOneToOne: false
            referencedRelation: "tech_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_approvers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_approvers_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          created_at: string | null
          id: string
          product_brand: string | null
          product_code: string
          product_description: string | null
          product_id: string | null
          product_name: string
          quantity: number
          sale_id: string
          total_amount: number
          unit_price_with_tax: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_brand?: string | null
          product_code: string
          product_description?: string | null
          product_id?: string | null
          product_name: string
          quantity: number
          sale_id: string
          total_amount: number
          unit_price_with_tax: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          product_brand?: string | null
          product_code?: string
          product_description?: string | null
          product_id?: string | null
          product_name?: string
          quantity?: number
          sale_id?: string
          total_amount?: number
          unit_price_with_tax?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_low_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales_with_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales_with_totals"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          company_id: string
          company_name: string
          company_ruc: string
          created_at: string | null
          created_by: string
          delivery_end_date: string | null
          delivery_start_date: string | null
          entity_executing_unit: string | null
          entity_id: string
          entity_name: string
          entity_ruc: string
          exp_siaf: string | null
          final_destination: string | null
          id: string
          is_multi_product: boolean | null
          items_count: number | null
          observations: string | null
          ocam: string | null
          payment_method: string
          physical_order: string | null
          product_brand: string | null
          product_code: string | null
          product_description: string | null
          product_id: string | null
          product_name: string | null
          project_meta: string | null
          quantity: number | null
          quotation_code: string
          quotation_id: string | null
          sale_date: string | null
          sale_number: string | null
          sale_status: string | null
          total_sale: number
          unit_price_with_tax: number | null
          updated_at: string | null
          warehouse_manager: string | null
        }
        Insert: {
          company_id: string
          company_name: string
          company_ruc: string
          created_at?: string | null
          created_by: string
          delivery_end_date?: string | null
          delivery_start_date?: string | null
          entity_executing_unit?: string | null
          entity_id: string
          entity_name: string
          entity_ruc: string
          exp_siaf?: string | null
          final_destination?: string | null
          id?: string
          is_multi_product?: boolean | null
          items_count?: number | null
          observations?: string | null
          ocam?: string | null
          payment_method: string
          physical_order?: string | null
          product_brand?: string | null
          product_code?: string | null
          product_description?: string | null
          product_id?: string | null
          product_name?: string | null
          project_meta?: string | null
          quantity?: number | null
          quotation_code: string
          quotation_id?: string | null
          sale_date?: string | null
          sale_number?: string | null
          sale_status?: string | null
          total_sale: number
          unit_price_with_tax?: number | null
          updated_at?: string | null
          warehouse_manager?: string | null
        }
        Update: {
          company_id?: string
          company_name?: string
          company_ruc?: string
          created_at?: string | null
          created_by?: string
          delivery_end_date?: string | null
          delivery_start_date?: string | null
          entity_executing_unit?: string | null
          entity_id?: string
          entity_name?: string
          entity_ruc?: string
          exp_siaf?: string | null
          final_destination?: string | null
          id?: string
          is_multi_product?: boolean | null
          items_count?: number | null
          observations?: string | null
          ocam?: string | null
          payment_method?: string
          physical_order?: string | null
          product_brand?: string | null
          product_code?: string | null
          product_description?: string | null
          product_id?: string | null
          product_name?: string | null
          project_meta?: string | null
          quantity?: number | null
          quotation_code?: string
          quotation_id?: string | null
          sale_date?: string | null
          sale_number?: string | null
          sale_status?: string | null
          total_sale?: number
          unit_price_with_tax?: number | null
          updated_at?: string | null
          warehouse_manager?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "tech_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "sales_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_low_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations_with_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations_with_totals"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_entities: {
        Row: {
          client_type: string | null
          company_id: string
          contact_person: string | null
          created_at: string | null
          email: string | null
          executing_unit: string | null
          fiscal_address: string | null
          id: string
          name: string
          ruc: string
          updated_at: string | null
        }
        Insert: {
          client_type?: string | null
          company_id: string
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          executing_unit?: string | null
          fiscal_address?: string | null
          id?: string
          name: string
          ruc: string
          updated_at?: string | null
        }
        Update: {
          client_type?: string | null
          company_id?: string
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          executing_unit?: string | null
          fiscal_address?: string | null
          id?: string
          name?: string
          ruc?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_entities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      support_attachments: {
        Row: {
          comment_id: string | null
          created_at: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          ticket_id: string
          uploaded_by: string
        }
        Insert: {
          comment_id?: string | null
          created_at?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          ticket_id: string
          uploaded_by: string
        }
        Update: {
          comment_id?: string | null
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          ticket_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_attachments_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "support_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "tech_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      support_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_internal: boolean | null
          ticket_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          ticket_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "tech_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string
          closed_at: string | null
          company_id: string
          created_at: string | null
          created_by: string
          description: string
          id: string
          priority: string
          resolved_at: string | null
          status: string
          ticket_number: string
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          closed_at?: string | null
          company_id: string
          created_at?: string | null
          created_by: string
          description: string
          id?: string
          priority?: string
          resolved_at?: string | null
          status?: string
          ticket_number: string
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string
          closed_at?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string
          description?: string
          id?: string
          priority?: string
          resolved_at?: string | null
          status?: string
          ticket_number?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "tech_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "tech_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      suspicious_download_attempts: {
        Row: {
          attempted_at: string | null
          blocked: boolean | null
          document_id: string | null
          id: string
          ip_address: unknown | null
          reason: string | null
          user_agent: string | null
        }
        Insert: {
          attempted_at?: string | null
          blocked?: boolean | null
          document_id?: string | null
          id?: string
          ip_address?: unknown | null
          reason?: string | null
          user_agent?: string | null
        }
        Update: {
          attempted_at?: string | null
          blocked?: boolean | null
          document_id?: string | null
          id?: string
          ip_address?: unknown | null
          reason?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suspicious_download_attempts_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "complete_download_stats"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "suspicious_download_attempts_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      task_boards: {
        Row: {
          board_date: string
          closed_at: string | null
          company_id: string | null
          created_at: string | null
          description: string | null
          id: string
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          board_date: string
          closed_at?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          board_date?: string
          closed_at?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_boards_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_boards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_boards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_boards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "tech_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          comment: string
          created_at: string | null
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string | null
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string | null
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_history: {
        Row: {
          changed_at: string | null
          changed_by: string
          id: string
          new_status: string
          notes: string | null
          previous_status: string | null
          task_id: string
        }
        Insert: {
          changed_at?: string | null
          changed_by: string
          id?: string
          new_status: string
          notes?: string | null
          previous_status?: string | null
          task_id: string
        }
        Update: {
          changed_at?: string | null
          changed_by?: string
          id?: string
          new_status?: string
          notes?: string | null
          previous_status?: string | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_history_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          actual_time: number | null
          assigned_by: string | null
          board_id: string
          completed_at: string | null
          created_at: string | null
          created_by: string
          description: string | null
          due_time: string | null
          estimated_time: number | null
          id: string
          migrated_at: string | null
          migrated_from_board: string | null
          migrated_from_date: string | null
          migrated_to_board: string | null
          migrated_to_date: string | null
          position: number | null
          priority: string | null
          status: string | null
          title: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          actual_time?: number | null
          assigned_by?: string | null
          board_id: string
          completed_at?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          due_time?: string | null
          estimated_time?: number | null
          id?: string
          migrated_at?: string | null
          migrated_from_board?: string | null
          migrated_from_date?: string | null
          migrated_to_board?: string | null
          migrated_to_date?: string | null
          position?: number | null
          priority?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          actual_time?: number | null
          assigned_by?: string | null
          board_id?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          due_time?: string | null
          estimated_time?: number | null
          id?: string
          migrated_at?: string | null
          migrated_from_board?: string | null
          migrated_from_date?: string | null
          migrated_to_board?: string | null
          migrated_to_date?: string | null
          position?: number | null
          priority?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "task_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_migrated_from_board_fkey"
            columns: ["migrated_from_board"]
            isOneToOne: false
            referencedRelation: "task_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_migrated_to_board_fkey"
            columns: ["migrated_to_board"]
            isOneToOne: false
            referencedRelation: "task_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          appearance_dark_mode: boolean | null
          appearance_language: string | null
          created_at: string | null
          id: string
          notifications_document_updates: boolean | null
          notifications_email: boolean | null
          notifications_push: boolean | null
          notifications_system_alerts: boolean | null
          privacy_activity_tracking: boolean | null
          privacy_profile_visibility: string | null
          security_session_timeout: number | null
          security_two_factor: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          appearance_dark_mode?: boolean | null
          appearance_language?: string | null
          created_at?: string | null
          id?: string
          notifications_document_updates?: boolean | null
          notifications_email?: boolean | null
          notifications_push?: boolean | null
          notifications_system_alerts?: boolean | null
          privacy_activity_tracking?: boolean | null
          privacy_profile_visibility?: string | null
          security_session_timeout?: number | null
          security_two_factor?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          appearance_dark_mode?: boolean | null
          appearance_language?: string | null
          created_at?: string | null
          id?: string
          notifications_document_updates?: boolean | null
          notifications_email?: boolean | null
          notifications_push?: boolean | null
          notifications_system_alerts?: boolean | null
          privacy_activity_tracking?: boolean | null
          privacy_profile_visibility?: string | null
          security_session_timeout?: number | null
          security_two_factor?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "tech_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      work_schedules: {
        Row: {
          allow_early_checkin: boolean | null
          allow_late_checkout: boolean | null
          company_id: string
          created_at: string | null
          created_by: string | null
          department_id: string | null
          id: string
          late_threshold_time: string | null
          require_location: boolean | null
          updated_at: string | null
          work_days: Json | null
          work_end_time: string | null
          work_start_time: string | null
        }
        Insert: {
          allow_early_checkin?: boolean | null
          allow_late_checkout?: boolean | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          id?: string
          late_threshold_time?: string | null
          require_location?: boolean | null
          updated_at?: string | null
          work_days?: Json | null
          work_end_time?: string | null
          work_start_time?: string | null
        }
        Update: {
          allow_early_checkin?: boolean | null
          allow_late_checkout?: boolean | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          id?: string
          late_threshold_time?: string | null
          require_location?: boolean | null
          updated_at?: string | null
          work_days?: Json | null
          work_end_time?: string | null
          work_start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_schedules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_schedules_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_users: {
        Row: {
          id: string | null
        }
        Relationships: []
      }
      anonymous_download_summary: {
        Row: {
          document_id: string | null
          last_download: string | null
          organizations_list: string[] | null
          total_anonymous_downloads: number | null
          unique_ips: number | null
          unique_organizations: number | null
        }
        Relationships: [
          {
            foreignKeyName: "document_downloads_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "complete_download_stats"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "document_downloads_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_stats: {
        Row: {
          avg_hours_month: number | null
          company_id: string | null
          company_name: string | null
          days_late_month: number | null
          days_late_week: number | null
          days_present_month: number | null
          days_present_week: number | null
          department_id: string | null
          department_name: string | null
          email: string | null
          full_name: string | null
          last_attendance_date: string | null
          last_check_in: string | null
          last_check_out: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      available_equipment: {
        Row: {
          available_quantity: number | null
          company_id: string | null
          company_name: string | null
          created_at: string | null
          currently_assigned: number | null
          department_id: string | null
          department_name: string | null
          equipment_name: string | null
          equipment_type: string | null
          id: string | null
          is_active: boolean | null
          is_available: boolean | null
          specifications: Json | null
          supplier: string | null
          total_quantity: number | null
          unit_cost: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_inventory_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_inventory_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      complete_download_stats: {
        Row: {
          anonymous_downloads: number | null
          document_id: string | null
          document_title: string | null
          last_download_date: string | null
          registered_users: number | null
          total_downloads: number | null
          unique_organizations: number | null
        }
        Relationships: []
      }
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
        Insert: {
          acuerdo_marco?: string | null
          cantidad_entrega?: number | null
          catalogo?: string | null
          categoria?: string | null
          codigo_acuerdo_marco?: string | null
          created_at?: string | null
          dep_entrega?: string | null
          descripcion_ficha_producto?: string | null
          direccion_entrega?: string | null
          direccion_proveedor?: string | null
          dist_entrega?: string | null
          estado_orden_electronica?: string | null
          fecha_aceptacion?: string | null
          fecha_fin_entrega?: string | null
          fecha_inicio_entrega?: string | null
          fecha_publicacion?: string | null
          id?: string | null
          igv_entrega?: number | null
          link_ficha_producto?: string | null
          marca_ficha_producto?: string | null
          monto_total_entrega?: number | null
          nro_entrega?: number | null
          nro_orden_fisica?: string | null
          nro_parte?: string | null
          orden_digitalizada?: string | null
          orden_electronica?: string | null
          plazo_entrega?: number | null
          precio_unitario?: number | null
          procedimiento?: string | null
          prov_entrega?: string | null
          razon_social_entidad?: string | null
          razon_social_proveedor?: string | null
          ruc_entidad?: string | null
          ruc_proveedor?: string | null
          sub_total?: number | null
          tipo_compra?: string | null
          total_entregas?: number | null
          unidad_ejecutora?: string | null
          updated_at?: string | null
        }
        Update: {
          acuerdo_marco?: string | null
          cantidad_entrega?: number | null
          catalogo?: string | null
          categoria?: string | null
          codigo_acuerdo_marco?: string | null
          created_at?: string | null
          dep_entrega?: string | null
          descripcion_ficha_producto?: string | null
          direccion_entrega?: string | null
          direccion_proveedor?: string | null
          dist_entrega?: string | null
          estado_orden_electronica?: string | null
          fecha_aceptacion?: string | null
          fecha_fin_entrega?: string | null
          fecha_inicio_entrega?: string | null
          fecha_publicacion?: string | null
          id?: string | null
          igv_entrega?: number | null
          link_ficha_producto?: string | null
          marca_ficha_producto?: string | null
          monto_total_entrega?: number | null
          nro_entrega?: number | null
          nro_orden_fisica?: string | null
          nro_parte?: string | null
          orden_digitalizada?: string | null
          orden_electronica?: string | null
          plazo_entrega?: number | null
          precio_unitario?: number | null
          procedimiento?: string | null
          prov_entrega?: string | null
          razon_social_entidad?: string | null
          razon_social_proveedor?: string | null
          ruc_entidad?: string | null
          ruc_proveedor?: string | null
          sub_total?: number | null
          tipo_compra?: string | null
          total_entregas?: number | null
          unidad_ejecutora?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      products_low_stock: {
        Row: {
          barcode: string | null
          brand_id: string | null
          category_id: string | null
          code: string | null
          company_id: string | null
          cost_price: number | null
          created_at: string | null
          created_by: string | null
          current_stock: number | null
          description: string | null
          id: string | null
          is_active: boolean | null
          location: string | null
          minimum_stock: number | null
          name: string | null
          notes: string | null
          sale_price: number | null
          stock_status: string | null
          unit_of_measure: string | null
          updated_at: string | null
        }
        Insert: {
          barcode?: string | null
          brand_id?: string | null
          category_id?: string | null
          code?: string | null
          company_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          created_by?: string | null
          current_stock?: number | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          location?: string | null
          minimum_stock?: number | null
          name?: string | null
          notes?: string | null
          sale_price?: number | null
          stock_status?: never
          unit_of_measure?: string | null
          updated_at?: string | null
        }
        Update: {
          barcode?: string | null
          brand_id?: string | null
          category_id?: string | null
          code?: string | null
          company_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          created_by?: string | null
          current_stock?: number | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          location?: string | null
          minimum_stock?: number | null
          name?: string | null
          notes?: string | null
          sale_price?: number | null
          stock_status?: never
          unit_of_measure?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "tech_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations_with_items: {
        Row: {
          budget_ceiling_total: number | null
          commission_amount: number | null
          commission_base_amount: number | null
          commission_notes: string | null
          commission_percentage: number | null
          company_id: string | null
          company_name: string | null
          company_ruc: string | null
          contact_person: string | null
          created_at: string | null
          created_by: string | null
          delivery_location: string | null
          entity_id: string | null
          entity_name: string | null
          entity_ruc: string | null
          final_total: number | null
          id: string | null
          is_multi_product: boolean | null
          items_count: number | null
          observations: string | null
          offer_total: number | null
          platform_total: number | null
          quotation_date: string | null
          quotation_number: string | null
          route_created_at: string | null
          route_created_by: string | null
          route_destination_address: string | null
          route_distance_km: number | null
          route_duration_minutes: number | null
          route_google_maps_url: string | null
          route_origin_address: string | null
          status: string | null
          supplier_total: number | null
          updated_at: string | null
          valid_until: string | null
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
            referencedRelation: "admin_users"
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
            foreignKeyName: "quotations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "tech_users_view"
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
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_route_created_by_fkey"
            columns: ["route_created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_route_created_by_fkey"
            columns: ["route_created_by"]
            isOneToOne: false
            referencedRelation: "tech_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations_with_totals: {
        Row: {
          company_name: string | null
          entity_name: string | null
          id: string | null
          items_count: number | null
          quotation_number: string | null
          status: string | null
          total_final_amount: number | null
          total_offer_amount: number | null
          total_platform_amount: number | null
          total_supplier_amount: number | null
        }
        Relationships: []
      }
      requests_with_details: {
        Row: {
          company_id: string | null
          company_name: string | null
          created_at: string | null
          department_id: string | null
          department_name: string | null
          end_date: string | null
          end_time: string | null
          equipment_details: Json | null
          expires_at: string | null
          id: string | null
          incident_date: string | null
          incident_time: string | null
          is_expired: boolean | null
          permission_days: number | null
          permission_validation: string | null
          priority: string | null
          reason: string | null
          request_type: Database["public"]["Enums"]["request_type"] | null
          requester_email: string | null
          requester_name: string | null
          review_comments: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_name: string | null
          status: Database["public"]["Enums"]["request_status"] | null
          supporting_documents: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_requests_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "tech_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "tech_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_with_items: {
        Row: {
          company_id: string | null
          company_name: string | null
          company_ruc: string | null
          created_at: string | null
          created_by: string | null
          delivery_end_date: string | null
          delivery_start_date: string | null
          display_product_code: string | null
          display_product_name: string | null
          entity_executing_unit: string | null
          entity_id: string | null
          entity_name: string | null
          entity_ruc: string | null
          exp_siaf: string | null
          final_destination: string | null
          id: string | null
          is_multi_product: boolean | null
          observations: string | null
          ocam: string | null
          payment_method: string | null
          physical_order: string | null
          project_meta: string | null
          quotation_code: string | null
          quotation_id: string | null
          sale_date: string | null
          sale_number: string | null
          sale_status: string | null
          total_items: number | null
          total_quantity: number | null
          total_sale: number | null
          updated_at: string | null
          warehouse_manager: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "tech_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "sales_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations_with_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations_with_totals"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_with_totals: {
        Row: {
          company_id: string | null
          company_name: string | null
          company_ruc: string | null
          created_at: string | null
          created_by: string | null
          delivery_end_date: string | null
          delivery_start_date: string | null
          entity_executing_unit: string | null
          entity_id: string | null
          entity_name: string | null
          entity_ruc: string | null
          exp_siaf: string | null
          final_destination: string | null
          id: string | null
          is_multi_product: boolean | null
          items_count: number | null
          observations: string | null
          ocam: string | null
          payment_method: string | null
          physical_order: string | null
          product_brand: string | null
          product_code: string | null
          product_description: string | null
          product_id: string | null
          product_name: string | null
          project_meta: string | null
          quantity: number | null
          quotation_code: string | null
          quotation_id: string | null
          sale_date: string | null
          sale_number: string | null
          sale_status: string | null
          total_amount: number | null
          total_quantity: number | null
          total_sale: number | null
          unit_price_with_tax: number | null
          updated_at: string | null
          warehouse_manager: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_low_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "tech_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "sales_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations_with_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations_with_totals"
            referencedColumns: ["id"]
          },
        ]
      }
      tech_users_view: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          department_id: string | null
          department_name: string | null
          email: string | null
          full_name: string | null
          id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_external_brand: {
        Args: {
          brand_color?: string
          brand_description?: string
          brand_name: string
        }
        Returns: string
      }
      admin_create_user_complete: {
        Args: {
          p_email: string
          p_full_name: string
          p_password: string
          p_role?: Database["public"]["Enums"]["user_role"]
        }
        Returns: string
      }
      admin_create_user_simple: {
        Args:
          | {
              p_email: string
              p_first_name?: string
              p_last_name?: string
              p_password: string
              p_role?: string
            }
          | {
              p_email: string
              p_name: string
              p_password: string
              p_role?: string
            }
        Returns: string
      }
      can_manage_tickets: {
        Args: { company_uuid: string; user_uuid: string }
        Returns: boolean
      }
      check_is_admin: {
        Args: { user_id?: string }
        Returns: boolean
      }
      close_daily_boards: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_entity_if_not_exists: {
        Args:
          | { company_uuid: string; entity_name: string }
          | { entity_name: string }
        Returns: string
      }
      debug_product_search: {
        Args: { product_code: string }
        Returns: {
          found_products: number
          product_details: Json
          user_company_id: string
        }[]
      }
      extract_year_from_timestamp_immutable: {
        Args: { ts_val: string }
        Returns: number
      }
      extract_year_immutable: {
        Args: { date_val: string }
        Returns: number
      }
      fix_brand_alerts_constraint: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_automatic_document_number: {
        Args: {
          p_company_id: string
          p_department_id: string
          p_user_id: string
        }
        Returns: string
      }
      generate_document_number: {
        Args:
          | { p_company_id: string; p_department_id: string; p_user_id: string }
          | { p_company_id: string; p_user_id: string }
        Returns: string
      }
      generate_internal_product_code: {
        Args: Record<PropertyKey, never> | { company_uuid: string }
        Returns: string
      }
      generate_lot_number: {
        Args: { p_date?: string; p_product_code: string }
        Returns: string
      }
      generate_quotation_number: {
        Args: { company_uuid: string }
        Returns: string
      }
      generate_sale_number: {
        Args: { company_uuid: string }
        Returns: string
      }
      generate_serial_number: {
        Args: { p_lot_number: string; p_sequence: number }
        Returns: string
      }
      generate_session_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_ticket_number: {
        Args: { p_company_id: string }
        Returns: string
      }
      generate_verification_hash: {
        Args: { doc_id: string }
        Returns: string
      }
      get_all_company_users: {
        Args: { target_company_id: string }
        Returns: Json
      }
      get_available_brands: {
        Args: { company_uuid: string }
        Returns: {
          color: string
          description: string
          id: string
          is_external: boolean
          name: string
        }[]
      }
      get_brands_for_company: {
        Args: { company_uuid: string }
        Returns: {
          color: string
          created_at: string
          description: string
          id: string
          is_external: boolean
          name: string
        }[]
      }
      get_column_type: {
        Args: { p_column_name: string; p_table_name: string }
        Returns: string
      }
      get_entity_suggestions: {
        Args: Record<PropertyKey, never> | { company_uuid: string }
        Returns: {
          entity_name: string
        }[]
      }
      get_initials_from_name: {
        Args: { p_name: string }
        Returns: string
      }
      get_product_image_url: {
        Args: { image_path: string }
        Returns: string
      }
      get_quotation_products_summary: {
        Args: { quotation_uuid: string }
        Returns: string
      }
      get_quotation_with_items: {
        Args: { quotation_uuid: string }
        Returns: Json
      }
      get_quotations_by_company: {
        Args: { target_company_id: string }
        Returns: {
          budget_ceiling: number
          company_id: string
          created_at: string
          created_by: string
          delivery_location: string
          entity_name: string
          entity_ruc: string
          final_unit_price_with_tax: number
          id: string
          offer_total_with_tax: number
          offer_unit_price_with_tax: number
          platform_total: number
          platform_unit_price_with_tax: number
          product_brand: string
          product_description: string
          profiles: Json
          quantity: number
          quotation_date: string
          quotation_number: string
          reference_image_url: string
          route_created_at: string
          route_created_by: string
          route_destination_address: string
          route_distance_km: number
          route_duration_minutes: number
          route_google_maps_url: string
          route_origin_address: string
          status: string
          supplier_total: number
          supplier_unit_price_with_tax: number
          unique_code: string
          updated_at: string
          valid_until: string
        }[]
      }
      get_quotations_stats: {
        Args: { company_uuid: string }
        Returns: {
          approved_quotations: number
          average_quotation: number
          draft_quotations: number
          sent_quotations: number
          total_quotations: number
          total_quoted_amount: number
        }[]
      }
      get_role_type: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_sale_products_summary: {
        Args: { sale_uuid: string }
        Returns: string
      }
      get_sale_with_items: {
        Args: { sale_uuid: string }
        Returns: Json
      }
      get_sales_by_company: {
        Args: { target_company_id: string }
        Returns: {
          created_at: string
          delivery_date: string
          delivery_term: string
          entity_executing_unit: string
          entity_id: string
          entity_name: string
          entity_ruc: string
          exp_siaf: string
          final_destination: string
          id: string
          observations: string
          ocam: string
          payment_method: string
          physical_order: string
          product_brand: string
          product_code: string
          product_description: string
          product_id: string
          product_name: string
          profiles: Json
          project_meta: string
          quantity: number
          quotation_code: string
          sale_date: string
          sale_number: string
          sale_status: string
          total_sale: number
          unit_price_with_tax: number
          warehouse_manager: string
        }[]
      }
      get_sales_stats: {
        Args: { company_uuid: string }
        Returns: {
          average_ticket: number
          pending_deliveries: number
          total_amount: number
          total_sales: number
        }[]
      }
      get_support_tickets_for_user: {
        Args: { user_id: string }
        Returns: {
          assigned_avatar: string
          assigned_name: string
          assigned_to: string
          can_manage: boolean
          category: string
          closed_at: string
          company_id: string
          created_at: string
          created_by: string
          creator_avatar: string
          creator_name: string
          description: string
          id: string
          priority: string
          resolved_at: string
          status: string
          ticket_number: string
          title: string
          updated_at: string
        }[]
      }
      get_tech_users_simple: {
        Args: { company_uuid: string }
        Returns: Json
      }
      get_user_company: {
        Args: { user_id?: string }
        Returns: string
      }
      get_user_initials: {
        Args: { full_name: string }
        Returns: string
      }
      has_warehouse_access: {
        Args: { target_company_id: string; user_id: string }
        Returns: boolean
      }
      is_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      is_admin_safe: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_profile_owner: {
        Args: { profile_id: string }
        Returns: boolean
      }
      is_ticket_closed: {
        Args: { ticket_uuid: string }
        Returns: boolean
      }
      mark_expired_requests: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      migrate_pending_tasks: {
        Args: Record<PropertyKey, never>
        Returns: {
          affected_users: string[]
          created_boards: number
          migrated_tasks: number
        }[]
      }
      register_user: {
        Args: {
          p_department_id?: string
          p_email: string
          p_full_name: string
          p_password: string
        }
        Returns: Json
      }
      search_product_by_unique_code: {
        Args: { company_uuid: string; search_code: string }
        Returns: {
          brand: string
          code: string
          current_stock: number
          description: string
          id: string
          image_url: string
          name: string
          sale_price: number
        }[]
      }
      search_products_for_sales: {
        Args: { company_uuid: string; search_term: string }
        Returns: {
          brand: string
          code: string
          description: string
          id: string
          name: string
          price: number
          stock: number
        }[]
      }
      update_support_ticket: {
        Args: {
          new_assigned_to?: string
          new_status: string
          ticket_uuid: string
          user_uuid?: string
        }
        Returns: boolean
      }
    }
    Enums: {
      document_status: "pending" | "in_progress" | "completed" | "cancelled"
      request_status:
        | "pending"
        | "in_progress"
        | "approved"
        | "rejected"
        | "expired"
      request_type:
        | "late_justification"
        | "absence_justification"
        | "overtime_request"
        | "permission_request"
        | "equipment_request"
        | "general_request"
      user_role: "admin" | "supervisor" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      document_status: ["pending", "in_progress", "completed", "cancelled"],
      request_status: [
        "pending",
        "in_progress",
        "approved",
        "rejected",
        "expired",
      ],
      request_type: [
        "late_justification",
        "absence_justification",
        "overtime_request",
        "permission_request",
        "equipment_request",
        "general_request",
      ],
      user_role: ["admin", "supervisor", "user"],
    },
  },
} as const
