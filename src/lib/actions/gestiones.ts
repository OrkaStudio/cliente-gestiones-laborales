"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export type ActionResult = { success: true; id: string } | { success: false; error: string }

export async function createGestion(data: {
  candidato_id: string
  busqueda_id: string
}): Promise<ActionResult> {
  const supabase = await createClient()

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
  revalidatePath(`/busquedas/${data.busqueda_id}`)
  revalidatePath("/")
  return { success: true, id: created.id }
}
