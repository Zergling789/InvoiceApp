export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      audit_events: {
        Row: {
          action: string;
          created_at: string;
          entity_id: string | null;
          entity_type: string;
          id: string;
          meta: Json;
          user_id: string | null;
        };
        Insert: {
          action: string;
          created_at?: string;
          entity_id?: string | null;
          entity_type: string;
          id?: string;
          meta?: Json;
          user_id?: string | null;
        };
        Update: {
          action?: string;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string;
          id?: string;
          meta?: Json;
          user_id?: string | null;
        };
      };
      clients: {
        Row: {
          address: string | null;
          company_name: string | null;
          contact_person: string | null;
          created_at: string;
          email: string | null;
          id: string;
          notes: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          address?: string | null;
          company_name?: string | null;
          contact_person?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          notes?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          address?: string | null;
          company_name?: string | null;
          contact_person?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          notes?: string | null;
          updated_at?: string;
          user_id?: string;
        };
      };
      document_activity: {
        Row: {
          created_at: string;
          doc_id: string;
          doc_type: string;
          event_type: string;
          id: string;
          meta: Json;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          doc_id: string;
          doc_type: string;
          event_type: string;
          id?: string;
          meta?: Json;
          user_id: string;
        };
        Update: {
          created_at?: string;
          doc_id?: string;
          doc_type?: string;
          event_type?: string;
          id?: string;
          meta?: Json;
          user_id?: string;
        };
      };
      document_counters: {
        Row: {
          counter: number;
          doc_type: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          counter?: number;
          doc_type: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          counter?: number;
          doc_type?: string;
          updated_at?: string;
          user_id?: string;
        };
      };
      invoices: {
        Row: {
          client_id: string;
          created_at: string;
          date: string;
          due_date: string | null;
          finalized_at: string | null;
          footer_text: string;
          id: string;
          intro_text: string;
          is_small_business: boolean;
          is_locked: boolean;
          last_sent_at: string | null;
          last_sent_to: string | null;
          number: string | null;
          offer_id: string | null;
          payment_date: string | null;
          positions: Json;
          project_id: string | null;
          small_business_note: string | null;
          sent_at: string | null;
          sent_count: number;
          sent_via: string | null;
          status: string;
          updated_at: string;
          user_id: string;
          vat_rate: number;
        };
        Insert: {
          client_id: string;
          created_at?: string;
          date?: string;
          due_date?: string | null;
          finalized_at?: string | null;
          footer_text?: string;
          id?: string;
          intro_text?: string;
          is_small_business?: boolean;
          is_locked?: boolean;
          last_sent_at?: string | null;
          last_sent_to?: string | null;
          number?: string | null;
          offer_id?: string | null;
          payment_date?: string | null;
          positions?: Json;
          project_id?: string | null;
          small_business_note?: string | null;
          sent_at?: string | null;
          sent_count?: number;
          sent_via?: string | null;
          status?: string;
          updated_at?: string;
          user_id: string;
          vat_rate?: number;
        };
        Update: {
          client_id?: string;
          created_at?: string;
          date?: string;
          due_date?: string | null;
          finalized_at?: string | null;
          footer_text?: string;
          id?: string;
          intro_text?: string;
          is_small_business?: boolean;
          is_locked?: boolean;
          last_sent_at?: string | null;
          last_sent_to?: string | null;
          number?: string | null;
          offer_id?: string | null;
          payment_date?: string | null;
          positions?: Json;
          project_id?: string | null;
          small_business_note?: string | null;
          sent_at?: string | null;
          sent_count?: number;
          sent_via?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
          vat_rate?: number;
        };
      };
      offers: {
        Row: {
          client_id: string;
          created_at: string;
          currency: string;
          date: string;
          footer_text: string;
          id: string;
          intro_text: string;
          invoice_id: string | null;
          last_sent_at: string | null;
          last_sent_to: string | null;
          number: string;
          positions: Json;
          project_id: string | null;
          sent_at: string | null;
          sent_count: number;
          sent_via: string | null;
          status: string;
          updated_at: string;
          user_id: string;
          valid_until: string | null;
          vat_rate: number;
        };
        Insert: {
          client_id: string;
          created_at?: string;
          currency?: string;
          date?: string;
          footer_text?: string;
          id?: string;
          intro_text?: string;
          invoice_id?: string | null;
          last_sent_at?: string | null;
          last_sent_to?: string | null;
          number?: string;
          positions?: Json;
          project_id?: string | null;
          sent_at?: string | null;
          sent_count?: number;
          sent_via?: string | null;
          status?: string;
          updated_at?: string;
          user_id: string;
          valid_until?: string | null;
          vat_rate?: number;
        };
        Update: {
          client_id?: string;
          created_at?: string;
          currency?: string;
          date?: string;
          footer_text?: string;
          id?: string;
          intro_text?: string;
          invoice_id?: string | null;
          last_sent_at?: string | null;
          last_sent_to?: string | null;
          number?: string;
          positions?: Json;
          project_id?: string | null;
          sent_at?: string | null;
          sent_count?: number;
          sent_via?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
          valid_until?: string | null;
          vat_rate?: number;
        };
      };
      projects: {
        Row: {
          budget_total: number | null;
          budget_type: string;
          client_id: string;
          created_at: string;
          hourly_rate: number | null;
          id: string;
          name: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          budget_total?: number | null;
          budget_type: string;
          client_id: string;
          created_at?: string;
          hourly_rate?: number | null;
          id?: string;
          name: string;
          status: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          budget_total?: number | null;
          budget_type?: string;
          client_id?: string;
          created_at?: string;
          hourly_rate?: number | null;
          id?: string;
          name?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
      };
      sender_identities: {
        Row: {
          created_at: string;
          display_name: string | null;
          email: string;
          id: string;
          last_used_at: string | null;
          last_verification_sent_at: string | null;
          status: string;
          updated_at: string;
          user_id: string;
          verified_at: string | null;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          email: string;
          id?: string;
          last_used_at?: string | null;
          last_verification_sent_at?: string | null;
          status: string;
          updated_at?: string;
          user_id: string;
          verified_at?: string | null;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          email?: string;
          id?: string;
          last_used_at?: string | null;
          last_verification_sent_at?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
          verified_at?: string | null;
        };
      };
      sender_identity_tokens: {
        Row: {
          created_at: string;
          expires_at: string;
          id: string;
          request_ip: string | null;
          sender_identity_id: string;
          token_hash: string;
          used_at: string | null;
          user_agent: string | null;
        };
        Insert: {
          created_at?: string;
          expires_at: string;
          id?: string;
          request_ip?: string | null;
          sender_identity_id: string;
          token_hash: string;
          used_at?: string | null;
          user_agent?: string | null;
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          id?: string;
          request_ip?: string | null;
          sender_identity_id?: string;
          token_hash?: string;
          used_at?: string | null;
          user_agent?: string | null;
        };
      };
      user_settings: {
        Row: {
          address: string;
          bank_name: string;
          bic: string;
          company_name: string;
          created_at: string;
          currency: string;
          default_payment_terms: number;
          default_sender_identity_id: string | null;
          default_vat_rate: number;
          email: string;
          email_default_subject: string;
          email_default_text: string;
          footer_text: string;
          iban: string;
          is_small_business: boolean;
          locale: string;
          logo_url: string;
          name: string;
          number_padding: number;
          prefix_invoice: string;
          prefix_offer: string;
          primary_color: string;
          small_business_note: string | null;
          tax_id: string;
          template_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          address?: string;
          bank_name?: string;
          bic?: string;
          company_name?: string;
          created_at?: string;
          currency?: string;
          default_payment_terms?: number;
          default_sender_identity_id?: string | null;
          default_vat_rate?: number;
          email?: string;
          email_default_subject?: string;
          email_default_text?: string;
          footer_text?: string;
          iban?: string;
          is_small_business?: boolean;
          locale?: string;
          logo_url?: string;
          name?: string;
          number_padding?: number;
          prefix_invoice?: string;
          prefix_offer?: string;
          primary_color?: string;
          small_business_note?: string | null;
          tax_id?: string;
          template_id?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          address?: string;
          bank_name?: string;
          bic?: string;
          company_name?: string;
          created_at?: string;
          currency?: string;
          default_payment_terms?: number;
          default_sender_identity_id?: string | null;
          default_vat_rate?: number;
          email?: string;
          email_default_subject?: string;
          email_default_text?: string;
          footer_text?: string;
          iban?: string;
          is_small_business?: boolean;
          locale?: string;
          logo_url?: string;
          name?: string;
          number_padding?: number;
          prefix_invoice?: string;
          prefix_offer?: string;
          primary_color?: string;
          small_business_note?: string | null;
          tax_id?: string;
          template_id?: string;
          updated_at?: string;
          user_id?: string;
        };
      };
    };
    Views: {};
    Functions: {
      convert_offer_to_invoice: {
        Args: {
          offer_id: string;
        };
        Returns: Database["public"]["Tables"]["invoices"]["Row"];
      };
      finalize_invoice: {
        Args: {
          invoice_id: string;
        };
        Returns: Database["public"]["Tables"]["invoices"]["Row"];
      };
      mark_invoice_sent: {
        Args: {
          doc_id: string;
          p_to: string;
          p_via: string;
        };
        Returns: Database["public"]["Tables"]["invoices"]["Row"];
      };
      mark_offer_sent: {
        Args: {
          doc_id: string;
          p_to: string;
          p_via: string;
        };
        Returns: Database["public"]["Tables"]["offers"]["Row"];
      };
      next_document_number: {
        Args: {
          doc_type_param: string;
        };
        Returns: number;
      };
    };
    Enums: {};
    CompositeTypes: {};
  };
};
