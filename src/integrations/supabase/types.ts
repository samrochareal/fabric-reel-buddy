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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      background_images: {
        Row: {
          created_at: string
          data_url: string
          id: string
          name: string
          project_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_url: string
          id?: string
          name?: string
          project_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          data_url?: string
          id?: string
          name?: string
          project_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "background_images_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          reason: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          reason: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_reads: {
        Row: {
          id: string
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          link_label: string | null
          link_url: string | null
          target_user_id: string | null
          title: string
        }
        Insert: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          link_label?: string | null
          link_url?: string | null
          target_user_id?: string | null
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          link_label?: string | null
          link_url?: string | null
          target_user_id?: string | null
          title?: string
        }
        Relationships: []
      }
      overlay_presets: {
        Row: {
          config: Json
          created_at: string
          data_url: string
          id: string
          name: string
          slot: number
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          data_url: string
          id?: string
          name?: string
          slot: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          config?: Json
          created_at?: string
          data_url?: string
          id?: string
          name?: string
          slot?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          created_at: string
          external_links: Json
          icon_url: string | null
          id: boolean
          landing_content: Json
          logo_url: string | null
          palette: Json
          referral_enabled: boolean
          referral_reward_credits: number
          system_name: string
          tagline: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          external_links?: Json
          icon_url?: string | null
          id?: boolean
          landing_content?: Json
          logo_url?: string | null
          palette?: Json
          referral_enabled?: boolean
          referral_reward_credits?: number
          system_name?: string
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          external_links?: Json
          icon_url?: string | null
          id?: boolean
          landing_content?: Json
          logo_url?: string | null
          palette?: Json
          referral_enabled?: boolean
          referral_reward_credits?: number
          system_name?: string
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          access_expires_at: string | null
          allowed_tools: Json
          blocked: boolean
          created_at: string
          credit_refill_amount: number
          credit_refill_hours: number
          credits: number
          credits_used: number
          email: string | null
          full_name: string | null
          id: string
          last_refill_at: string
          premium: boolean
          referral_code: string | null
          referred_by: string | null
        }
        Insert: {
          access_expires_at?: string | null
          allowed_tools?: Json
          blocked?: boolean
          created_at?: string
          credit_refill_amount?: number
          credit_refill_hours?: number
          credits?: number
          credits_used?: number
          email?: string | null
          full_name?: string | null
          id: string
          last_refill_at?: string
          premium?: boolean
          referral_code?: string | null
          referred_by?: string | null
        }
        Update: {
          access_expires_at?: string | null
          allowed_tools?: Json
          blocked?: boolean
          created_at?: string
          credit_refill_amount?: number
          credit_refill_hours?: number
          credits?: number
          credits_used?: number
          email?: string | null
          full_name?: string | null
          id?: string
          last_refill_at?: string
          premium?: boolean
          referral_code?: string | null
          referred_by?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          anti_dup: boolean
          created_at: string
          id: string
          name: string
          options: Json
          overrides: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          anti_dup?: boolean
          created_at?: string
          id?: string
          name?: string
          options?: Json
          overrides?: Json
          updated_at?: string
          user_id?: string
        }
        Update: {
          anti_dup?: boolean
          created_at?: string
          id?: string
          name?: string
          options?: Json
          overrides?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referred_user_id: string
          referrer_id: string
          reward_credits: number
        }
        Insert: {
          created_at?: string
          id?: string
          referred_user_id: string
          referrer_id: string
          reward_credits?: number
        }
        Update: {
          created_at?: string
          id?: string
          referred_user_id?: string
          referrer_id?: string
          reward_credits?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          edit_options: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          edit_options?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          edit_options?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      video_jobs: {
        Row: {
          clips: number
          created_at: string
          duration_seconds: number | null
          id: string
          output_bytes: number | null
          user_id: string | null
        }
        Insert: {
          clips?: number
          created_at?: string
          duration_seconds?: number | null
          id?: string
          output_bytes?: number | null
          user_id?: string | null
        }
        Update: {
          clips?: number
          created_at?: string
          duration_seconds?: number | null
          id?: string
          output_bytes?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_claim_referral: {
        Args: { _code: string; _user_id: string }
        Returns: Json
      }
      admin_consume_credits: {
        Args: { _amount: number; _user_id: string }
        Returns: Json
      }
      admin_delete_notification: { Args: { _id: string }; Returns: Json }
      admin_list_notifications: { Args: never; Returns: Json }
      admin_list_users: { Args: never; Returns: Json }
      admin_platform_stats: { Args: never; Returns: Json }
      admin_send_notification: {
        Args: {
          _body: string
          _link_label: string
          _link_url: string
          _target_user_id: string
          _title: string
        }
        Returns: Json
      }
      admin_update_user: {
        Args: {
          _access_expires_at?: string
          _allowed_tools?: Json
          _blocked?: boolean
          _clear_expiry?: boolean
          _credit_refill_amount?: number
          _credit_refill_hours?: number
          _credits?: number
          _premium?: boolean
          _user_id: string
        }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user"],
    },
  },
} as const
