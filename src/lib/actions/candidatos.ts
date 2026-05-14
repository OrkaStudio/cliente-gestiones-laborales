"use server"

import { revalidatePath } from "next/cache"
import { createServiceClient } from "@/lib/supabase/service"
import type { CVParseado } from "@/lib/cv/parse"
import { upsertCandidato } from "@/lib/cv/upsert-candidato"
import { anthropic } from "@ai-sdk/anthropic"
import { generateText } from "ai"
import { parseSections, assembleSections, parseKV, type KVPair } from "@/lib/cv/utils"

// Labels del CV que corresponden a campos del perfil
const PROFILE_TO_CV_LABEL: Record<string, string> = {
  telefono:         "Teléfono",
  email:            "Email",
  fecha_nacimiento: "Fecha de nacimiento",
  ubicacion:        "Ubicación",
}

function syncDatosPersonales(cvTexto: string, data: CandidatoData): string {
  const sections = parseSections(cvTexto)
  const dpIdx    = sections.findIndex((s) => s.title === "DATOS PERSONALES")
  if (dpIdx === -1) return cvTexto

  const managed  = new Set(Object.values(PROFILE_TO_CV_LABEL).map((l) => l.toLowerCase()))
  const existing = parseKV(sections[dpIdx].content)

  // Pares que no manejamos (DNI, Nacionalidad, etc.) → los conservamos
  const extra = existing.filter((p) => !managed.has(p.label.toLowerCase()))

  // Pares que sí manejamos, con los valores nuevos
  const updated: KVPair[] = Object.entries(PROFILE_TO_CV_LABEL).flatMap(([field, label]) => {
    const val = (data as Record<string, string | undefined>)[field]?.trim()
    return val ? [{ label, value: val }] : []
  })

  const content = [...updated, ...extra]
    .map((p) => (p.label ? `${p.label}: ${p.value}` : p.value))
    .join("\n")

  sections[dpIdx] = { ...sections[dpIdx], content }
  return assembleSections(sections)
}

export async function guardarCandidatoProcesado(data: CVParseado): Promise<ActionResult> {
  const supabase = createServiceClient()

  let id: string
  try {
    const result = await upsertCandidato(data, null)
    id = result.id
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

export async function registrarEnvioWhatsapp(candidatoId: string, mensajeEnviado: string): Promise<ActionResult> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from("candidatos")
    .update({
      fecha_consultado: new Date().toISOString(),
      mensaje_whatsapp: mensajeEnviado,
    })
    .eq("id", candidatoId)

  if (error) return { success: false, error: error.message }

  revalidatePath("/candidatos")
  revalidatePath(`/candidatos/${candidatoId}`)
  return { success: true, id: candidatoId }
}

export type RespuestaItem = { pregunta: string; respuesta: string }

export async function guardarRespuestas(candidatoId: string, respuestas: RespuestaItem[]): Promise<ActionResult> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from("candidatos")
    .update({ respuestas_candidato: respuestas as unknown as import("@/lib/supabase/types").Json })
    .eq("id", candidatoId)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/candidatos/${candidatoId}`)
  return { success: true, id: candidatoId }
}

export async function actualizarCVConRespuestas(candidatoId: string): Promise<ActionResult> {
  const supabase = createServiceClient()
  const { data: candidato, error: fetchError } = await supabase
    .from("candidatos")
    .select("nombre, cv_procesado_texto, preguntas_sugeridas, respuestas_candidato")
    .eq("id", candidatoId)
    .single()

  if (fetchError || !candidato) return { success: false, error: "Candidato no encontrado" }
  if (!candidato.cv_procesado_texto) return { success: false, error: "El candidato no tiene CV procesado" }

  const respuestas = candidato.respuestas_candidato as RespuestaItem[] | null
  if (!respuestas?.length) return { success: false, error: "No hay respuestas cargadas" }

  const qaTexto = respuestas
    .map((r, i) => `${i + 1}. Pregunta: ${r.pregunta}\n   Respuesta: ${r.respuesta || "(sin respuesta)"}`)
    .join("\n\n")

  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-6"),
    system: `Sos asistente de RRHH de una consultora agropecuaria. Dado el CV procesado de un candidato y sus respuestas a preguntas de preselección, actualizá el CV incorporando la información nueva sin inventar datos. Mantenés el formato exacto: secciones en mayúsculas seguidas de separador ─────────────────────────────────────────────────── (49 guiones). No agregues secciones nuevas si el CV no las tiene. Respondé solo con el CV actualizado, sin explicaciones.`,
    prompt: `CV actual:\n${candidato.cv_procesado_texto}\n\nRespuestas del candidato a preguntas de preselección:\n${qaTexto}`,
  })

  const { error: updateError } = await supabase
    .from("candidatos")
    .update({ cv_procesado_texto: text })
    .eq("id", candidatoId)

  if (updateError) return { success: false, error: updateError.message }

  revalidatePath(`/candidatos/${candidatoId}`)
  revalidatePath(`/candidatos/${candidatoId}/cv`)
  return { success: true, id: candidatoId }
}

export type ActionResult = { success: true; id: string } | { success: false; error: string }

export async function updateCandidatoFields(
  id: string,
  fields: import("@/lib/supabase/types").TablesUpdate<"candidatos">,
): Promise<ActionResult> {
  const supabase = createServiceClient()
  const { error } = await supabase.from("candidatos").update(fields).eq("id", id)
  if (error) return { success: false, error: error.message }
  revalidatePath(`/candidatos/${id}`)
  revalidatePath(`/candidatos/${id}/cv`)
  return { success: true, id }
}

export async function updateExperienciaFields(
  expId: string,
  candidatoId: string,
  fields: import("@/lib/supabase/types").TablesUpdate<"experiencia_laboral">,
): Promise<ActionResult> {
  const supabase = createServiceClient()
  const { error } = await supabase.from("experiencia_laboral").update(fields).eq("id", expId)
  if (error) return { success: false, error: error.message }
  revalidatePath(`/candidatos/${candidatoId}`)
  revalidatePath(`/candidatos/${candidatoId}/cv`)
  return { success: true, id: expId }
}

export async function addExperiencia(
  candidatoId: string,
  fields: Omit<import("@/lib/supabase/types").TablesInsert<"experiencia_laboral">, "candidato_id">,
): Promise<ActionResult> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("experiencia_laboral")
    .insert({ ...fields, candidato_id: candidatoId })
    .select("id")
    .single()
  if (error) return { success: false, error: error.message }
  revalidatePath(`/candidatos/${candidatoId}`)
  revalidatePath(`/candidatos/${candidatoId}/cv`)
  return { success: true, id: data.id }
}

export async function deleteExperiencia(expId: string, candidatoId: string): Promise<ActionResult> {
  const supabase = createServiceClient()
  const { error } = await supabase.from("experiencia_laboral").delete().eq("id", expId)
  if (error) return { success: false, error: error.message }
  revalidatePath(`/candidatos/${candidatoId}`)
  revalidatePath(`/candidatos/${candidatoId}/cv`)
  return { success: true, id: expId }
}

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

  // Sincronizar DATOS PERSONALES del CV con los valores del perfil
  const { data: row } = await supabase
    .from("candidatos")
    .select("cv_procesado_texto")
    .eq("id", id)
    .single()

  if (row?.cv_procesado_texto) {
    const synced = syncDatosPersonales(row.cv_procesado_texto, data)
    if (synced !== row.cv_procesado_texto) {
      await supabase
        .from("candidatos")
        .update({ cv_procesado_texto: synced })
        .eq("id", id)
    }
  }

  revalidatePath("/candidatos")
  revalidatePath(`/candidatos/${id}`)
  revalidatePath(`/candidatos/${id}/cv`)
  revalidatePath("/")
  return { success: true, id }
}

export async function toggleEstadoCandidato(
  id: string,
  nuevoEstado: "activo" | "inactivo",
): Promise<ActionResult> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from("candidatos")
    .update({ estado: nuevoEstado })
    .eq("id", id)

  if (error) return { success: false, error: error.message }

  revalidatePath("/candidatos")
  revalidatePath(`/candidatos/${id}`)
  return { success: true, id }
}
