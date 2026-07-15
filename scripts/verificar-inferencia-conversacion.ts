/**
 * Verificación READ-ONLY del Slice 1 (Spec A): corre inferirUpdatesDesdeConversacion
 * sobre la conversación real de un candidato y muestra las propuestas. NO escribe.
 * Éxito = propone Grupo Pampa Agro → Hectáreas ≈ 13000 desde la conversación de Franco.
 *
 * Uso: pnpm tsx scripts/verificar-inferencia-conversacion.ts [candidatoId]
 */

import { createClient } from "@supabase/supabase-js"
import { config } from "dotenv"
import { inferirUpdatesDesdeConversacion } from "../src/lib/cv/inferir-updates-conversacion"

config({ path: ".env.local" })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)
const CANDIDATO = process.argv[2] ?? "efad7d78-51eb-4245-8b61-050858199a8f" // Franco por defecto

async function main() {
  const { data: c } = await supabase
    .from("candidatos")
    .select("nombre, apellido, conversaciones_historial")
    .eq("id", CANDIDATO)
    .single()
  // biome-ignore lint/suspicious/noExplicitAny: jsonb
  const convs = (Array.isArray(c?.conversaciones_historial) ? c!.conversaciones_historial : []) as any[]
  const texto = convs.map((x) => x.texto).join("\n\n---\n\n")

  console.log(`Candidato: ${c?.nombre} ${c?.apellido} · ${convs.length} conversación(es)\n`)
  const r = await inferirUpdatesDesdeConversacion(supabase, CANDIDATO, texto)

  console.log(`── PROPUESTAS (${r.propuestas.length}) ──`)
  for (const p of r.propuestas) {
    console.log(`  • ${p.destino}${p.conflicto ? "  ⚠ CONFLICTO" : ""}`)
    console.log(`      ${p.valorActual}  →  ${p.valorPropuesto}`)
    console.log(`      cita: "${p.cita.slice(0, 120)}"`)
    console.log(`      campo: ${p.campo}`)
  }
  console.log(`\n── SIN CAMPO (${r.sinCampo.length}) ──`)
  for (const s of r.sinCampo) {
    console.log(`  • ${s.dato}`)
    console.log(`      cita: "${s.cita.slice(0, 120)}"`)
  }
}

main()
