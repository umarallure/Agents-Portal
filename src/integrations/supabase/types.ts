export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      agents: {
        Row: {
          created_at: string | null
          email: string
          id: string
          licensed_accounts: string[] | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          licensed_accounts?: string[] | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          licensed_accounts?: string[] | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      call_results: {
        Row: {
          agent_id: string | null
          agent_who_took_call: string | null
          application_submitted: boolean | null
          buffer_agent: string | null
          carrier: string | null
          coverage_amount: number | null
          created_at: string | null
          draft_date: string | null
          face_amount: number | null
          id: string
          licensed_agent_account: string | null
          monthly_premium: number | null
          notes: string | null
          product_type: string | null
          sent_to_underwriting: boolean | null
          status: string | null
          submission_date: string | null
          submission_id: string
          submitting_agent: string | null
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          agent_who_took_call?: string | null
          application_submitted: boolean | null
          buffer_agent?: string | null
          carrier?: string | null
          coverage_amount?: number | null
          created_at?: string | null
          draft_date?: string | null
          face_amount?: number | null
          id?: string
          licensed_agent_account?: string | null
          monthly_premium?: number | null
          notes?: string | null
          product_type?: string | null
          sent_to_underwriting?: boolean | null
          status?: string | null
          submission_date?: string | null
          submission_id: string
          submitting_agent?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          agent_who_took_call?: string | null
          application_submitted?: boolean | null
          buffer_agent?: string | null
          carrier?: string | null
          coverage_amount?: number | null
          created_at?: string | null
          draft_date?: string | null
          face_amount?: number | null
          id?: string
          licensed_agent_account?: string | null
          monthly_premium?: number | null
          notes?: string | null
          product_type?: string | null
          sent_to_underwriting?: boolean | null
          status?: string | null
          submission_date?: string | null
          submission_id: string
          submitting_agent?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_results_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_results_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["submission_id"]
          },
        ]
      }
      leads: {
        Row: {
          additional_notes: string | null
          age: number | null
          agent: string | null
          beneficiary_account: string | null
          beneficiary_routing: string | null
          buffer_agent: string | null
          carrier: string | null
          city: string | null
          coverage_amount: number | null
          created_at: string | null
          customer_full_name: string | null
          date_of_birth: string | null
          draft_date: string | null
          email: string | null
          future_draft_date: string | null
          health_conditions: string | null
          id: string
          lead_vendor: string | null
          monthly_premium: number | null
          phone_number: string | null
          product_type: string | null
          social_security: string | null
          state: string | null
          street_address: string | null
          submission_date: string | null
          submission_id: string | null
          updated_at: string | null
          user_id: string | null
          zip_code: string | null
        }
        Insert: {
          additional_notes?: string | null
          age?: number | null
          agent?: string | null
          beneficiary_account?: string | null
          beneficiary_routing?: string | null
          buffer_agent?: string | null
          carrier?: string | null
          city?: string | null
          coverage_amount?: number | null
          created_at?: string | null
          customer_full_name?: string | null
          date_of_birth?: string | null
          draft_date?: string | null
          email?: string | null
          future_draft_date?: string | null
          health_conditions?: string | null
          id?: string
          lead_vendor?: string | null
          monthly_premium?: number | null
          phone_number?: string | null
          product_type?: string | null
          social_security?: string | null
          state?: string | null
          street_address?: string | null
          submission_date?: string | null
          submission_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          zip_code?: string | null
        }
        Update: {
          additional_notes?: string | null
          age?: number | null
          agent?: string | null
          beneficiary_account?: string | null
          beneficiary_routing?: string | null
          buffer_agent?: string | null
          carrier?: string | null
          city?: string | null
          coverage_amount?: number | null
          created_at?: string | null
          customer_full_name?: string | null
          date_of_birth?: string | null
          draft_date?: string | null
          email?: string | null
          future_draft_date?: string | null
          health_conditions?: string | null
          id?: string
          lead_vendor?: string | null
          monthly_premium?: number | null
          phone_number?: string | null
          product_type?: string | null
          social_security?: string | null
          state?: string | null
          street_address?: string | null
          submission_date?: string | null
          submission_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          agent_code: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_code?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_code?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
    : never,
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
