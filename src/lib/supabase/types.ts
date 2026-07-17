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
          actitudes: string[]
          categorias_aceptadas: string[]
          cliente: string
          created_at: string
          criterios: Json
          descripcion: string | null
          disponibilidad_viaje: boolean | null
          edad_maxima: number | null
          edad_minima: number | null
          embedding: string | null
          estado: Database["public"]["Enums"]["estado_busqueda"]
          estado_civil: string | null
          fecha_apertura: string
          fecha_cierre: string | null
          fecha_ultimo_activado: string | null
          habilidades_req: string[]
          hectareas_min: number | null
          id: string
          idioma_ingles: string | null
          movilidad_requerida: boolean | null
          nivel_educacion: string | null
          notas_cierre: string | null
          notas_internas: string | null
          personal_a_cargo_min: number | null
          puesto: string
          puestos_similares: string | null
          rango_salarial: string | null
          reporte_directo: string | null
          requisitos: string[]
          tipos_ganaderia_req: string[]
          ubicacion: string | null
          updated_at: string
        }
        Insert: {
          actitudes?: string[]
          categorias_aceptadas?: string[]
          cliente: string
          created_at?: string
          criterios?: Json
          descripcion?: string | null
          disponibilidad_viaje?: boolean | null
          edad_maxima?: number | null
          edad_minima?: number | null
          embedding?: string | null
          estado?: Database["public"]["Enums"]["estado_busqueda"]
          estado_civil?: string | null
          fecha_apertura?: string
          fecha_cierre?: string | null
          fecha_ultimo_activado?: string | null
          habilidades_req?: string[]
          hectareas_min?: number | null
          id?: string
          idioma_ingles?: string | null
          movilidad_requerida?: boolean | null
          nivel_educacion?: string | null
          notas_cierre?: string | null
          notas_internas?: string | null
          personal_a_cargo_min?: number | null
          puesto: string
          puestos_similares?: string | null
          rango_salarial?: string | null
          reporte_directo?: string | null
          requisitos?: string[]
          tipos_ganaderia_req?: string[]
          ubicacion?: string | null
          updated_at?: string
        }
        Update: {
          actitudes?: string[]
          categorias_aceptadas?: string[]
          cliente?: string
          created_at?: string
          criterios?: Json
          descripcion?: string | null
          disponibilidad_viaje?: boolean | null
          edad_maxima?: number | null
          edad_minima?: number | null
          embedding?: string | null
          estado?: Database["public"]["Enums"]["estado_busqueda"]
          estado_civil?: string | null
          fecha_apertura?: string
          fecha_cierre?: string | null
          fecha_ultimo_activado?: string | null
          habilidades_req?: string[]
          hectareas_min?: number | null
          id?: string
          idioma_ingles?: string | null
          movilidad_requerida?: boolean | null
          nivel_educacion?: string | null
          notas_cierre?: string | null
          notas_internas?: string | null
          personal_a_cargo_min?: number | null
          puesto?: string
          puestos_similares?: string | null
          rango_salarial?: string | null
          reporte_directo?: string | null
          requisitos?: string[]
          tipos_ganaderia_req?: string[]
          ubicacion?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      candidatos: {
        Row: {
          animales: string | null
          apellido: string
          campos_faltantes: string[] | null
          categorias: string[]
          conversaciones_historial: Json | null
          created_at: string
          cv_crudo_url: string | null
          cv_editado_url: string | null
          cv_procesado_texto: string | null
          disponibilidad: string | null
          dni: string | null
          domicilio_completo: string | null
          educacion: string | null
          email: string | null
          embedding: string | null
          estado: Database["public"]["Enums"]["estado_candidato"]
          estado_civil: string | null
          fecha_consultado: string | null
          fecha_ingreso: string
          fecha_nacimiento: string | null
          habilidades: string[]
          hectareas_max: number | null
          hijos: string | null
          id: string
          idiomas: string[]
          informacion_adicional: string | null
          licencia_conducir: boolean | null
          lugar_nacimiento: string | null
          mensaje_whatsapp: string | null
          movilidad: boolean | null
          muebles_propios: string | null
          nombre: string
          notas_recruiter: string | null
          pareja_declarada: string | null
          pareja_id: string | null
          perfil_laboral: string | null
          personal_a_cargo_max: number | null
          preguntas_enviadas: Json | null
          preguntas_mapeadas: Json | null
          preguntas_sugeridas: string[] | null
          pretension_salarial: string | null
          referencias: Json | null
          residir: string
          residir_zona_preferida: string | null
          respuestas_candidato: Json | null
          telefono: string | null
          tipos_ganaderia: string[]
          ubicacion: string | null
          ultimo_puesto: string | null
          updated_at: string
          vehiculo_detalle: string | null
          vehiculo_propio: boolean | null
          visto: boolean
        }
        Insert: {
          animales?: string | null
          apellido: string
          campos_faltantes?: string[] | null
          categorias?: string[]
          conversaciones_historial?: Json | null
          created_at?: string
          cv_crudo_url?: string | null
          cv_editado_url?: string | null
          cv_procesado_texto?: string | null
          disponibilidad?: string | null
          dni?: string | null
          domicilio_completo?: string | null
          educacion?: string | null
          email?: string | null
          embedding?: string | null
          estado?: Database["public"]["Enums"]["estado_candidato"]
          estado_civil?: string | null
          fecha_consultado?: string | null
          fecha_ingreso?: string
          fecha_nacimiento?: string | null
          habilidades?: string[]
          hectareas_max?: number | null
          hijos?: string | null
          id?: string
          idiomas?: string[]
          informacion_adicional?: string | null
          licencia_conducir?: boolean | null
          lugar_nacimiento?: string | null
          mensaje_whatsapp?: string | null
          movilidad?: boolean | null
          muebles_propios?: string | null
          nombre: string
          notas_recruiter?: string | null
          pareja_declarada?: string | null
          pareja_id?: string | null
          perfil_laboral?: string | null
          personal_a_cargo_max?: number | null
          preguntas_enviadas?: Json | null
          preguntas_mapeadas?: Json | null
          preguntas_sugeridas?: string[] | null
          pretension_salarial?: string | null
          referencias?: Json | null
          residir?: string
          residir_zona_preferida?: string | null
          respuestas_candidato?: Json | null
          telefono?: string | null
          tipos_ganaderia?: string[]
          ubicacion?: string | null
          ultimo_puesto?: string | null
          updated_at?: string
          vehiculo_detalle?: string | null
          vehiculo_propio?: boolean | null
          visto?: boolean
        }
        Update: {
          animales?: string | null
          apellido?: string
          campos_faltantes?: string[] | null
          categorias?: string[]
          conversaciones_historial?: Json | null
          created_at?: string
          cv_crudo_url?: string | null
          cv_editado_url?: string | null
          cv_procesado_texto?: string | null
          disponibilidad?: string | null
          dni?: string | null
          domicilio_completo?: string | null
          educacion?: string | null
          email?: string | null
          embedding?: string | null
          estado?: Database["public"]["Enums"]["estado_candidato"]
          estado_civil?: string | null
          fecha_consultado?: string | null
          fecha_ingreso?: string
          fecha_nacimiento?: string | null
          habilidades?: string[]
          hectareas_max?: number | null
          hijos?: string | null
          id?: string
          idiomas?: string[]
          informacion_adicional?: string | null
          licencia_conducir?: boolean | null
          lugar_nacimiento?: string | null
          mensaje_whatsapp?: string | null
          movilidad?: boolean | null
          muebles_propios?: string | null
          nombre?: string
          notas_recruiter?: string | null
          pareja_declarada?: string | null
          pareja_id?: string | null
          perfil_laboral?: string | null
          personal_a_cargo_max?: number | null
          preguntas_enviadas?: Json | null
          preguntas_mapeadas?: Json | null
          preguntas_sugeridas?: string[] | null
          pretension_salarial?: string | null
          referencias?: Json | null
          residir?: string
          residir_zona_preferida?: string | null
          respuestas_candidato?: Json | null
          telefono?: string | null
          tipos_ganaderia?: string[]
          ubicacion?: string | null
          ultimo_puesto?: string | null
          updated_at?: string
          vehiculo_detalle?: string | null
          vehiculo_propio?: boolean | null
          visto?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "candidatos_pareja_id_fkey"
            columns: ["pareja_id"]
            isOneToOne: false
            referencedRelation: "candidatos"
            referencedColumns: ["id"]
          },
        ]
      }
      cv_pares_training: {
        Row: {
          candidato_nombre: string
          created_at: string
          cv_crudo_texto: string
          cv_procesado_texto: string
          embedding: string | null
          id: string
        }
        Insert: {
          candidato_nombre: string
          created_at?: string
          cv_crudo_texto: string
          cv_procesado_texto: string
          embedding?: string | null
          id?: string
        }
        Update: {
          candidato_nombre?: string
          created_at?: string
          cv_crudo_texto?: string
          cv_procesado_texto?: string
          embedding?: string | null
          id?: string
        }
        Relationships: []
      }
      emails_procesados: {
        Row: {
          archivo_nombre: string | null
          candidato_id: string | null
          email_id: string
          error: string | null
          id: string
          procesado_at: string
        }
        Insert: {
          archivo_nombre?: string | null
          candidato_id?: string | null
          email_id: string
          error?: string | null
          id?: string
          procesado_at?: string
        }
        Update: {
          archivo_nombre?: string | null
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
          beneficios: string | null
          candidato_id: string
          created_at: string
          descripcion: string | null
          desde: string | null
          dimension_establecimiento: string | null
          empresa: string
          en_blanco: boolean | null
          hasta: string | null
          id: string
          ingresos_actuales: string | null
          motivo_cambio_o_salida: string | null
          nombre_propietario: string | null
          orden: number
          personal_a_cargo: string | null
          rol: string
          ubicacion: string | null
        }
        Insert: {
          beneficios?: string | null
          candidato_id: string
          created_at?: string
          descripcion?: string | null
          desde?: string | null
          dimension_establecimiento?: string | null
          empresa: string
          en_blanco?: boolean | null
          hasta?: string | null
          id?: string
          ingresos_actuales?: string | null
          motivo_cambio_o_salida?: string | null
          nombre_propietario?: string | null
          orden?: number
          personal_a_cargo?: string | null
          rol: string
          ubicacion?: string | null
        }
        Update: {
          beneficios?: string | null
          candidato_id?: string
          created_at?: string
          descripcion?: string | null
          desde?: string | null
          dimension_establecimiento?: string | null
          empresa?: string
          en_blanco?: boolean | null
          hasta?: string | null
          id?: string
          ingresos_actuales?: string | null
          motivo_cambio_o_salida?: string | null
          nombre_propietario?: string | null
          orden?: number
          personal_a_cargo?: string | null
          rol?: string
          ubicacion?: string | null
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
      notificaciones: {
        Row: {
          busqueda_id: string | null
          candidato_id: string | null
          created_at: string
          cuerpo: string
          id: string
          leida: boolean
          tipo: "garantia" | "cv_error" | "cv_nuevo" | "cv_duplicado"
          titulo: string
        }
        Insert: {
          busqueda_id?: string | null
          candidato_id?: string | null
          created_at?: string
          cuerpo: string
          id?: string
          leida?: boolean
          tipo: "garantia" | "cv_error" | "cv_nuevo" | "cv_duplicado"
          titulo: string
        }
        Update: {
          busqueda_id?: string | null
          candidato_id?: string | null
          created_at?: string
          cuerpo?: string
          id?: string
          leida?: boolean
          tipo?: "garantia" | "cv_error" | "cv_nuevo" | "cv_duplicado"
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificaciones_busqueda_id_fkey"
            columns: ["busqueda_id"]
            isOneToOne: false
            referencedRelation: "busquedas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificaciones_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos"
            referencedColumns: ["id"]
          },
        ]
      }
      parejas: {
        Row: {
          candidato_a_id: string
          candidato_b_id: string
          created_at: string
          id: string
          principal_id: string | null
          situacion_familiar: string | null
          updated_at: string
        }
        Insert: {
          candidato_a_id: string
          candidato_b_id: string
          created_at?: string
          id?: string
          principal_id?: string | null
          situacion_familiar?: string | null
          updated_at?: string
        }
        Update: {
          candidato_a_id?: string
          candidato_b_id?: string
          created_at?: string
          id?: string
          principal_id?: string | null
          situacion_familiar?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parejas_candidato_a_id_fkey"
            columns: ["candidato_a_id"]
            isOneToOne: false
            referencedRelation: "candidatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parejas_candidato_b_id_fkey"
            columns: ["candidato_b_id"]
            isOneToOne: false
            referencedRelation: "candidatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parejas_principal_id_fkey"
            columns: ["principal_id"]
            isOneToOne: false
            referencedRelation: "candidatos"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_logs: {
        Row: {
          archivo_nombre: string | null
          candidato_id: string | null
          created_at: string
          detalle: string | null
          email_id: string
          estado: "received" | "processing" | "complete" | "failed" | "duplicate"
          id: string
          remitente_email: string | null
        }
        Insert: {
          archivo_nombre?: string | null
          candidato_id?: string | null
          created_at?: string
          detalle?: string | null
          email_id: string
          estado: "received" | "processing" | "complete" | "failed" | "duplicate"
          id?: string
          remitente_email?: string | null
        }
        Update: {
          archivo_nombre?: string | null
          candidato_id?: string | null
          created_at?: string
          detalle?: string | null
          email_id?: string
          estado?: "received" | "processing" | "complete" | "failed" | "duplicate"
          id?: string
          remitente_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_candidato_id_fkey"
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
      desvincular_pareja: { Args: { a: string }; Returns: undefined }
      match_cv_pares_training: {
        Args: { match_count?: number; query_embedding: string }
        Returns: {
          candidato_nombre: string
          cv_crudo_texto: string
          cv_procesado_texto: string
          id: string
          similarity: number
        }[]
      }
      vincular_pareja: { Args: { a: string; b: string }; Returns: undefined }
    }
    Enums: {
      estado_busqueda:
        | "activa"
        | "pausada"
        | "cerrada"
        | "archivada"
        | "temporario"
      estado_candidato: "activo" | "inactivo"
      estado_gestion:
        | "preseleccionado"
        | "entrevista_orka"
        | "presentado_cliente"
        | "entrevista_cliente"
        | "ofertado"
        | "contratado"
        | "temporario"
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
      estado_busqueda: [
        "activa",
        "pausada",
        "cerrada",
        "archivada",
        "temporario",
      ],
      estado_candidato: ["activo", "inactivo"],
      estado_gestion: [
        "preseleccionado",
        "entrevista_orka",
        "presentado_cliente",
        "entrevista_cliente",
        "ofertado",
        "contratado",
        "temporario",
        "descartado",
      ],
    },
  },
} as const
