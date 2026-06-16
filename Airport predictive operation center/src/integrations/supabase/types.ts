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
      airlines: {
        Row: {
          created_at: string
          iata_code: string
          name: string
        }
        Insert: {
          created_at?: string
          iata_code: string
          name: string
        }
        Update: {
          created_at?: string
          iata_code?: string
          name?: string
        }
        Relationships: []
      }
      airports: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          iata_code: string
          latitude: number | null
          longitude: number | null
          name: string
          state: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          iata_code: string
          latitude?: number | null
          longitude?: number | null
          name: string
          state?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          iata_code?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          state?: string | null
        }
        Relationships: []
      }
      flights: {
        Row: {
          arr_delay_min: number | null
          cancelled: number | null
          carrier: string | null
          cloud_cover_pct: number | null
          created_at: string
          date: string
          day_of_week: number | null
          delay_cause: string | null
          delayed_15: number | null
          dep_delay_min: number | null
          dep_hour: number | null
          dest: string | null
          distance_km: number | null
          flight_id: string
          flight_number: number | null
          late_aircraft_delay_min: number | null
          origin: string | null
          origin_lat: number | null
          origin_lon: number | null
          precip_mm: number | null
          sched_dep_local: string | null
          scheduled_arr_local: string | null
          snowfall_cm: number | null
          tail_number: string | null
          temp_c: number | null
          updated_at: string
          weather_code: number | null
          weather_delay_min: number | null
          wind_gust_kmh: number | null
          wind_speed_kmh: number | null
        }
        Insert: {
          arr_delay_min?: number | null
          cancelled?: number | null
          carrier?: string | null
          cloud_cover_pct?: number | null
          created_at?: string
          date: string
          day_of_week?: number | null
          delay_cause?: string | null
          delayed_15?: number | null
          dep_delay_min?: number | null
          dep_hour?: number | null
          dest?: string | null
          distance_km?: number | null
          flight_id: string
          flight_number?: number | null
          late_aircraft_delay_min?: number | null
          origin?: string | null
          origin_lat?: number | null
          origin_lon?: number | null
          precip_mm?: number | null
          sched_dep_local?: string | null
          scheduled_arr_local?: string | null
          snowfall_cm?: number | null
          tail_number?: string | null
          temp_c?: number | null
          updated_at?: string
          weather_code?: number | null
          weather_delay_min?: number | null
          wind_gust_kmh?: number | null
          wind_speed_kmh?: number | null
        }
        Update: {
          arr_delay_min?: number | null
          cancelled?: number | null
          carrier?: string | null
          cloud_cover_pct?: number | null
          created_at?: string
          date?: string
          day_of_week?: number | null
          delay_cause?: string | null
          delayed_15?: number | null
          dep_delay_min?: number | null
          dep_hour?: number | null
          dest?: string | null
          distance_km?: number | null
          flight_id?: string
          flight_number?: number | null
          late_aircraft_delay_min?: number | null
          origin?: string | null
          origin_lat?: number | null
          origin_lon?: number | null
          precip_mm?: number | null
          sched_dep_local?: string | null
          scheduled_arr_local?: string | null
          snowfall_cm?: number | null
          tail_number?: string | null
          temp_c?: number | null
          updated_at?: string
          weather_code?: number | null
          weather_delay_min?: number | null
          wind_gust_kmh?: number | null
          wind_speed_kmh?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "flights_carrier_fkey"
            columns: ["carrier"]
            isOneToOne: false
            referencedRelation: "airlines"
            referencedColumns: ["iata_code"]
          },
          {
            foreignKeyName: "flights_dest_fkey"
            columns: ["dest"]
            isOneToOne: false
            referencedRelation: "airports"
            referencedColumns: ["iata_code"]
          },
          {
            foreignKeyName: "flights_origin_fkey"
            columns: ["origin"]
            isOneToOne: false
            referencedRelation: "airports"
            referencedColumns: ["iata_code"]
          },
        ]
      }
      register_items: {
        Row: {
          action_description: string
          action_id: string
          action_level: string
          action_title: string
          assignee: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          flight_destination: string
          flight_id_ref: string
          flight_number: string
          flight_origin: string
          id: string
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          action_description: string
          action_id: string
          action_level: string
          action_title: string
          assignee?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          flight_destination: string
          flight_id_ref: string
          flight_number: string
          flight_origin: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          action_description?: string
          action_id?: string
          action_level?: string
          action_title?: string
          assignee?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          flight_destination?: string
          flight_id_ref?: string
          flight_number?: string
          flight_origin?: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
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
