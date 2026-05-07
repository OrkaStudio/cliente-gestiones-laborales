"use server"

import { revalidatePath } from "next/cache"
import { createServiceClient } from "@/lib/supabase/service"
import type { CVParseado } from "@/lib/cv/parse"
import { upsertCandidato } from "@/lib/cv/upsert-candidato"

export async function guardarCandidatoProcesado(data: CVParseado): Promise<ActionResult> {
  const supabase = createServiceClient()

  let id: string
  try {
    id = await upsertCandidato(data, null)
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Error guardando candidato" }
  }

  // Guardar cv_procesado_texto + preguntas (igual que el webhook, por separado)
  const { error } = await supabase
    .from("candidatos")
    .update({ cv_procesado_texto: data.cv_procesado_texto, preguntas_sugeridas: data.preguntas_sugeridas })
    .eq("id", id)

  if (error) return { success: false, error: error.message }

  revalidatePath("/candidatos")
  revalidatePath(`/candidatos/${id}`)
  revalidatePath("/")
  return { success: true, id }
}

export async function updateCVProcesado(candidatoId: string, texto: string) {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("candidatos")
    .update({ cv_procesado_texto: texto })
    .eq("id", candidatoId);

  if (error) throw new Error(error.message);
  revalidatePath(`/candidatos/${candidatoId}`);
}

export type ActionResult = { success: true; id: string } | { success: false; error: string }

type CandidatoData = {
  nombre: string
  apellido: string
  email?: string
  telefono?: string
  ultimo_puesto?: string
  disponibilidad?: string
  pretension_salarial?: string
  fecha_nacimiento?: string
  ubicacion?: string
  educacion?: string
  idiomas?: string
  notas_recruiter?: string
  estado?: "activo" | "inactivo"
}

function parseIdiomas(raw?: string): string[] {
  if (!raw) return []
  return raw.split(",").map((s) => s.trim()).filter(Boolean)
}

function buildPayload(data: CandidatoData) {
  return {
    nombre: data.nombre.trim(),
    apellido: data.apellido.trim(),
    email: data.email?.trim() || null,
    telefono: data.telefono?.trim() || null,
    ultimo_puesto: data.ultimo_puesto?.trim() || null,
    disponibilidad: data.disponibilidad?.trim() || null,
    pretension_salarial: data.pretension_salarial?.trim() || null,
    fecha_nacimiento: data.fecha_nacimiento?.trim() || null,
    ubicacion: data.ubicacion?.trim() || null,
    educacion: data.educacion?.trim() || null,
    idiomas: parseIdiomas(data.idiomas),
    notas_recruiter: data.notas_recruiter?.trim() || null,
    estado: (data.estado ?? "activo") as "activo" | "inactivo",
  }
}

export async function createCandidato(data: CandidatoData): Promise<ActionResult> {
  const supabase = createServiceClient()
  const { data: created, error } = await supabase
    .from("candidatos")
    .insert(buildPayload(data))
    .select("id")
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath("/candidatos")
  revalidatePath("/")
  return { success: true, id: created.id }
}

export async function updateCandidato(id: string, data: CandidatoData): Promise<ActionResult> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from("candidatos")
    .update(buildPayload(data))
    .eq("id", id)

  if (error) return { success: false, error: error.message }

  revalidatePath("/candidatos")
  revalidatePath(`/candidatos/${id}`)
  revalidatePath("/")
  return { success: true, id }
}
