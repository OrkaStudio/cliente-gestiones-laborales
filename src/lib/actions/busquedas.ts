"use server"

import { revalidatePath } from "next/cache"
import { createServiceClient } from "@/lib/supabase/service"

export type ActionResult = { success: true; id: string } | { success: false; error: string }

type BusquedaData = {
  puesto: string
  cliente: string
  estado?: "activa" | "pausada" | "cerrada"
  ubicacion?: string
  rango_salarial?: string
  descripcion?: string
  requisitos?: string
  fecha_apertura?: string
}

function parseRequisitos(raw?: string): string[] {
  if (!raw) return []
  return raw.split("\n").map((s) => s.trim()).filter(Boolean)
}

function buildPayload(data: BusquedaData) {
  return {
    puesto: data.puesto.trim(),
    cliente: data.cliente.trim(),
    estado: (data.estado ?? "activa") as "activa" | "pausada" | "cerrada",
    ubicacion: data.ubicacion?.trim() || null,
    rango_salarial: data.rango_salarial?.trim() || null,
    descripcion: data.descripcion?.trim() || null,
    requisitos: parseRequisitos(data.requisitos),
    fecha_apertura: data.fecha_apertura?.trim() || new Date().toISOString().split("T")[0],
  }
}

export async function createBusqueda(data: BusquedaData): Promise<ActionResult> {
  const supabase = createServiceClient()
  const { data: created, error } = await supabase
    .from("busquedas")
    .insert(buildPayload(data))
    .select("id")
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath("/busquedas")
  revalidatePath("/")
  return { success: true, id: created.id }
}

export async function updateBusqueda(id: string, data: BusquedaData): Promise<ActionResult> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from("busquedas")
    .update(buildPayload(data))
    .eq("id", id)

  if (error) return { success: false, error: error.message }

  revalidatePath("/busquedas")
  revalidatePath(`/busquedas/${id}`)
  revalidatePath("/")
  return { success: true, id }
}
