/**
 * Verifica la lógica de merge aditivo del wiring de habilidades (Paso 1) SIN escribir.
 * Toma 2 candidatos reales, corre el extractor sobre su CV y calcula qué escribiría
 * `refrescarHabilidadesResidir` con `aditivo: true` — mostrando que la unión nunca
 * pierde una skill previa. Read-only. Uso: pnpm tsx scripts/verificar-merge-aditivo.ts
 */

import { createClient } from "@supabase/supabase-js"
import { config } from "dotenv"
import { extraerHabilidadesYResidir } from "../src/lib/cv/habilidades"

config({ path: ".env.local" })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function main() {
  const { data } = await supabase
    .from("candidatos")
    .select("id, nombre, apellido, cv_procesado_texto, habilidades, residir")
    .not("cv_procesado_texto", "is", null)
    .limit(2)

  for (const c of data ?? []) {
    const previas: string[] = c.habilidades ?? []
    const r = await extraerHabilidadesYResidir(c.cv_procesado_texto ?? "")
    // Misma regla que refrescarHabilidadesResidir(aditivo:true):
    const union = Array.from(new Set([...previas, ...r.habilidades]))
    const perdidas = previas.filter((h) => !union.includes(h))

    console.log("─".repeat(70))
    console.log(`${c.nombre} ${c.apellido}`)
    console.log(`  previas (${previas.length}): ${previas.join(" · ") || "—"}`)
    console.log(`  extraídas ahora (${r.habilidades.length}): ${r.habilidades.join(" · ") || "—"}`)
    console.log(`  UNIÓN (${union.length}): ${union.join(" · ")}`)
    console.log(`  ¿perdió alguna previa?: ${perdidas.length ? "⚠ " + perdidas.join(", ") : "no ✓"}`)
  }
}

main()
