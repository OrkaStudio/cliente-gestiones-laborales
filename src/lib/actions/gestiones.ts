"use server"

import { revalidatePath, revalidateTag } from "next/cache"
import { createServiceClient } from "@/lib/supabase/service"

export type ActionResult = { success: true; id: string } | { success: false; error: string }

export async function createGestion(data: {
  candidato_id: string
  busqueda_id: string
}): Promise<ActionResult> {
  const supabase = createServiceClient()

  const { data: existing } = await supabase
    .from("gestiones")
    .select("id")
    .eq("candidato_id", data.candidato_id)
    .eq("busqueda_id", data.busqueda_id)
    .maybeSingle()

  if (existing) return { success: false, error: "El candidato ya está en esta búsqueda" }

  const { data: created, error } = await supabase
    .from("gestiones")
    .insert({
      candidato_id: data.candidato_id,
      busqueda_id: data.busqueda_id,
      estado: "preseleccionado",
    })
    .select("id")
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath(`/candidatos/${data.candidato_id}`)
  revalidateTag(`candidato-${data.candidato_id}`, {})
  revalidatePath(`/busquedas/${data.busqueda_id}`)
  revalidateTag(`busqueda-${data.busqueda_id}`, {})
  revalidatePath("/")
  return { success: true, id: created.id }
}

const ESTADOS_VALIDOS = [
  "preseleccionado", "entrevista_orka", "presentado_cliente",
  "entrevista_cliente", "ofertado", "contratado", "descartado",
] as const

export async function updateGestionEstado(
  gestionId: string,
  estado: string,
  paths: { busquedaId: string; candidatoId: string }
): Promise<ActionResult> {
  if (!(ESTADOS_VALIDOS as readonly string[]).includes(estado)) {
    return { success: false, error: "Estado inválido" }
  }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from("gestiones")
    .update({ estado: estado as "preseleccionado" | "entrevista_orka" | "presentado_cliente" | "entrevista_cliente" | "ofertado" | "contratado" | "descartado" })
    .eq("id", gestionId)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/busquedas/${paths.busquedaId}`)
  revalidateTag(`busqueda-${paths.busquedaId}`, {})
  revalidatePath(`/busquedas`)
  revalidatePath(`/candidatos/${paths.candidatoId}`)
  revalidateTag(`candidato-${paths.candidatoId}`, {})
  revalidateTag("candidatos-list", {})
  revalidatePath("/")
  return { success: true, id: gestionId }
}

// Borrar la gestión por completo: saca al candidato de la búsqueda como si nunca
// se hubiera agregado (para los agregados por error). Distinto de "descartado",
// que es un estado del pipeline y se conserva. El candidato sigue en la base.
export async function eliminarGestion(
  gestionId: string,
  paths: { busquedaId: string; candidatoId: string }
): Promise<ActionResult> {
  const supabase = createServiceClient()
  const { error } = await supabase.from("gestiones").delete().eq("id", gestionId)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/busquedas/${paths.busquedaId}`)
  revalidateTag(`busqueda-${paths.busquedaId}`, {})
  revalidatePath(`/busquedas`)
  revalidatePath(`/candidatos/${paths.candidatoId}`)
  revalidateTag(`candidato-${paths.candidatoId}`, {})
  revalidateTag("candidatos-list", {})
  revalidatePath("/")
  return { success: true, id: gestionId }
}
