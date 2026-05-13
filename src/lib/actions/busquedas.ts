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

  // Fetch estado actual para detectar transición a cerrada
  const { data: current } = await supabase
    .from("busquedas")
    .select("estado, puesto, cliente")
    .eq("id", id)
    .single()

  const base = buildPayload(data)
  const cerrando   = data.estado === "cerrada" && current?.estado !== "cerrada"
  const reabriendo = data.estado === "activa"  && current?.estado === "cerrada"

  const payload = {
    ...base,
    ...(cerrando   && { fecha_cierre: new Date().toISOString() }),
    ...(reabriendo && { fecha_cierre: null }),
  }

  const { error } = await supabase.from("busquedas").update(payload).eq("id", id)
  if (error) return { success: false, error: error.message }

  // Al cerrar: crear notificación de garantía
  if (cerrando) {
    await supabase.from("notificaciones").insert({
      tipo: "garantia" as const,
      titulo: `Garantía iniciada — ${current?.puesto ?? data.puesto}`,
      cuerpo: `${current?.cliente ?? data.cliente} · Vence en 90 días`,
      busqueda_id: id,
    })
  }

  revalidatePath("/busquedas")
  revalidatePath(`/busquedas/${id}`)
  revalidatePath("/")
  return { success: true, id }
}

export async function cerrarGarantia(
  id: string,
  decision: "exitosa" | "reabrir" | "pausar",
  notas: string,
): Promise<ActionResult> {
  const supabase = createServiceClient()

  const nuevoEstado =
    decision === "exitosa" ? "archivada" : decision === "reabrir" ? "activa" : "pausada"

  const updatePayload = {
    estado: nuevoEstado as "activa" | "pausada" | "archivada",
    notas_cierre: notas.trim() || null,
    ...(decision === "reabrir" && { fecha_cierre: null }),
  }

  const { error } = await supabase.from("busquedas").update(updatePayload).eq("id", id)
  if (error) return { success: false, error: error.message }

  // Marcar notificación de garantía como leída
  await supabase
    .from("notificaciones")
    .update({ leida: true })
    .eq("busqueda_id", id)
    .eq("tipo", "garantia")

  revalidatePath("/busquedas")
  revalidatePath(`/busquedas/${id}`)
  revalidatePath("/")
  return { success: true, id }
}
