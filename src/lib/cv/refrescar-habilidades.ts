import type { createServiceClient } from "@/lib/supabase/service"
import { extraerHabilidadesYResidir, type ResultadoExtraccion } from "./habilidades"

type ServiceClient = ReturnType<typeof createServiceClient>

/**
 * Re-extrae habilidades + residir de un CV y las persiste. Es el punto ÚNICO que
 * conecta el extractor (extraerHabilidadesYResidir) al pipeline vivo — antes solo
 * lo corría el backfill, así que los CVs nuevos nunca se extraían y los completados
 * por WhatsApp no se actualizaban.
 *
 * - `aditivo: false` → primera extracción (ingesta de CV nuevo): escribe lo extraído.
 * - `aditivo: true`  → CV completado por respuestas de WhatsApp: MERGE con lo previo.
 *     · habilidades = UNIÓN (nunca pierde una skill ya detectada; los "no" que
 *       QUITAN una skill son Paso 2 / provenance).
 *     · residir = el nuevo valor si no es "sin_dato"; si es "sin_dato", mantiene el previo.
 *
 * Best-effort: si falla, loguea en webhook_logs (observabilidad — no console.log) y
 * NO tira. No debe romper la ingesta ni el guardado del candidato.
 */
export async function refrescarHabilidadesResidir(
  supabase: ServiceClient,
  candidatoId: string,
  cvTexto: string,
  opts: { aditivo: boolean; emailId?: string },
): Promise<void> {
  try {
    if (!cvTexto.trim()) return
    const r = await extraerHabilidadesYResidir(cvTexto)

    let habilidades = r.habilidades
    let residir: ResultadoExtraccion["residir"] = r.residir
    let zona = r.residir_zona_preferida

    if (opts.aditivo) {
      const { data: actual } = await supabase
        .from("candidatos")
        .select("habilidades, residir, residir_zona_preferida")
        .eq("id", candidatoId)
        .single()
      if (actual) {
        habilidades = Array.from(new Set([...(actual.habilidades ?? []), ...r.habilidades]))
        if (r.residir === "sin_dato") {
          residir = (actual.residir as ResultadoExtraccion["residir"] | null) ?? "sin_dato"
          zona = actual.residir_zona_preferida ?? null
        }
      }
    }

    const { error } = await supabase
      .from("candidatos")
      .update({ habilidades, residir, residir_zona_preferida: zona })
      .eq("id", candidatoId)
    if (error) throw new Error(error.message)
  } catch (err) {
    const detalle = err instanceof Error ? err.message : String(err)
    await supabase.from("webhook_logs").insert({
      email_id: opts.emailId ?? `refrescar-habilidades:${candidatoId}`,
      estado: "failed",
      detalle: `refrescar_habilidades_failed: ${detalle}, candidato_id=${candidatoId}`,
      archivo_nombre: null,
      remitente_email: null,
    })
  }
}
