"use server"

import { revalidatePath } from "next/cache"
import { createServiceClient } from "@/lib/supabase/service"
import type { CVParseado } from "@/lib/cv/parse"

function toISO(s: string | null | undefined): string | null {
  if (!s) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const mmyyyy = s.match(/^(\d{1,2})\/(\d{4})$/)
  if (mmyyyy) return `${mmyyyy[2]}-${mmyyyy[1].padStart(2, "0")}-01`
  if (/^\d{4}-\d{2}$/.test(s)) return `${s}-01`
  if (/^\d{4}$/.test(s)) return `${s}-01-01`
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d.toISOString().split("T")[0]
}

export async function guardarCandidatoProcesado(data: CVParseado): Promise<ActionResult> {
  const supabase = createServiceClient()

  // Upsert: primero por email, luego por nombre+apellido
  let candidatoId: string | null = null
  if (data.email) {
    const { data: ex } = await supabase
      .from("candidatos").select("id").eq("email", data.email).maybeSingle()
    if (ex) candidatoId = ex.id
  }
  if (!candidatoId) {
    const { data: ex } = await supabase
      .from("candidatos").select("id")
      .ilike("nombre", data.nombre).ilike("apellido", data.apellido).maybeSingle()
    if (ex) candidatoId = ex.id
  }

  const payload = {
    nombre:               data.nombre,
    apellido:             data.apellido,
    email:                data.email             ?? null,
    telefono:             data.telefono           ?? null,
    fecha_nacimiento:     toISO(data.fecha_nacimiento),
    ubicacion:            data.ubicacion          ?? null,
    educacion:            data.educacion          ?? null,
    pretension_salarial:  data.pretension_salarial ?? null,
    disponibilidad:       data.disponibilidad     ?? null,
    movilidad:            data.movilidad          ?? null,
    tipos_ganaderia:      data.tipos_ganaderia,
    hectareas_max:        data.hectareas_max      ?? null,
    personal_a_cargo_max: data.personal_a_cargo_max ?? null,
    ultimo_puesto:        data.ultimo_puesto      ?? null,
    idiomas:              data.idiomas,
    cv_procesado_texto:   data.cv_procesado_texto,
    preguntas_sugeridas:  data.preguntas_sugeridas,
    notas_recruiter:      data.campos_faltantes.length > 0
      ? `Campos no encontrados en el CV: ${data.campos_faltantes.join(", ")}`
      : null,
  }

  let id: string
  if (candidatoId) {
    const { data: updated, error } = await supabase
      .from("candidatos").update(payload).eq("id", candidatoId).select("id").single()
    if (error) return { success: false, error: error.message }
    id = updated.id
  } else {
    const { data: created, error } = await supabase
      .from("candidatos").insert(payload).select("id").single()
    if (error) return { success: false, error: error.message }
    id = created.id
  }

  // Reemplazar experiencia laboral
  await supabase.from("experiencia_laboral").delete().eq("candidato_id", id)
  if (data.experiencia.length > 0) {
    const { error: expErr } = await supabase.from("experiencia_laboral").insert(
      data.experiencia.map((exp, idx) => ({
        candidato_id: id,
        empresa:      exp.empresa,
        rol:          exp.rol,
        desde:        toISO(exp.desde) ?? `${new Date().getFullYear()}-01-01`,
        hasta:        toISO(exp.hasta),
        descripcion:  exp.descripcion ?? null,
        orden:        idx,
      }))
    )
    if (expErr) return { success: false, error: expErr.message }
  }

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
