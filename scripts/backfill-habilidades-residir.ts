/**
 * Backfill de `habilidades` + `residir` sobre los candidatos ya cargados.
 *
 * Lee cada candidato con CV procesado, extrae con Haiku (extraerHabilidadesYResidir,
 * misma lógica que correrá el pipeline de CVs nuevos) y escribe SOLO las columnas
 * nuevas de la migración 023: habilidades, residir, residir_zona_preferida.
 *
 * NO toca campos_faltantes (columna que usa la app viva) — la integración de residir
 * al loop de WhatsApp se hace en el cutover, no en el backfill (para no alterar lo
 * que Oriana ve hoy).
 *
 * Uso:
 *   pnpm tsx scripts/backfill-habilidades-residir.ts --dry --limit 8   # prueba, no escribe
 *   pnpm tsx scripts/backfill-habilidades-residir.ts                    # corrida real, todos
 *
 * Re-corrible (idempotente: re-escribe el mismo resultado). PII en consola → no logs persistentes.
 */

import { config } from "dotenv"
import { createClient } from "@supabase/supabase-js"
import { extraerHabilidadesYResidir } from "../src/lib/cv/habilidades"

config({ path: ".env.local" })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const DRY = process.argv.includes("--dry")
const limitArg = process.argv.indexOf("--limit")
const LIMIT = limitArg !== -1 ? Number(process.argv[limitArg + 1]) : Infinity

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const { data: candidatos, error } = await supabase
    .from("candidatos")
    .select("id, nombre, apellido, cv_procesado_texto")
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Error leyendo candidatos:", error.message)
    process.exit(1)
  }

  const conCv = (candidatos ?? []).filter((c) => (c.cv_procesado_texto ?? "").trim())
  const total = Math.min(conCv.length, LIMIT)
  console.log(`${DRY ? "[DRY] " : ""}Candidatos con CV: ${conCv.length} · a procesar: ${total}\n`)

  const resumen = { si: 0, no: 0, sin_dato: 0, sinHabilidades: 0, conZona: 0 }
  const histHab: Record<string, number> = {}

  for (let i = 0; i < total; i++) {
    const c = conCv[i]
    const nombre = `${c.nombre} ${c.apellido}`.trim()
    let r: Awaited<ReturnType<typeof extraerHabilidadesYResidir>>
    try {
      r = await extraerHabilidadesYResidir(c.cv_procesado_texto ?? "")
    } catch (err) {
      console.error(`  ✗ ${nombre}: ${err instanceof Error ? err.message : String(err)} — reintento en 5s`)
      await sleep(5000)
      try {
        r = await extraerHabilidadesYResidir(c.cv_procesado_texto ?? "")
      } catch (err2) {
        console.error(`  ✗✗ ${nombre}: falló de nuevo, salteo. ${err2 instanceof Error ? err2.message : String(err2)}`)
        continue
      }
    }

    resumen[r.residir]++
    if (r.habilidades.length === 0) resumen.sinHabilidades++
    if (r.residir_zona_preferida) resumen.conZona++
    for (const h of r.habilidades) histHab[h] = (histHab[h] ?? 0) + 1

    const zonaTxt = r.residir_zona_preferida ? ` · zona: ${r.residir_zona_preferida}` : ""
    console.log(`${String(i + 1).padStart(3)}/${total}  ${nombre}`)
    console.log(`        residir: ${r.residir}${zonaTxt}`)
    console.log(`        habilidades (${r.habilidades.length}): ${r.habilidades.join(", ") || "—"}`)

    if (!DRY) {
      const { error: upErr } = await supabase
        .from("candidatos")
        .update({
          habilidades: r.habilidades,
          residir: r.residir,
          residir_zona_preferida: r.residir_zona_preferida,
        })
        .eq("id", c.id)
      if (upErr) console.error(`        ⚠ no se pudo guardar: ${upErr.message}`)
    }

    await sleep(150) // suave con el rate limit
  }

  console.log("\n──────── Resumen ────────")
  console.log(`residir → si: ${resumen.si} · no: ${resumen.no} · sin_dato: ${resumen.sin_dato} · (con zona: ${resumen.conZona})`)
  console.log(`candidatos sin ninguna habilidad detectada: ${resumen.sinHabilidades}`)
  console.log("\nHabilidades (frecuencia):")
  for (const [h, n] of Object.entries(histHab).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(3)}  ${h}`)
  }
  console.log(DRY ? "\n[DRY] No se escribió nada." : "\n✓ Backfill aplicado.")
}

main()
