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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      higherkeys: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          highlight_id: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          order_index: number | null
          parent_id: string | null
          path: unknown
          profile_id: string
          source_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          highlight_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          order_index?: number | null
          parent_id?: string | null
          path?: unknown
          profile_id: string
          source_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          highlight_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          order_index?: number | null
          parent_id?: string | null
          path?: unknown
          profile_id?: string
          source_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "higherkeys_highlight_id_fkey"
            columns: ["highlight_id"]
            isOneToOne: false
            referencedRelation: "highlights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "higherkeys_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "higherkeys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "higherkeys_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "higherkeys_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      highlights: {
        Row: {
          alias: string | null
          created_at: string
          end_time: number
          id: string
          is_strikethrough: boolean
          latitude: number | null
          longitude: number | null
          order_index: number | null
          source_id: string
          start_time: number
        }
        Insert: {
          alias?: string | null
          created_at?: string
          end_time: number
          id?: string
          is_strikethrough?: boolean
          latitude?: number | null
          longitude?: number | null
          order_index?: number | null
          source_id: string
          start_time: number
        }
        Update: {
          alias?: string | null
          created_at?: string
          end_time?: number
          id?: string
          is_strikethrough?: boolean
          latitude?: number | null
          longitude?: number | null
          order_index?: number | null
          source_id?: string
          start_time?: number
        }
        Relationships: [
          {
            foreignKeyName: "highlights_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          id: string
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      sources: {
        Row: {
          created_at: string
          description: string | null
          duration: number
          id: string
          latitude: number | null
          longitude: number | null
          metadata: Json | null
          profile_id: string
          status: string
          strikethroughs: number[]
          thumbnail_url: string | null
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration?: number
          id?: string
          latitude?: number | null
          longitude?: number | null
          metadata?: Json | null
          profile_id: string
          status?: string
          strikethroughs?: number[]
          thumbnail_url?: string | null
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration?: number
          id?: string
          latitude?: number | null
          longitude?: number | null
          metadata?: Json | null
          profile_id?: string
          status?: string
          strikethroughs?: number[]
          thumbnail_url?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "sources_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      source_form_submissions: {
        Row: {
          id: string
          source_id: string | null
          external_id: string | null
          payload: Json
          created_at: string
        }
        Insert: {
          id?: string
          source_id?: string | null
          external_id?: string | null
          payload: Json
          created_at?: string
        }
        Update: {
          id?: string
          source_id?: string | null
          external_id?: string | null
          payload?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_form_submissions_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          }
        ]
      }
      source_form_submission_events: {
        Row: {
          id: string
          submission_id: string | null
          source_id: string | null
          event_type: string
          metadata: Json | null
          display_metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          submission_id?: string | null
          source_id?: string | null
          event_type: string
          metadata?: Json | null
          display_metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          submission_id?: string | null
          source_id?: string | null
          event_type?: string
          metadata?: Json | null
          display_metadata?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_form_submission_events_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "source_form_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_form_submission_events_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          }
        ]
      }
      highlight_form_submissions: {
        Row: {
          id: string
          source_id: string | null
          external_id: string | null
          payload: Json
          created_at: string
        }
        Insert: {
          id?: string
          source_id?: string | null
          external_id?: string | null
          payload: Json
          created_at?: string
        }
        Update: {
          id?: string
          source_id?: string | null
          external_id?: string | null
          payload?: Json
          created_at?: string
        }
        Relationships: []
      }
      highlight_form_submission_events: {
        Row: {
          id: string
          submission_id: string | null
          source_id: string | null
          highlight_id: string | null
          event_type: string
          metadata: Json | null
          display_metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          submission_id?: string | null
          source_id?: string | null
          highlight_id?: string | null
          event_type: string
          metadata?: Json | null
          display_metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          submission_id?: string | null
          source_id?: string | null
          highlight_id?: string | null
          event_type?: string
          metadata?: Json | null
          display_metadata?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      roles: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
        }
        Relationships: []
      }
      profile_roles: {
        Row: {
          id: string
          profile_id: string
          role_id: string
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          role_id: string
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          role_id?: string
          created_at?: string
        }
        Relationships: []
      }
      }
    Views: {
      [_ in never]: never
    }
    Functions: {
      fetch_playlist_highlights: {
        Args: { target_key_id: string }
        Returns: {
          alias: string
          created_at: string
          end_time: number
          id: string
          is_strikethrough: boolean
          profile_id: string
          source_id: string
          start_time: number
        }[]
      }
      format_path_index: { Args: { idx: number }; Returns: string }
      format_sort_segment: { Args: { idx: number }; Returns: string }
      get_midpoint: {
        Args: { next_index: number; prev_index: number }
        Returns: number
      }
      get_my_highertree: { Args: never; Returns: Json }
      move_node: {
        Args: {
          p_new_parent_id: string
          p_next_node_id?: string
          p_node_id: string
          p_prev_node_id?: string
        }
        Returns: undefined
      }
      search_content: {
        Args: { primary_filter?: string; search_term: string }
        Returns: Json
      }
      slugify_label: { Args: { txt: string }; Returns: string }
      text2ltree: { Args: { "": string }; Returns: unknown }
    }
    Enums: {
      material_type: "root" | "atom" | "sequence"
      node_type: "folder" | "source_pointer" | "highlight_pointer"
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
      material_type: ["root", "atom", "sequence"],
      node_type: ["folder", "source_pointer", "highlight_pointer"],
    },
  },
} as const
