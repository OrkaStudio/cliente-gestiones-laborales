/**
 * Verificación local (sin IA, sin prod) de la derivación de habilidades por pistas
 * sobre los datos reales del fixture (.fixtures/candidatos.json).
 *
 * Uso: pnpm tsx scripts/verificar-habilidades-fixture.ts
 */
import { readFileSync } from "node:fs"
import { HABILIDADES_GL, derivarHabilidadesPorPistas } from "../src/lib/cv/habilidades"

type Cand = { nombre: string; apellido: string; cv_procesado_texto: string | null }
const candidatos: Cand[] = JSON.parse(readFileSync(".fixtures/candidatos.json", "utf8"))

const conCv = candidatos.filter((c) => (c.cv_procesado_texto ?? "").trim())
const hist: Record<string, number> = {}
let sinNinguna = 0
const totalHabPorCand: number[] = []

for (const c of conCv) {
  const habs = derivarHabilidadesPorPistas(c.cv_procesado_texto ?? "")
  if (habs.length === 0) sinNinguna++
  totalHabPorCand.push(habs.length)
  for (const h of habs) hist[h] = (hist[h] ?? 0) + 1
}

console.log(`Candidatos con CV: ${conCv.length} / ${candidatos.length}`)
console.log(`Sin ninguna habilidad detectada: ${sinNinguna}`)
console.log(`Promedio de habilidades por candidato: ${(totalHabPorCand.reduce((a, b) => a + b, 0) / conCv.length).toFixed(1)}`)
console.log(`\nDistribución sobre el vocabulario (${HABILIDADES_GL.length} ítems):`)
for (const h of HABILIDADES_GL) {
  const n = hist[h] ?? 0
  const pct = ((n / conCv.length) * 100).toFixed(0)
  console.log(`  ${String(n).padStart(3)}  (${pct.padStart(3)}%)  ${h}`)
}
