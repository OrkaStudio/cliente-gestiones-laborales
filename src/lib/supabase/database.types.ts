export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      busquedas: {
        Row: {
          id: string;
          cliente: string;
          puesto: string;
          ubicacion: string | null;
          estado: "activa" | "pausada" | "cerrada";
          fecha_apertura: string | null;
          descripcion: string | null;
          requisitos: string[] | null;
          rango_salarial: string | null;
          embedding: string | null;
          hectareas_min: number | null;
          personal_a_cargo_min: number | null;
          tipos_ganaderia_req: string[] | null;
          movilidad_requerida: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cliente: string;
          puesto: string;
          ubicacion?: string | null;
          estado?: "activa" | "pausada" | "cerrada";
          fecha_apertura?: string | null;
          descripcion?: string | null;
          requisitos?: string[] | null;
          rango_salarial?: string | null;
          embedding?: string | null;
          hectareas_min?: number | null;
          personal_a_cargo_min?: number | null;
          tipos_ganaderia_req?: string[] | null;
          movilidad_requerida?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          cliente?: string;
          puesto?: string;
          ubicacion?: string | null;
          estado?: "activa" | "pausada" | "cerrada";
          fecha_apertura?: string | null;
          descripcion?: string | null;
          requisitos?: string[] | null;
          rango_salarial?: string | null;
          embedding?: string | null;
          hectareas_min?: number | null;
          personal_a_cargo_min?: number | null;
          tipos_ganaderia_req?: string[] | null;
          movilidad_requerida?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      candidatos: {
        Row: {
          id: string;
          nombre: string;
          apellido: string;
          email: string | null;
          telefono: string | null;
          ubicacion: string | null;
          fecha_nacimiento: string | null;
          estado: string | null;
          ultimo_puesto: string | null;
          educacion: string | null;
          idiomas: string[] | null;
          disponibilidad: string | null;
          pretension_salarial: string | null;
          notas_recruiter: string | null;
          cv_crudo_url: string | null;
          cv_editado_url: string | null;
          dni: string | null;
          lugar_nacimiento: string | null;
          estado_civil: string | null;
          hijos: string | null;
          domicilio_completo: string | null;
          vehiculo_propio: boolean | null;
          licencia_conducir: boolean | null;
          muebles_propios: string | null;
          animales: string | null;
          perfil_laboral: string | null;
          referencias: Json | null;
          campos_faltantes: string[] | null;
          fecha_ingreso: string | null;
          embedding: string | null;
          hectareas_max: number | null;
          personal_a_cargo_max: number | null;
          tipos_ganaderia: string[] | null;
          movilidad: boolean | null;
          cv_procesado_texto: string | null;
          preguntas_sugeridas: string[] | null;
          fecha_consultado: string | null;
          mensaje_whatsapp: string | null;
          respuestas_candidato: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          apellido: string;
          email?: string | null;
          telefono?: string | null;
          ubicacion?: string | null;
          fecha_nacimiento?: string | null;
          estado?: string | null;
          ultimo_puesto?: string | null;
          educacion?: string | null;
          idiomas?: string[] | null;
          disponibilidad?: string | null;
          pretension_salarial?: string | null;
          notas_recruiter?: string | null;
          cv_crudo_url?: string | null;
          cv_editado_url?: string | null;
          fecha_ingreso?: string | null;
          embedding?: string | null;
          hectareas_max?: number | null;
          personal_a_cargo_max?: number | null;
          tipos_ganaderia?: string[] | null;
          movilidad?: boolean | null;
          cv_procesado_texto?: string | null;
          preguntas_sugeridas?: string[] | null;
          fecha_consultado?: string | null;
          mensaje_whatsapp?: string | null;
          respuestas_candidato?: Json | null;
          dni?: string | null;
          lugar_nacimiento?: string | null;
          estado_civil?: string | null;
          hijos?: string | null;
          domicilio_completo?: string | null;
          vehiculo_propio?: boolean | null;
          licencia_conducir?: boolean | null;
          muebles_propios?: string | null;
          animales?: string | null;
          perfil_laboral?: string | null;
          referencias?: Json | null;
          campos_faltantes?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nombre?: string;
          apellido?: string;
          email?: string | null;
          telefono?: string | null;
          ubicacion?: string | null;
          fecha_nacimiento?: string | null;
          estado?: string | null;
          ultimo_puesto?: string | null;
          educacion?: string | null;
          idiomas?: string[] | null;
          disponibilidad?: string | null;
          pretension_salarial?: string | null;
          notas_recruiter?: string | null;
          cv_crudo_url?: string | null;
          cv_editado_url?: string | null;
          fecha_ingreso?: string | null;
          embedding?: string | null;
          hectareas_max?: number | null;
          personal_a_cargo_max?: number | null;
          tipos_ganaderia?: string[] | null;
          movilidad?: boolean | null;
          cv_procesado_texto?: string | null;
          preguntas_sugeridas?: string[] | null;
          fecha_consultado?: string | null;
          mensaje_whatsapp?: string | null;
          respuestas_candidato?: Json | null;
          dni?: string | null;
          lugar_nacimiento?: string | null;
          estado_civil?: string | null;
          hijos?: string | null;
          domicilio_completo?: string | null;
          vehiculo_propio?: boolean | null;
          licencia_conducir?: boolean | null;
          muebles_propios?: string | null;
          animales?: string | null;
          perfil_laboral?: string | null;
          referencias?: Json | null;
          campos_faltantes?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      cv_pares_training: {
        Row: {
          id: string;
          candidato_nombre: string;
          cv_crudo_texto: string;
          cv_procesado_texto: string;
          embedding: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          candidato_nombre: string;
          cv_crudo_texto: string;
          cv_procesado_texto: string;
          embedding?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          candidato_nombre?: string;
          cv_crudo_texto?: string;
          cv_procesado_texto?: string;
          embedding?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      emails_procesados: {
        Row: {
          id: string;
          email_id: string;
          candidato_id: string | null;
          procesado_at: string;
          error: string | null;
        };
        Insert: {
          id?: string;
          email_id: string;
          candidato_id?: string | null;
          procesado_at?: string;
          error?: string | null;
        };
        Update: {
          id?: string;
          email_id?: string;
          candidato_id?: string | null;
          procesado_at?: string;
          error?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "emails_procesados_candidato_id_fkey";
            columns: ["candidato_id"];
            isOneToOne: false;
            referencedRelation: "candidatos";
            referencedColumns: ["id"];
          },
        ];
      };
      experiencia_laboral: {
        Row: {
          id: string;
          candidato_id: string;
          empresa: string;
          rol: string;
          desde: string;
          hasta: string | null;
          descripcion: string | null;
          orden: number;
          nombre_propietario: string | null;
          ubicacion: string | null;
          dimension_establecimiento: string | null;
          personal_a_cargo: string | null;
          en_blanco: boolean | null;
          ingresos_actuales: string | null;
          beneficios: string | null;
          motivo_cambio_o_salida: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          candidato_id: string;
          empresa: string;
          rol: string;
          desde: string;
          hasta?: string | null;
          descripcion?: string | null;
          orden?: number;
          nombre_propietario?: string | null;
          ubicacion?: string | null;
          dimension_establecimiento?: string | null;
          personal_a_cargo?: string | null;
          en_blanco?: boolean | null;
          ingresos_actuales?: string | null;
          beneficios?: string | null;
          motivo_cambio_o_salida?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          candidato_id?: string;
          empresa?: string;
          rol?: string;
          desde?: string;
          hasta?: string | null;
          descripcion?: string | null;
          orden?: number;
          nombre_propietario?: string | null;
          ubicacion?: string | null;
          dimension_establecimiento?: string | null;
          personal_a_cargo?: string | null;
          en_blanco?: boolean | null;
          ingresos_actuales?: string | null;
          beneficios?: string | null;
          motivo_cambio_o_salida?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "experiencia_laboral_candidato_id_fkey";
            columns: ["candidato_id"];
            isOneToOne: false;
            referencedRelation: "candidatos";
            referencedColumns: ["id"];
          },
        ];
      };
      gestiones: {
        Row: {
          id: string;
          candidato_id: string;
          busqueda_id: string;
          estado: string;
          notas: string | null;
          match_score: number | null;
          match_explicacion: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          candidato_id: string;
          busqueda_id: string;
          estado?: string;
          notas?: string | null;
          match_score?: number | null;
          match_explicacion?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          candidato_id?: string;
          busqueda_id?: string;
          estado?: string;
          notas?: string | null;
          match_score?: number | null;
          match_explicacion?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gestiones_candidato_id_fkey";
            columns: ["candidato_id"];
            isOneToOne: false;
            referencedRelation: "candidatos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gestiones_busqueda_id_fkey";
            columns: ["busqueda_id"];
            isOneToOne: false;
            referencedRelation: "busquedas";
            referencedColumns: ["id"];
          },
        ];
      };
      webhook_logs: {
        Row: {
          id: string;
          email_id: string;
          estado: "received" | "processing" | "complete" | "failed";
          detalle: string | null;
          candidato_id: string | null;
          archivo_nombre: string | null;
          remitente_email: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email_id: string;
          estado: "received" | "processing" | "complete" | "failed";
          detalle?: string | null;
          candidato_id?: string | null;
          archivo_nombre?: string | null;
          remitente_email?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email_id?: string;
          estado?: "received" | "processing" | "complete" | "failed";
          detalle?: string | null;
          candidato_id?: string | null;
          archivo_nombre?: string | null;
          remitente_email?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "webhook_logs_candidato_id_fkey";
            columns: ["candidato_id"];
            isOneToOne: false;
            referencedRelation: "candidatos";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {};
    Functions: {
      match_cv_pares_training: {
        Args: { query_embedding: string; match_count?: number };
        Returns: {
          id: string;
          candidato_nombre: string;
          cv_crudo_texto: string;
          cv_procesado_texto: string;
          similarity: number;
        }[];
      };
    };
    Enums: {};
    CompositeTypes: {};
  };
};
