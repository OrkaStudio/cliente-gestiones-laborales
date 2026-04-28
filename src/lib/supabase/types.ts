export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
          estado: Database["public"]["Enums"]["estado_busqueda"]
          fecha_apertura: string
          id: string
          puesto: string
          rango_salarial: string | null
          requisitos: string[]
          ubicacion: string | null
          updated_at: string
        }
        Insert: {
          cliente: string
          created_at?: string
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["estado_busqueda"]
          fecha_apertura?: string
          id?: string
          puesto: string
          rango_salarial?: string | null
          requisitos?: string[]
          ubicacion?: string | null
          updated_at?: string
        }
        Update: {
          cliente?: string
          created_at?: string
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["estado_busqueda"]
          fecha_apertura?: string
          id?: string
          puesto?: string
          rango_salarial?: string | null
          requisitos?: string[]
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
          disponibilidad: string | null
          educacion: string | null
          email: string | null
          estado: Database["public"]["Enums"]["estado_candidato"]
          fecha_ingreso: string
          fecha_nacimiento: string | null
          id: string
          idiomas: string[]
          nombre: string
          notas_recruiter: string | null
          pretension_salarial: string | null
          telefono: string | null
          ubicacion: string | null
          ultimo_puesto: string | null
          updated_at: string
        }
        Insert: {
          apellido: string
          created_at?: string
          cv_crudo_url?: string | null
          cv_editado_url?: string | null
          disponibilidad?: string | null
          educacion?: string | null
          email?: string | null
          estado?: Database["public"]["Enums"]["estado_candidato"]
          fecha_ingreso?: string
          fecha_nacimiento?: string | null
          id?: string
          idiomas?: string[]
          nombre: string
          notas_recruiter?: string | null
          pretension_salarial?: string | null
          telefono?: string | null
          ubicacion?: string | null
          ultimo_puesto?: string | null
          updated_at?: string
        }
        Update: {
          apellido?: string
          created_at?: string
          cv_crudo_url?: string | null
          cv_editado_url?: string | null
          disponibilidad?: string | null
          educacion?: string | null
          email?: string | null
          estado?: Database["public"]["Enums"]["estado_candidato"]
          fecha_ingreso?: string
          fecha_nacimiento?: string | null
          id?: string
          idiomas?: string[]
          nombre?: string
          notas_recruiter?: string | null
          pretension_salarial?: string | null
          telefono?: string | null
          ubicacion?: string | null
          ultimo_puesto?: string | null
          updated_at?: string
        }
        Relationships: []
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
          notas: string | null
          updated_at: string
        }
        Insert: {
          busqueda_id: string
          candidato_id: string
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_gestion"]
          id?: string
          notas?: string | null
          updated_at?: string
        }
        Update: {
          busqueda_id?: string
          candidato_id?: string
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_gestion"]
          id?: string
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
      [_ in never]: never
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

export type Tables<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Row"]

export type Enums<T extends keyof DefaultSchema["Enums"]> =
  DefaultSchema["Enums"][T]
