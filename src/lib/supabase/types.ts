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
      busquedas: {
        Row: {
          cliente: string
          created_at: string
          descripcion: string | null
          embedding: string | null
          estado: Database["public"]["Enums"]["estado_busqueda"]
          fecha_apertura: string
          hectareas_min: number | null
          id: string
          movilidad_requerida: boolean | null
          personal_a_cargo_min: number | null
          puesto: string
          rango_salarial: string | null
          requisitos: string[]
          tipos_ganaderia_req: string[]
          ubicacion: string | null
          updated_at: string
        }
        Insert: {
          cliente: string
          created_at?: string
          descripcion?: string | null
          embedding?: string | null
          estado?: Database["public"]["Enums"]["estado_busqueda"]
          fecha_apertura?: string
          hectareas_min?: number | null
          id?: string
          movilidad_requerida?: boolean | null
          personal_a_cargo_min?: number | null
          puesto: string
          rango_salarial?: string | null
          requisitos?: string[]
          tipos_ganaderia_req?: string[]
          ubicacion?: string | null
          updated_at?: string
        }
        Update: {
          cliente?: string
          created_at?: string
          descripcion?: string | null
          embedding?: string | null
          estado?: Database["public"]["Enums"]["estado_busqueda"]
          fecha_apertura?: string
          hectareas_min?: number | null
          id?: string
          movilidad_requerida?: boolean | null
          personal_a_cargo_min?: number | null
          puesto?: string
          rango_salarial?: string | null
          requisitos?: string[]
          tipos_ganaderia_req?: string[]
          ubicacion?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      candidatos: {
        Row: {
          apellido: string
          created_at: string
          cv_crudo_url: string | null
          cv_editado_url: string | null
          cv_procesado_texto: string | null
          disponibilidad: string | null
          educacion: string | null
          email: string | null
          embedding: string | null
          estado: Database["public"]["Enums"]["estado_candidato"]
          fecha_consultado: string | null
          fecha_ingreso: string
          fecha_nacimiento: string | null
          hectareas_max: number | null
          id: string
          idiomas: string[]
          mensaje_whatsapp: string | null
          movilidad: boolean | null
          nombre: string
          notas_recruiter: string | null
          personal_a_cargo_max: number | null
          preguntas_sugeridas: string[]
          pretension_salarial: string | null
          respuestas_candidato: Json | null
          telefono: string | null
          tipos_ganaderia: string[]
          ubicacion: string | null
          ultimo_puesto: string | null
          updated_at: string
        }
        Insert: {
          apellido: string
          created_at?: string
          cv_crudo_url?: string | null
          cv_editado_url?: string | null
          cv_procesado_texto?: string | null
          disponibilidad?: string | null
          educacion?: string | null
          email?: string | null
          embedding?: string | null
          estado?: Database["public"]["Enums"]["estado_candidato"]
          fecha_consultado?: string | null
          fecha_ingreso?: string
          fecha_nacimiento?: string | null
          hectareas_max?: number | null
          id?: string
          idiomas?: string[]
          mensaje_whatsapp?: string | null
          movilidad?: boolean | null
          nombre: string
          notas_recruiter?: string | null
          personal_a_cargo_max?: number | null
          preguntas_sugeridas?: string[]
          pretension_salarial?: string | null
          respuestas_candidato?: Json | null
          telefono?: string | null
          tipos_ganaderia?: string[]
          ubicacion?: string | null
          ultimo_puesto?: string | null
          updated_at?: string
        }
        Update: {
          apellido?: string
          created_at?: string
          cv_crudo_url?: string | null
          cv_editado_url?: string | null
          cv_procesado_texto?: string | null
          disponibilidad?: string | null
          educacion?: string | null
          email?: string | null
          embedding?: string | null
          estado?: Database["public"]["Enums"]["estado_candidato"]
          fecha_consultado?: string | null
          fecha_ingreso?: string
          fecha_nacimiento?: string | null
          hectareas_max?: number | null
          id?: string
          idiomas?: string[]
          mensaje_whatsapp?: string | null
          movilidad?: boolean | null
          nombre?: string
          notas_recruiter?: string | null
          personal_a_cargo_max?: number | null
          preguntas_sugeridas?: string[]
          pretension_salarial?: string | null
          respuestas_candidato?: Json | null
          telefono?: string | null
          tipos_ganaderia?: string[]
          ubicacion?: string | null
          ultimo_puesto?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cv_pares_training: {
        Row: {
          id: string
          candidato_nombre: string
          cv_crudo_texto: string
          cv_procesado_texto: string
          embedding: string | null
          created_at: string
        }
        Insert: {
          id?: string
          candidato_nombre: string
          cv_crudo_texto: string
          cv_procesado_texto: string
          embedding?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          candidato_nombre?: string
          cv_crudo_texto?: string
          cv_procesado_texto?: string
          embedding?: string | null
          created_at?: string
        }
        Relationships: []
      }
      emails_procesados: {
        Row: {
          candidato_id: string | null
          email_id: string
          error: string | null
          id: string
          procesado_at: string
        }
        Insert: {
          candidato_id?: string | null
          email_id: string
          error?: string | null
          id?: string
          procesado_at?: string
        }
        Update: {
          candidato_id?: string | null
          email_id?: string
          error?: string | null
          id?: string
          procesado_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "emails_procesados_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos"
            referencedColumns: ["id"]
          },
        ]
      }
      experiencia_laboral: {
        Row: {
          candidato_id: string
          created_at: string
          descripcion: string | null
          desde: string
          empresa: string
          hasta: string | null
          id: string
          orden: number
          rol: string
        }
        Insert: {
          candidato_id: string
          created_at?: string
          descripcion?: string | null
          desde: string
          empresa: string
          hasta?: string | null
          id?: string
          orden?: number
          rol: string
        }
        Update: {
          candidato_id?: string
          created_at?: string
          descripcion?: string | null
          desde?: string
          empresa?: string
          hasta?: string | null
          id?: string
          orden?: number
          rol?: string
        }
        Relationships: [
          {
            foreignKeyName: "experiencia_laboral_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos"
            referencedColumns: ["id"]
          },
        ]
      }
      gestiones: {
        Row: {
          busqueda_id: string
          candidato_id: string
          created_at: string
          estado: Database["public"]["Enums"]["estado_gestion"]
          id: string
          match_explicacion: string | null
          match_score: number | null
          notas: string | null
          updated_at: string
        }
        Insert: {
          busqueda_id: string
          candidato_id: string
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_gestion"]
          id?: string
          match_explicacion?: string | null
          match_score?: number | null
          notas?: string | null
          updated_at?: string
        }
        Update: {
          busqueda_id?: string
          candidato_id?: string
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_gestion"]
          id?: string
          match_explicacion?: string | null
          match_score?: number | null
          notas?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gestiones_busqueda_id_fkey"
            columns: ["busqueda_id"]
            isOneToOne: false
            referencedRelation: "busquedas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gestiones_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_cv_pares_training: {
        Args: {
          query_embedding: string
          match_count?: number
        }
        Returns: {
          id: string
          candidato_nombre: string
          cv_crudo_texto: string
          cv_procesado_texto: string
          similarity: number
        }[]
      }
    }
    Enums: {
      estado_busqueda: "activa" | "pausada" | "cerrada"
      estado_candidato: "activo" | "inactivo"
      estado_gestion:
        | "preseleccionado"
        | "entrevista_orka"
        | "presentado_cliente"
        | "entrevista_cliente"
        | "ofertado"
        | "contratado"
        | "descartado"
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
      estado_busqueda: ["activa", "pausada", "cerrada"],
      estado_candidato: ["activo", "inactivo"],
      estado_gestion: [
        "preseleccionado",
        "entrevista_orka",
        "presentado_cliente",
        "entrevista_cliente",
        "ofertado",
        "contratado",
        "descartado",
      ],
    },
  },
} as const
