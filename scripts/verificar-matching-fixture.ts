/**
 * Verificación local del motor de matching V2 sobre los 195 candidatos reales del
 * fixture, contra la búsqueda demo (Encargado de Ganadería). Sin IA, sin prod.
 *
 * Uso: pnpm tsx scripts/verificar-matching-fixture.ts
 */
import { getCandidatosFixture, BUSQUEDA_DEMO } from "../src/lib/v2/fixture"
import { rankear, evalReq, evalCat } from "../src/lib/v2/matching"

const cands = getCandidatosFixture()
const ranked = rankear(cands, BUSQUEDA_DEMO)

const dist = { green: 0, amber: 0, red: 0 }
for (const r of ranked) dist[r.tier]++

console.log(`Búsqueda: ${BUSQUEDA_DEMO.puesto} · ${BUSQUEDA_DEMO.cliente}`)
console.log(`Candidatos: ${cands.length}`)
console.log(`\nResultado del matching:`)
console.log(`  🟢 Buen match:      ${dist.green}`)
console.log(`  🟡 Falta confirmar: ${dist.amber}`)
console.log(`  🔴 No cumple:       ${dist.red}`)

const tierTxt = { green: "🟢", amber: "🟡", red: "🔴" }
console.log(`\nTop 12 por encaje:`)
for (const r of ranked.slice(0, 12)) {
  console.log(`  ${tierTxt[r.tier]} ${String(r.score.s).padStart(4)}  ${r.c.nombre} ${r.c.apellido}  ·  ${r.c.cats.join(", ") || "sin categoría"}`)
}

// Detalle de los 2 primeros: cómo cae cada requisito
const estTxt = { ok: "✓", no: "✕", sd: "?" }
for (const r of ranked.slice(0, 2)) {
  console.log(`\n── ${r.c.nombre} ${r.c.apellido} (${r.tier}) ──`)
  const ce = evalCat(r.c, BUSQUEDA_DEMO.acceptedCats)
  console.log(`  categoría (obligatorio): ${ce === "ok" ? "✓" : ce === "no" ? "✕" : "?"}  [${r.c.cats.join(", ") || "—"}]`)
  for (const req of BUSQUEDA_DEMO.requisitos) {
    const e = evalReq(r.c, req)
    const desc = req.campo === "hab" ? req.hab : req.campo
    console.log(`  ${desc} (${req.nivel}): ${estTxt[e]}`)
  }
  console.log(`  habilidades: ${r.c.habilidades.join(", ") || "—"}`)
}
