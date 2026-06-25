"use server"

import { revalidatePath, revalidateTag } from "next/cache"
import { createServiceClient } from "@/lib/supabase/service"
import { anthropic } from "@ai-sdk/anthropic"
import { generateText } from "ai"

export type Pareja = {
  id: string
  candidato_a_id: string
  candidato_b_id: string
  principal_id: string | null
  situacion_familiar: string | null
}

export type ParejaCandidatoMini = {
  id: string
  nombre: string
  apellido: string
  estado_civil: string | null
  hijos: string | null
  ubicacion: string | null
  ultimo_puesto: string | null
}

export type ParejaContexto = {
  pareja: Pareja
  a: ParejaCandidatoMini
  b: ParejaCandidatoMini
}

function revalidar(...ids: (string | null | undefined)[]) {
  for (const id of ids) {
    if (!id) continue
    revalidatePath(`/candidatos/${id}`)
    revalidateTag(`candidato-${id}`, {})
  }
}

const MINI = "id, nombre, apellido, estado_civil, hijos, ubicacion, ultimo_puesto"

// Crea (o trae) la fila de pareja para el candidato, usando su pareja_id (mig. 021).
// Par normalizado a<b. Principal por defecto = el candidato desde el que se abre.
export async function getOrCreatePareja(candidatoId: string): Promise<{ ok: true; ctx: ParejaContexto } | { ok: false; error: string }> {
  const supabase = createServiceClient()
  const { data: self } = await supabase.from("candidatos").select("pareja_id").eq("id", candidatoId).single()
  const partnerId = (self as { pareja_id: string | null } | null)?.pareja_id
  if (!partnerId) return { ok: false, error: "El candidato no tiene una pareja vinculada" }

  const [a, b] = [candidatoId, partnerId].sort()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  await sb.from("parejas").upsert(
    { candidato_a_id: a, candidato_b_id: b, principal_id: candidatoId },
    { onConflict: "candidato_a_id,candidato_b_id", ignoreDuplicates: true },
  )
  const { data: pareja } = await sb
    .from("parejas")
    .select("id, candidato_a_id, candidato_b_id, principal_id, situacion_familiar")
    .eq("candidato_a_id", a).eq("candidato_b_id", b).single()

  const { data: cands } = await supabase.from("candidatos").select(MINI).in("id", [a, b])
  const list = (cands ?? []) as unknown as ParejaCandidatoMini[]
  const ca = list.find(c => c.id === a)!
  const cb = list.find(c => c.id === b)!
  return { ok: true, ctx: { pareja: pareja as Pareja, a: ca, b: cb } }
}

export async function setPrincipalPareja(parejaId: string, principalId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("parejas").update({ principal_id: principalId, updated_at: new Date().toISOString() })
    .eq("id", parejaId).select("candidato_a_id, candidato_b_id").single()
  if (error) return { ok: false, error: error.message }
  revalidar(data?.candidato_a_id, data?.candidato_b_id)
  return { ok: true }
}

export async function updateSituacionFamiliar(parejaId: string, texto: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("parejas").update({ situacion_familiar: texto, updated_at: new Date().toISOString() })
    .eq("id", parejaId).select("candidato_a_id, candidato_b_id").single()
  if (error) return { ok: false, error: error.message }
  revalidar(data?.candidato_a_id, data?.candidato_b_id)
  return { ok: true }
}

// Borrador de "Situación Familiar" con IA, desde los datos de ambos candidatos.
export async function generarSituacionFamiliar(parejaId: string): Promise<{ ok: true; texto: string } | { ok: false; error: string }> {
  const supabase = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: p } = await (supabase as any)
    .from("parejas").select("candidato_a_id, candidato_b_id, principal_id").eq("id", parejaId).single()
  if (!p) return { ok: false, error: "Pareja no encontrada" }

  const { data: cands } = await supabase.from("candidatos").select(MINI).in("id", [p.candidato_a_id, p.candidato_b_id])
  const list = (cands ?? []) as unknown as ParejaCandidatoMini[]
  const principal = list.find(c => c.id === p.principal_id) ?? list[0]
  const otro = list.find(c => c.id !== principal.id)!

  const ficha = (c: ParejaCandidatoMini) => `${c.nombre} ${c.apellido} — estado civil: ${c.estado_civil ?? "s/d"}, hijos: ${c.hijos ?? "s/d"}, zona: ${c.ubicacion ?? "s/d"}, último puesto: ${c.ultimo_puesto ?? "s/d"}`

  const { text } = await generateText({
    model: anthropic("claude-haiku-4-5-20251001"),
    prompt: `Sos asistente de Gestiones Laborales, consultora de RRHH agropecuario. Redactá la sección "SITUACIÓN FAMILIAR" del CV unificado de una pareja que se postula para un puesto de casero/matrimonio en el campo.

Principal: ${ficha(principal)}
Pareja: ${ficha(otro)}

Escribí 2-3 oraciones en tercera persona, tono profesional y sobrio, mencionando: que están en pareja (nombrá a ${otro.nombre} ${otro.apellido}), la composición familiar si hay hijos, y que buscan una posición que permita la convivencia familiar en el establecimiento. No inventes datos que no estén arriba (si algo es "s/d", omitilo). Devolvé SOLO el texto, sin títulos ni comillas.`,
  })
  const texto = text.trim()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("parejas").update({ situacion_familiar: texto, updated_at: new Date().toISOString() }).eq("id", parejaId)
  revalidar(p.candidato_a_id, p.candidato_b_id)
  return { ok: true, texto }
}
