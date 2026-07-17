"use server"

import { revalidatePath, revalidateTag } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { type CriteriosV2, espejosDe, parseCriterios } from "@/lib/v2/criterios"

export type CriteriosResult = { success: true } | { success: false; error: string }

/**
 * Guarda los criterios de matching de una búsqueda (Obligatorio/Deseable + habilidades +
 * categorías). A partir de acá la búsqueda deja de "adivinar" sus requisitos: manda esto.
 *
 * Espeja `categorias_aceptadas` y `habilidades_req` en sus columnas para poder filtrar por
 * SQL más adelante sin abrir el jsonb.
 */
export async function guardarCriterios(
  busquedaId: string,
  criterios: CriteriosV2,
): Promise<CriteriosResult> {
  // La página se lee con un cliente autenticado, pero las actions escriben con service
  // client (patrón del repo — RLS bloquea las escrituras del rol anon). Igual exigimos
  // sesión: sin usuario, no se escribe.
  const auth = await createClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) return { success: false, error: "No autenticado" }

  // Revalidamos el shape acá también: el cliente puede mandar cualquier cosa.
  const limpio = parseCriterios(criterios)
  if (!limpio) return { success: false, error: "Criterios inválidos" }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from("busquedas")
    .update({ criterios: limpio, ...espejosDe(limpio) })
    .eq("id", busquedaId)

  if (error) return { success: false, error: error.message }

  // La búsqueda se sirve desde unstable_cache (revalidate 120s): sin esto, la recruiter
  // guarda los criterios y sigue viendo los viejos hasta 2 minutos.
  revalidateTag(`busqueda-${busquedaId}`, {})
  revalidatePath(`/busquedas/${busquedaId}`)

  return { success: true }
}
