"use server"

import { revalidatePath, revalidateTag } from "next/cache"
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
  actitudes?: string
  fecha_apertura?: string
  reporte_directo?: string
  puestos_similares?: string
  personal_a_cargo_min?: string
  idioma_ingles?: string
  edad_minima?: string
  edad_maxima?: string
  nivel_educacion?: string
  disponibilidad_viaje?: string
  estado_civil?: string
  movilidad_requerida?: string
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
    actitudes: parseRequisitos(data.actitudes),
    fecha_apertura: data.fecha_apertura?.trim() || new Date().toISOString().split("T")[0],
    reporte_directo: data.reporte_directo?.trim() || null,
    puestos_similares: data.puestos_similares?.trim() || null,
    personal_a_cargo_min: data.personal_a_cargo_min ? parseInt(data.personal_a_cargo_min, 10) : null,
    idioma_ingles: data.idioma_ingles?.trim() || null,
    edad_minima: data.edad_minima ? parseInt(data.edad_minima, 10) : null,
    edad_maxima: data.edad_maxima ? parseInt(data.edad_maxima, 10) : null,
    nivel_educacion: data.nivel_educacion?.trim() || null,
    disponibilidad_viaje: data.disponibilidad_viaje === "on" ? true : data.disponibilidad_viaje === "false" ? false : null,
    estado_civil: data.estado_civil?.trim() || null,
    movilidad_requerida: data.movilidad_requerida === "on" ? true : data.movilidad_requerida === "false" ? false : null,
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
  const cerrando    = data.estado === "cerrada" && current?.estado !== "cerrada"
  const reabriendo  = data.estado === "activa"  && current?.estado === "cerrada"
  const reactivando = data.estado === "activa"  && current?.estado === "pausada"

  const payload = {
    ...base,
    ...(cerrando    && { fecha_cierre: new Date().toISOString() }),
    ...(reabriendo  && { fecha_cierre: null }),
    ...(reactivando && { fecha_ultimo_activado: new Date().toISOString() }),
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
  revalidateTag(`busqueda-${id}`, {})
  revalidatePath("/")
  return { success: true, id }
}

export async function cerrarBusqueda(
  busquedaId: string,
  gestionIdContratado?: string,
): Promise<ActionResult> {
  const supabase = createServiceClient()

  const { data: busqueda } = await supabase
    .from("busquedas")
    .select("puesto, cliente")
    .eq("id", busquedaId)
    .single()

  // Si se indicó un candidato, marcarlo contratado + inactivarlo
  if (gestionIdContratado) {
    const { data: gestion } = await supabase
      .from("gestiones")
      .select("candidato_id")
      .eq("id", gestionIdContratado)
      .single()

    await supabase.from("gestiones").update({ estado: "contratado" }).eq("id", gestionIdContratado)

    if (gestion?.candidato_id) {
      await supabase.from("candidatos").update({ estado: "inactivo" }).eq("id", gestion.candidato_id)
    }
  }

  const { error } = await supabase
    .from("busquedas")
    .update({ estado: "cerrada", fecha_cierre: new Date().toISOString() })
    .eq("id", busquedaId)

  if (error) return { success: false, error: error.message }

  await supabase.from("notificaciones").insert({
    tipo: "garantia" as const,
    titulo: `Garantía iniciada — ${busqueda?.puesto ?? ""}`,
    cuerpo: `${busqueda?.cliente ?? ""} · Vence en 90 días`,
    busqueda_id: busquedaId,
  })

  revalidatePath("/busquedas")
  revalidatePath(`/busquedas/${busquedaId}`)
  revalidateTag(`busqueda-${busquedaId}`, {})
  revalidatePath("/candidatos")
  revalidateTag("candidatos-list", {})
  revalidatePath("/")
  return { success: true, id: busquedaId }
}

export async function updateBusquedaNotas(
  id: string,
  notas: string | null,
): Promise<ActionResult> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from("busquedas")
    .update({ notas_internas: notas })
    .eq("id", id)
  if (error) return { success: false, error: error.message }
  revalidateTag(`busqueda-${id}`, {})
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
  revalidateTag(`busqueda-${id}`, {})
  revalidatePath("/")
  return { success: true, id }
}
