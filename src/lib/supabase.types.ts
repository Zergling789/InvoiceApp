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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      account_deletion_requests: {
        Row: {
          cancellation_reason: string | null
          completed_at: string | null
          created_at: string
          failure_code: string | null
          id: string
          policy_version: string | null
          processing_started_at: string | null
          requested_at: string
          scheduled_for: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cancellation_reason?: string | null
          completed_at?: string | null
          created_at?: string
          failure_code?: string | null
          id?: string
          policy_version?: string | null
          processing_started_at?: string | null
          requested_at?: string
          scheduled_for?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cancellation_reason?: string | null
          completed_at?: string | null
          created_at?: string
          failure_code?: string | null
          id?: string
          policy_version?: string | null
          processing_started_at?: string | null
          requested_at?: string
          scheduled_for?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      legal_acceptances: {
        Row: {
          accepted_at: string
          created_at: string
          document_sha256: string
          document_type: string
          document_version: string
          id: string
          ip_hash: string | null
          request_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string
          created_at?: string
          document_sha256: string
          document_type: string
          document_version: string
          id?: string
          ip_hash?: string | null
          request_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string
          created_at?: string
          document_sha256?: string
          document_type?: string
          document_version?: string
          id?: string
          ip_hash?: string | null
          request_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      billing_customers: {
        Row: { created_at: string; stripe_customer_id: string; updated_at: string; user_id: string }
        Insert: { created_at?: string; stripe_customer_id: string; updated_at?: string; user_id: string }
        Update: { created_at?: string; stripe_customer_id?: string; updated_at?: string; user_id?: string }
        Relationships: []
      }
      billing_subscriptions: {
        Row: { cancel_at_period_end: boolean; created_at: string; current_period_end: string | null; last_event_created_at: string | null; payment_failed_at: string | null; plan_key: string; status: string; stripe_customer_id: string; stripe_price_id: string | null; stripe_subscription_id: string | null; updated_at: string; user_id: string }
        Insert: { cancel_at_period_end?: boolean; created_at?: string; current_period_end?: string | null; last_event_created_at?: string | null; payment_failed_at?: string | null; plan_key?: string; status?: string; stripe_customer_id: string; stripe_price_id?: string | null; stripe_subscription_id?: string | null; updated_at?: string; user_id: string }
        Update: { cancel_at_period_end?: boolean; created_at?: string; current_period_end?: string | null; last_event_created_at?: string | null; payment_failed_at?: string | null; plan_key?: string; status?: string; stripe_customer_id?: string; stripe_price_id?: string | null; stripe_subscription_id?: string | null; updated_at?: string; user_id?: string }
        Relationships: []
      }
      billing_usage: {
        Row: { metric: string; period_end: string; period_start: string; quantity: number; updated_at: string; user_id: string }
        Insert: { metric: string; period_end: string; period_start: string; quantity?: number; updated_at?: string; user_id: string }
        Update: { metric?: string; period_end?: string; period_start?: string; quantity?: number; updated_at?: string; user_id?: string }
        Relationships: []
      }
      stripe_webhook_events: {
        Row: { attempts: number; event_created_at: string | null; event_id: string; event_type: string; last_error_code: string | null; processed_at: string | null; received_at: string; status: string; updated_at: string }
        Insert: { attempts?: number; event_created_at?: string | null; event_id: string; event_type: string; last_error_code?: string | null; processed_at?: string | null; received_at?: string; status?: string; updated_at?: string }
        Update: { attempts?: number; event_created_at?: string | null; event_id?: string; event_type?: string; last_error_code?: string | null; processed_at?: string | null; received_at?: string; status?: string; updated_at?: string }
        Relationships: []
      }
      document_recipient_links: {
        Row: { created_at: string; document_id: string; document_type: string; document_updated_at: string; expires_at: string; id: string; responded_at: string | null; response: string | null; response_reason: string | null; revoked_at: string | null; token_hash: string; user_id: string }
        Insert: { created_at?: string; document_id: string; document_type: string; document_updated_at: string; expires_at: string; id?: string; responded_at?: string | null; response?: string | null; response_reason?: string | null; revoked_at?: string | null; token_hash: string; user_id: string }
        Update: { created_at?: string; document_id?: string; document_type?: string; document_updated_at?: string; expires_at?: string; id?: string; responded_at?: string | null; response?: string | null; response_reason?: string | null; revoked_at?: string | null; token_hash?: string; user_id?: string }
        Relationships: []
      }
      audit_events: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          meta: Json
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          meta?: Json
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          meta?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      einvoice_exports: {
        Row: {
          content_hash: string | null
          created_at: string
          format: string
          generated_at: string | null
          id: string
          invoice_id: string
          profile: string
          status: string
          user_id: string
          validation_result: Json
          version: string
        }
        Insert: {
          content_hash?: string | null
          created_at?: string
          format: string
          generated_at?: string | null
          id?: string
          invoice_id: string
          profile: string
          status: string
          user_id: string
          validation_result?: Json
          version: string
        }
        Update: {
          content_hash?: string | null
          created_at?: string
          format?: string
          generated_at?: string | null
          id?: string
          invoice_id?: string
          profile?: string
          status?: string
          user_id?: string
          validation_result?: Json
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "einvoice_exports_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          address_addition: string | null
          billing_address: string | null
          city: string | null
          company_name: string | null
          contact_person: string | null
          country: string | null
          created_at: string
          currency: string | null
          customer_number: string | null
          default_vat_rate: number | null
          department: string | null
          email: string | null
          first_name: string | null
          house_number: string | null
          id: string
          industry: string | null
          invoice_email: string | null
          job_title: string | null
          last_contact_at: string | null
          last_name: string | null
          legal_form: string | null
          mobile: string | null
          next_follow_up_at: string | null
          notes: string | null
          payment_terms_days: number | null
          phone: string | null
          postal_code: string | null
          preferred_delivery_method: string | null
          preferred_language: string | null
          registration_number: string | null
          source: string | null
          state: string | null
          street: string | null
          tags: string[]
          tax_number: string | null
          updated_at: string
          user_id: string
          vat_id: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          address_addition?: string | null
          billing_address?: string | null
          city?: string | null
          company_name?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          customer_number?: string | null
          default_vat_rate?: number | null
          department?: string | null
          email?: string | null
          first_name?: string | null
          house_number?: string | null
          id?: string
          industry?: string | null
          invoice_email?: string | null
          job_title?: string | null
          last_contact_at?: string | null
          last_name?: string | null
          legal_form?: string | null
          mobile?: string | null
          next_follow_up_at?: string | null
          notes?: string | null
          payment_terms_days?: number | null
          phone?: string | null
          postal_code?: string | null
          preferred_delivery_method?: string | null
          preferred_language?: string | null
          registration_number?: string | null
          source?: string | null
          state?: string | null
          street?: string | null
          tags?: string[]
          tax_number?: string | null
          updated_at?: string
          user_id: string
          vat_id?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          address_addition?: string | null
          billing_address?: string | null
          city?: string | null
          company_name?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          customer_number?: string | null
          default_vat_rate?: number | null
          department?: string | null
          email?: string | null
          first_name?: string | null
          house_number?: string | null
          id?: string
          industry?: string | null
          invoice_email?: string | null
          job_title?: string | null
          last_contact_at?: string | null
          last_name?: string | null
          legal_form?: string | null
          mobile?: string | null
          next_follow_up_at?: string | null
          notes?: string | null
          payment_terms_days?: number | null
          phone?: string | null
          postal_code?: string | null
          preferred_delivery_method?: string | null
          preferred_language?: string | null
          registration_number?: string | null
          source?: string | null
          state?: string | null
          street?: string | null
          tags?: string[]
          tax_number?: string | null
          updated_at?: string
          user_id?: string
          vat_id?: string | null
          website?: string | null
        }
        Relationships: []
      }
      document_activity: {
        Row: {
          created_at: string
          doc_id: string
          doc_type: string
          event_type: string
          id: string
          meta: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          doc_id: string
          doc_type: string
          event_type: string
          id?: string
          meta?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          doc_id?: string
          doc_type?: string
          event_type?: string
          id?: string
          meta?: Json
          user_id?: string
        }
        Relationships: []
      }
      document_counters: {
        Row: {
          counter: number
          doc_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          counter?: number
          doc_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          counter?: number
          doc_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          branding_snapshot: Json | null
          buyer_reference: string | null
          canceled_at: string | null
          client_address: string | null
          client_street: string | null
          client_house_number: string | null
          client_postal_code: string | null
          client_city: string | null
          client_electronic_address: string | null
          client_electronic_address_scheme: string | null
          client_company_name: string | null
          client_contact_person: string | null
          client_email: string | null
          client_id: string
          client_name: string
          client_phone: string | null
          client_vat_id: string | null
          created_at: string
          date: string
          due_date: string
          finalized_at: string | null
          footer_text: string
          id: string
          intro_text: string
          invoice_date: string
          invoice_number: string | null
          is_locked: boolean
          is_small_business: boolean
          issued_at: string | null
          last_sent_at: string | null
          last_sent_to: string | null
          number: string | null
          offer_id: string | null
          paid_at: string | null
          payment_date: string | null
          payment_terms_days: number
          positions: Json
          project_id: string | null
          sent_at: string | null
          sent_count: number
          sent_via: string | null
          service_date: string | null
          service_period_end: string | null
          service_period_start: string | null
          seller_country: string
          customer_country: string
          customer_type: string
          service_country: string
          currency: string
          small_business_note: string | null
          status: string
          updated_at: string
          user_id: string
          vat_rate: number
        }
        Insert: {
          branding_snapshot?: Json | null
          buyer_reference?: string | null
          canceled_at?: string | null
          client_address?: string | null
          client_street?: string | null
          client_house_number?: string | null
          client_postal_code?: string | null
          client_city?: string | null
          client_electronic_address?: string | null
          client_electronic_address_scheme?: string | null
          client_company_name?: string | null
          client_contact_person?: string | null
          client_email?: string | null
          client_id: string
          client_name?: string
          client_phone?: string | null
          client_vat_id?: string | null
          created_at?: string
          date?: string
          due_date: string
          finalized_at?: string | null
          footer_text?: string
          id?: string
          intro_text?: string
          invoice_date?: string
          invoice_number?: string | null
          is_locked?: boolean
          is_small_business?: boolean
          issued_at?: string | null
          last_sent_at?: string | null
          last_sent_to?: string | null
          number?: string | null
          offer_id?: string | null
          paid_at?: string | null
          payment_date?: string | null
          payment_terms_days?: number
          positions?: Json
          project_id?: string | null
          sent_at?: string | null
          sent_count?: number
          sent_via?: string | null
          service_date?: string | null
          service_period_end?: string | null
          service_period_start?: string | null
          seller_country?: string
          customer_country?: string
          customer_type?: string
          service_country?: string
          currency?: string
          small_business_note?: string | null
          status?: string
          updated_at?: string
          user_id: string
          vat_rate?: number
        }
        Update: {
          branding_snapshot?: Json | null
          buyer_reference?: string | null
          canceled_at?: string | null
          client_address?: string | null
          client_street?: string | null
          client_house_number?: string | null
          client_postal_code?: string | null
          client_city?: string | null
          client_electronic_address?: string | null
          client_electronic_address_scheme?: string | null
          client_company_name?: string | null
          client_contact_person?: string | null
          client_email?: string | null
          client_id?: string
          client_name?: string
          client_phone?: string | null
          client_vat_id?: string | null
          created_at?: string
          date?: string
          due_date?: string
          finalized_at?: string | null
          footer_text?: string
          id?: string
          intro_text?: string
          invoice_date?: string
          invoice_number?: string | null
          is_locked?: boolean
          is_small_business?: boolean
          issued_at?: string | null
          last_sent_at?: string | null
          last_sent_to?: string | null
          number?: string | null
          offer_id?: string | null
          paid_at?: string | null
          payment_date?: string | null
          payment_terms_days?: number
          positions?: Json
          project_id?: string | null
          sent_at?: string | null
          sent_count?: number
          sent_via?: string | null
          service_date?: string | null
          service_period_end?: string | null
          service_period_start?: string | null
          seller_country?: string
          customer_country?: string
          customer_type?: string
          service_country?: string
          currency?: string
          small_business_note?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          client_id: string
          created_at: string
          currency: string
          date: string
          footer_text: string
          id: string
          intro_text: string
          invoice_id: string | null
          last_sent_at: string | null
          last_sent_to: string | null
          number: string
          positions: Json
          project_id: string | null
          rejection_reason: string | null
          sent_at: string | null
          sent_count: number
          sent_via: string | null
          status: string
          updated_at: string
          user_id: string
          valid_until: string | null
          vat_rate: number
        }
        Insert: {
          client_id: string
          created_at?: string
          currency?: string
          date?: string
          footer_text?: string
          id?: string
          intro_text?: string
          invoice_id?: string | null
          last_sent_at?: string | null
          last_sent_to?: string | null
          number?: string
          positions?: Json
          project_id?: string | null
          rejection_reason?: string | null
          sent_at?: string | null
          sent_count?: number
          sent_via?: string | null
          status?: string
          updated_at?: string
          user_id: string
          valid_until?: string | null
          vat_rate?: number
        }
        Update: {
          client_id?: string
          created_at?: string
          currency?: string
          date?: string
          footer_text?: string
          id?: string
          intro_text?: string
          invoice_id?: string | null
          last_sent_at?: string | null
          last_sent_to?: string | null
          number?: string
          positions?: Json
          project_id?: string | null
          rejection_reason?: string | null
          sent_at?: string | null
          sent_count?: number
          sent_via?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          valid_until?: string | null
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "offers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_name: string
          created_at: string
          first_name: string
          id: string
          last_name: string
        }
        Insert: {
          company_name: string
          created_at?: string
          first_name: string
          id: string
          last_name: string
        }
        Update: {
          company_name?: string
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
        }
        Relationships: []
      }
      position_templates: {
        Row: { id: string; user_id: string; kind: string; name: string; description: string; category: string; unit: string; default_quantity: number | null; default_unit_price: number | null; tax_category: string; tax_rate: number; product_number: string | null; manufacturer: string | null; image_url: string | null; usage_count: number; last_used_at: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; user_id: string; kind?: string; name: string; description?: string; category?: string; unit?: string; default_quantity?: number | null; default_unit_price?: number | null; tax_category?: string; tax_rate?: number; product_number?: string | null; manufacturer?: string | null; image_url?: string | null; usage_count?: number; last_used_at?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; user_id?: string; kind?: string; name?: string; description?: string; category?: string; unit?: string; default_quantity?: number | null; default_unit_price?: number | null; tax_category?: string; tax_rate?: number; product_number?: string | null; manufacturer?: string | null; image_url?: string | null; usage_count?: number; last_used_at?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      position_groups: {
        Row: { id: string; user_id: string; name: string; description: string; category: string; created_at: string; updated_at: string }
        Insert: { id?: string; user_id: string; name: string; description?: string; category?: string; created_at?: string; updated_at?: string }
        Update: { id?: string; user_id?: string; name?: string; description?: string; category?: string; created_at?: string; updated_at?: string }
        Relationships: []
      }
      position_group_items: {
        Row: { id: string; user_id: string; position_group_id: string; position_template_id: string | null; title: string; description: string; quantity: number; unit: string; unit_price: number | null; tax_category: string; tax_rate: number; sort_order: number; optional: boolean; created_at: string; updated_at: string }
        Insert: { id?: string; user_id: string; position_group_id: string; position_template_id?: string | null; title: string; description?: string; quantity?: number; unit?: string; unit_price?: number | null; tax_category?: string; tax_rate?: number; sort_order?: number; optional?: boolean; created_at?: string; updated_at?: string }
        Update: { id?: string; user_id?: string; position_group_id?: string; position_template_id?: string | null; title?: string; description?: string; quantity?: number; unit?: string; unit_price?: number | null; tax_category?: string; tax_rate?: number; sort_order?: number; optional?: boolean; created_at?: string; updated_at?: string }
        Relationships: [{ foreignKeyName: "position_group_items_position_group_id_fkey"; columns: ["position_group_id"]; isOneToOne: false; referencedRelation: "position_groups"; referencedColumns: ["id"] }, { foreignKeyName: "position_group_items_position_template_id_fkey"; columns: ["position_template_id"]; isOneToOne: false; referencedRelation: "position_templates"; referencedColumns: ["id"] }]
      }
      position_suggestion_events: {
        Row: { id: string; user_id: string; customer_id: string | null; document_type: string; query: string; suggestion_type: string; suggestion_id: string | null; action: string; original_value: Json | null; final_value: Json | null; created_at: string }
        Insert: { id?: string; user_id: string; customer_id?: string | null; document_type: string; query?: string; suggestion_type: string; suggestion_id?: string | null; action: string; original_value?: Json | null; final_value?: Json | null; created_at?: string }
        Update: { id?: string; user_id?: string; customer_id?: string | null; document_type?: string; query?: string; suggestion_type?: string; suggestion_id?: string | null; action?: string; original_value?: Json | null; final_value?: Json | null; created_at?: string }
        Relationships: [{ foreignKeyName: "position_suggestion_events_customer_id_fkey"; columns: ["customer_id"]; isOneToOne: false; referencedRelation: "clients"; referencedColumns: ["id"] }]
      }
      projects: {
        Row: {
          budget_total: number | null
          budget_type: string
          client_id: string
          created_at: string
          hourly_rate: number | null
          id: string
          name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          budget_total?: number | null
          budget_type: string
          client_id: string
          created_at?: string
          hourly_rate?: number | null
          id?: string
          name: string
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          budget_total?: number | null
          budget_type?: string
          client_id?: string
          created_at?: string
          hourly_rate?: number | null
          id?: string
          name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      sender_identities: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          id: string
          last_used_at: string | null
          last_verification_sent_at: string | null
          status: string
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          last_used_at?: string | null
          last_verification_sent_at?: string | null
          status: string
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          last_used_at?: string | null
          last_verification_sent_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      sender_identity_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          request_ip: unknown
          sender_identity_id: string
          token_hash: string
          used_at: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          request_ip?: unknown
          sender_identity_id: string
          token_hash: string
          used_at?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          request_ip?: unknown
          sender_identity_id?: string
          token_hash?: string
          used_at?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sender_identity_tokens_sender_identity_id_fkey"
            columns: ["sender_identity_id"]
            isOneToOne: false
            referencedRelation: "sender_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          address: string
          bank_name: string
          bic: string
          company_name: string
          created_at: string
          currency: string
          default_payment_terms: number
          default_sender_identity_id: string | null
          default_vat_rate: number
          email: string
          email_default_subject: string
          email_default_text: string
          footer_text: string
          iban: string
          invoice_number_include_year: boolean
          invoice_number_next: number
          invoice_number_padding: number
          invoice_number_prefix: string
          is_small_business: boolean
          locale: string
          logo_url: string
          name: string
          number_padding: number
          onboarding_client_id: string | null
          onboarding_completed_at: string | null
          onboarding_step: string
          payment_terms_days: number
          prefix_invoice: string
          prefix_offer: string
          primary_color: string
          small_business_note: string | null
          tax_id: string
          seller_tax_number: string | null
          seller_vat_id: string | null
          seller_country: string
          seller_street: string | null
          seller_house_number: string | null
          seller_postal_code: string | null
          seller_city: string | null
          seller_electronic_address: string | null
          seller_electronic_address_scheme: string
          template_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string
          bank_name?: string
          bic?: string
          company_name?: string
          created_at?: string
          currency?: string
          default_payment_terms?: number
          default_sender_identity_id?: string | null
          default_vat_rate?: number
          email?: string
          email_default_subject?: string
          email_default_text?: string
          footer_text?: string
          iban?: string
          invoice_number_include_year?: boolean
          invoice_number_next?: number
          invoice_number_padding?: number
          invoice_number_prefix?: string
          is_small_business?: boolean
          locale?: string
          logo_url?: string
          name?: string
          number_padding?: number
          onboarding_client_id?: string | null
          onboarding_completed_at?: string | null
          onboarding_step?: string
          payment_terms_days?: number
          prefix_invoice?: string
          prefix_offer?: string
          primary_color?: string
          small_business_note?: string | null
          tax_id?: string
          seller_tax_number?: string | null
          seller_vat_id?: string | null
          seller_country?: string
          seller_street?: string | null
          seller_house_number?: string | null
          seller_postal_code?: string | null
          seller_city?: string | null
          seller_electronic_address?: string | null
          seller_electronic_address_scheme?: string
          template_id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          bank_name?: string
          bic?: string
          company_name?: string
          created_at?: string
          currency?: string
          default_payment_terms?: number
          default_sender_identity_id?: string | null
          default_vat_rate?: number
          email?: string
          email_default_subject?: string
          email_default_text?: string
          footer_text?: string
          iban?: string
          invoice_number_include_year?: boolean
          invoice_number_next?: number
          invoice_number_padding?: number
          invoice_number_prefix?: string
          is_small_business?: boolean
          locale?: string
          logo_url?: string
          name?: string
          number_padding?: number
          onboarding_client_id?: string | null
          onboarding_completed_at?: string | null
          onboarding_step?: string
          payment_terms_days?: number
          prefix_invoice?: string
          prefix_offer?: string
          primary_color?: string
          small_business_note?: string | null
          tax_id?: string
          seller_tax_number?: string | null
          seller_vat_id?: string | null
          seller_country?: string
          seller_street?: string | null
          seller_house_number?: string | null
          seller_postal_code?: string | null
          seller_city?: string | null
          seller_electronic_address?: string | null
          seller_electronic_address_scheme?: string
          template_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_default_sender_identity_id_fkey"
            columns: ["default_sender_identity_id"]
            isOneToOne: false
            referencedRelation: "sender_identities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      save_position_group: {
        Args: {
          p_category: string
          p_description: string
          p_group_id: string | null
          p_items: Json
          p_name: string
        }
        Returns: string
      }
      convert_offer_to_invoice: {
        Args: { offer_id: string }
        Returns: {
          branding_snapshot: Json | null
          canceled_at: string | null
          client_address: string | null
          client_company_name: string | null
          client_contact_person: string | null
          client_email: string | null
          client_id: string
          client_name: string
          client_phone: string | null
          client_vat_id: string | null
          created_at: string
          date: string
          due_date: string
          finalized_at: string | null
          footer_text: string
          id: string
          intro_text: string
          invoice_date: string
          invoice_number: string | null
          is_locked: boolean
          is_small_business: boolean
          issued_at: string | null
          last_sent_at: string | null
          last_sent_to: string | null
          number: string | null
          offer_id: string | null
          paid_at: string | null
          payment_date: string | null
          payment_terms_days: number
          positions: Json
          project_id: string | null
          sent_at: string | null
          sent_count: number
          sent_via: string | null
          service_date: string | null
          service_period_end: string | null
          service_period_start: string | null
          small_business_note: string | null
          status: string
          updated_at: string
          user_id: string
          vat_rate: number
        }
        SetofOptions: {
          from: "*"
          to: "invoices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      copy_customer_snapshot_to_invoice: {
        Args: { p_invoice_id: string }
        Returns: {
          branding_snapshot: Json | null
          canceled_at: string | null
          client_address: string | null
          client_company_name: string | null
          client_contact_person: string | null
          client_email: string | null
          client_id: string
          client_name: string
          client_phone: string | null
          client_vat_id: string | null
          created_at: string
          date: string
          due_date: string
          finalized_at: string | null
          footer_text: string
          id: string
          intro_text: string
          invoice_date: string
          invoice_number: string | null
          is_locked: boolean
          is_small_business: boolean
          issued_at: string | null
          last_sent_at: string | null
          last_sent_to: string | null
          number: string | null
          offer_id: string | null
          paid_at: string | null
          payment_date: string | null
          payment_terms_days: number
          positions: Json
          project_id: string | null
          sent_at: string | null
          sent_count: number
          sent_via: string | null
          service_date: string | null
          service_period_end: string | null
          service_period_start: string | null
          small_business_note: string | null
          status: string
          updated_at: string
          user_id: string
          vat_rate: number
        }
        SetofOptions: {
          from: "*"
          to: "invoices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      finalize_invoice: {
        Args: { invoice_id: string }
        Returns: {
          branding_snapshot: Json | null
          canceled_at: string | null
          client_address: string | null
          client_company_name: string | null
          client_contact_person: string | null
          client_email: string | null
          client_id: string
          client_name: string
          client_phone: string | null
          client_vat_id: string | null
          created_at: string
          date: string
          due_date: string
          finalized_at: string | null
          footer_text: string
          id: string
          intro_text: string
          invoice_date: string
          invoice_number: string | null
          is_locked: boolean
          is_small_business: boolean
          issued_at: string | null
          last_sent_at: string | null
          last_sent_to: string | null
          number: string | null
          offer_id: string | null
          paid_at: string | null
          payment_date: string | null
          payment_terms_days: number
          positions: Json
          project_id: string | null
          sent_at: string | null
          sent_count: number
          sent_via: string | null
          service_date: string | null
          service_period_end: string | null
          service_period_start: string | null
          small_business_note: string | null
          status: string
          updated_at: string
          user_id: string
          vat_rate: number
        }
        SetofOptions: {
          from: "*"
          to: "invoices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mark_invoice_sent: {
        Args: { doc_id: string; p_to: string; p_via: string }
        Returns: {
          branding_snapshot: Json | null
          canceled_at: string | null
          client_address: string | null
          client_company_name: string | null
          client_contact_person: string | null
          client_email: string | null
          client_id: string
          client_name: string
          client_phone: string | null
          client_vat_id: string | null
          created_at: string
          date: string
          due_date: string
          finalized_at: string | null
          footer_text: string
          id: string
          intro_text: string
          invoice_date: string
          invoice_number: string | null
          is_locked: boolean
          is_small_business: boolean
          issued_at: string | null
          last_sent_at: string | null
          last_sent_to: string | null
          number: string | null
          offer_id: string | null
          paid_at: string | null
          payment_date: string | null
          payment_terms_days: number
          positions: Json
          project_id: string | null
          sent_at: string | null
          sent_count: number
          sent_via: string | null
          service_date: string | null
          service_period_end: string | null
          service_period_start: string | null
          small_business_note: string | null
          status: string
          updated_at: string
          user_id: string
          vat_rate: number
        }
        SetofOptions: {
          from: "*"
          to: "invoices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mark_offer_sent: {
        Args: { doc_id: string; p_to: string; p_via: string }
        Returns: {
          client_id: string
          created_at: string
          currency: string
          date: string
          footer_text: string
          id: string
          intro_text: string
          invoice_id: string | null
          last_sent_at: string | null
          last_sent_to: string | null
          number: string
          positions: Json
          project_id: string | null
          sent_at: string | null
          sent_count: number
          sent_via: string | null
          status: string
          updated_at: string
          user_id: string
          valid_until: string | null
          vat_rate: number
        }
        SetofOptions: {
          from: "*"
          to: "offers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_offer_decision: {
        Args: { decision: string; offer_id: string }
        Returns: {
          client_id: string
          created_at: string
          currency: string
          date: string
          footer_text: string
          id: string
          intro_text: string
          invoice_id: string | null
          last_sent_at: string | null
          last_sent_to: string | null
          number: string
          positions: Json
          project_id: string | null
          rejection_reason: string | null
          sent_at: string | null
          sent_count: number
          sent_via: string | null
          status: string
          updated_at: string
          user_id: string
          valid_until: string | null
          vat_rate: number
        }
        SetofOptions: {
          from: "*"
          to: "offers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      next_document_number: {
        Args: { doc_type_param: string }
        Returns: number
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
    Enums: {},
  },
} as const
