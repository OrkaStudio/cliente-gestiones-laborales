/**
 * Script interactivo para probar el flujo completo con un candidato real.
 *
 * USO:
 *   node --env-file=.env.local scripts/probar-candidato.mjs
 *
 * El script te guía paso a paso:
 *   1. Muestra los candidatos disponibles
 *   2. Elegís uno
 *   3. Pegás la conversación de WhatsApp (o usás una de prueba)
 *   4. Extrae las respuestas con Haiku
 *   5. Mostrás las respuestas para que las revises
 *   6. Confirmás si guardamos y actualizamos el CV
 *   7. Muestra el CV antes y después
 */

import * as readline from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? ""
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY         ?? ""
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"

if (!SUPABASE_URL || !SERVICE_KEY || !ANTHROPIC_KEY) {
  console.error("Falta alguna variable de entorno. Ejecutá con: node --env-file=.env.local scripts/probar-candidato.mjs")
  process.exit(1)
}

const rl = readline.createInterface({ input, output })

// ── Helpers ──────────────────────────────────────────────────────────────────

async function sbGet(table, params = "") {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${params}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  })
  return res.json()
}

async function sbPatch(table, params, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${params}`, {
    method: "PATCH",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`PATCH ${res.status}: ${await res.text()}`)
}

async function callAnthropic({ model, system, userPrompt, maxTokens = 2048 }) {
  const body = { model, max_tokens: maxTokens, messages: [{ role: "user", content: userPrompt }] }
  if (system) body.system = system
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`)
  return (await res.json()).content[0].text
}

function sep(label = "") {
  console.log(`\n${"─".repeat(62)}`)
  if (label) { console.log(`  ${label}`); console.log("─".repeat(62)) }
}
const bold  = (s) => `\x1b[1m${s}\x1b[0m`
const green = (s) => `\x1b[32m${s}\x1b[0m`
const olive = (s) => `\x1b[33m${s}\x1b[0m`
const dim   = (s) => `\x1b[2m${s}\x1b[0m`
const red   = (s) => `\x1b[31m${s}\x1b[0m`

async function leerConversacion() {
  console.log(`\n  ${bold("Pegá la conversación de WhatsApp.")}`)
  console.log(dim("  (Cuando termines, escribí FIN en una línea sola y presioná Enter)"))
  console.log()

  const lineas = []
  while (true) {
    const linea = await rl.question("  ")
    if (linea.trim().toUpperCase() === "FIN") break
    lineas.push(linea)
  }
  return lineas.join("\n")
}

// ── Paso 1: elegir candidato ──────────────────────────────────────────────────

async function elegirCandidato() {
  sep("PASO 1 — Elegí un candidato")

  const todos = await sbGet(
    "candidatos",
    "?select=id,nombre,apellido,cv_procesado_texto,preguntas_sugeridas,respuestas_candidato&cv_procesado_texto=not.is.null&order=apellido"
  )

  if (!todos.length) {
    console.log(red("  No hay candidatos con CV procesado."))
    process.exit(1)
  }

  console.log()
  todos.forEach((c, i) => {
    const pregs = (c.preguntas_sugeridas ?? []).length
    const resps = Array.isArray(c.respuestas_candidato) ? c.respuestas_candidato.filter(r => r.respuesta?.trim()).length : 0
    const cvLen = (c.cv_procesado_texto ?? "").length
    console.log(
      `  ${bold(String(i + 1).padStart(2))}. ${bold(`${c.nombre} ${c.apellido}`).padEnd(35)}` +
      dim(` CV: ${cvLen} chars | ${pregs} preguntas | ${resps} resp guardadas`)
    )
  })

  console.log()
  const resp = await rl.question(`  Número (1-${todos.length}): `)
  const idx = parseInt(resp.trim()) - 1
  if (isNaN(idx) || idx < 0 || idx >= todos.length) {
    console.log(red("  Número inválido."))
    process.exit(1)
  }

  return todos[idx]
}

// ── Paso 2: mostrar preguntas ─────────────────────────────────────────────────

function mostrarPreguntas(preguntas) {
  sep("PASO 2 — Preguntas que se le enviaron al candidato")
  console.log()
  preguntas.forEach((p, i) => {
    console.log(`  ${olive(`${i + 1}.`)} ${p}`)
  })
}

// ── Paso 3: conversación ──────────────────────────────────────────────────────

async function obtenerConversacion(preguntas) {
  sep("PASO 3 — Conversación de WhatsApp")
  console.log()
  console.log(`  ${bold("Opciones:")}`)
  console.log(`  ${olive("1.")} Pegar la conversación real`)
  console.log(`  ${olive("2.")} Generar una conversación de PRUEBA automáticamente`)
  console.log()
  const opcion = await rl.question("  Opción (1 o 2): ")

  if (opcion.trim() === "2") {
    // Genera respuestas ficticias para cada pregunta
    const conv = preguntas.map((p, i) => {
      const respuestas = [
        "No sé bien, habría que verlo",
        "Sí, tengo experiencia en eso",
        "No tengo eso actualmente",
        "Hace unos 5 años que hago eso",
        "Depende de la propuesta",
      ]
      return `[Oriana]: ${p}\n[Candidato]: ${respuestas[i % respuestas.length]}`
    }).join("\n\n")
    console.log(dim(`\n  Conversación de prueba generada.\n`))
    return conv
  }

  return await leerConversacion()
}

// ── Paso 4: extraer respuestas ────────────────────────────────────────────────

async function extraerRespuestas(preguntas, conversacion) {
  sep("PASO 4 — Extrayendo respuestas con Haiku")
  console.log()
  process.stdout.write("  Procesando")

  const listaPreguntas = preguntas.map((p, i) => `${i + 1}. ${p}`).join("\n")
  const text = await callAnthropic({
    model: "claude-haiku-4-5-20251001",
    maxTokens: 1024,
    userPrompt: `Se le hicieron estas preguntas a un candidato laboral:\n${listaPreguntas}\n\nEsta es la conversación de WhatsApp donde respondió:\n${conversacion}\n\nExtrae la respuesta a cada pregunta. Si no hay respuesta para una pregunta, dejá el campo vacío.\n\nRespondé ÚNICAMENTE con un JSON array con exactamente ${preguntas.length} elementos, en el mismo orden que las preguntas:\n["respuesta 1", "respuesta 2", ...]`,
  })

  console.log(" ✓\n")

  const match = text.match(/\[[\s\S]*\]/)
  if (!match) throw new Error("Haiku no devolvió un JSON array")
  const parsed = JSON.parse(match[0])
  return preguntas.map((_, i) => typeof parsed[i] === "string" ? parsed[i] : "")
}

// ── Paso 5: revisar respuestas ────────────────────────────────────────────────

async function revisarRespuestas(preguntas, respuestas) {
  sep("PASO 5 — Revisá las respuestas extraídas")
  console.log()

  const llenas = respuestas.filter(r => r.trim()).length
  console.log(`  ${green(`${llenas}/${preguntas.length}`)} respuestas extraídas\n`)

  preguntas.forEach((p, i) => {
    const r = respuestas[i]
    const icon = r.trim() ? green("✅") : dim("⬜")
    console.log(`  ${icon} ${olive(`${i+1}.`)} ${dim(p.length > 60 ? p.substring(0, 60) + "…" : p)}`)
    if (r.trim()) console.log(`      ${bold("→")} ${r}`)
    else console.log(`      ${dim("→ (sin respuesta)")}`)
    console.log()
  })

  const continuar = await rl.question("  ¿Guardamos estas respuestas y actualizamos el CV? (s/n): ")
  return continuar.trim().toLowerCase() === "s"
}

// ── Paso 6: guardar y actualizar CV ──────────────────────────────────────────

async function guardarYActualizar(candidatoId, preguntas, respuestas, cvActual) {
  sep("PASO 6 — Guardando respuestas y actualizando CV")

  // Guardar respuestas
  const payload = preguntas.map((p, i) => ({ pregunta: p, respuesta: respuestas[i] ?? "" }))
  process.stdout.write("\n  Guardando respuestas en Supabase")
  await sbPatch("candidatos", `?id=eq.${candidatoId}`, { respuestas_candidato: payload })
  console.log(green(" ✓"))

  // Actualizar CV
  const qaTexto = payload
    .map((r, i) => `${i+1}. Pregunta: ${r.pregunta}\n   Respuesta: ${r.respuesta || "(sin respuesta)"}`)
    .join("\n\n")

  process.stdout.write("  Actualizando CV con Sonnet (puede tardar ~10s)")

  const cvNuevo = await callAnthropic({
    model: "claude-sonnet-4-6",
    maxTokens: 4096,
    system: `Sos asistente de RRHH de una consultora agropecuaria. Dado el CV procesado de un candidato y sus respuestas a preguntas de preselección, actualizá el CV incorporando la información nueva sin inventar datos. Mantenés el formato exacto: secciones en mayúsculas seguidas de separador ═══════════════════════════════════════ (39 signos). No agregues secciones nuevas si el CV no las tiene. Respondé solo con el CV actualizado, sin explicaciones.`,
    userPrompt: `CV actual:\n${cvActual}\n\nRespuestas del candidato a preguntas de preselección:\n${qaTexto}`,
  })

  console.log(green(" ✓"))

  await sbPatch("candidatos", `?id=eq.${candidatoId}`, { cv_procesado_texto: cvNuevo })
  console.log(green("  CV guardado en DB ✓"))

  return cvNuevo
}

// ── Paso 7: mostrar diff ──────────────────────────────────────────────────────

function mostrarDiff(cvAntes, cvDespues) {
  sep("PASO 7 — CV antes vs después")

  const lineasAntes   = cvAntes.split("\n")
  const lineasDespues = cvDespues.split("\n")

  const setAntes = new Set(lineasAntes.map(l => l.trim()).filter(Boolean))

  console.log(`\n  Tamaño: ${cvAntes.length} → ${green(String(cvDespues.length))} chars (+${cvDespues.length - cvAntes.length})`)
  console.log(`\n  ${bold("Líneas nuevas o modificadas:")}`)
  console.log()

  let nuevas = 0
  lineasDespues.forEach(linea => {
    const t = linea.trim()
    if (t && !setAntes.has(t)) {
      console.log(`  ${green("+")} ${linea}`)
      nuevas++
    }
  })

  if (nuevas === 0) {
    console.log(dim("  (No se detectaron líneas nuevas — puede que Sonnet haya reformulado sin agregar)"))
  }

  console.log()
  console.log(`  ${bold("CV completo actualizado:")}\n`)
  console.log(cvDespues.split("\n").map(l => `  ${l}`).join("\n"))
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${bold("🧪  SIMULACIÓN CANDIDATO REAL — Flujo WhatsApp → Respuestas → CV")}`)
  console.log(dim("    Trabaja contra Supabase y Anthropic reales. Los cambios sí se guardan.\n"))

  const candidato = await elegirCandidato()
  const preguntas = candidato.preguntas_sugeridas ?? []

  if (!preguntas.length) {
    console.log(red(`\n  ${candidato.nombre} no tiene preguntas sugeridas. Procesá su CV primero.`))
    rl.close(); process.exit(1)
  }

  mostrarPreguntas(preguntas)

  const conversacion = await obtenerConversacion(preguntas)

  if (!conversacion.trim()) {
    console.log(red("  Conversación vacía — abortando."))
    rl.close(); process.exit(1)
  }

  const respuestas = await extraerRespuestas(preguntas, conversacion)

  const confirmar = await revisarRespuestas(preguntas, respuestas)

  if (!confirmar) {
    console.log(dim("\n  Cancelado. No se guardó nada.\n"))
    rl.close(); process.exit(0)
  }

  const cvNuevo = await guardarYActualizar(
    candidato.id,
    preguntas,
    respuestas,
    candidato.cv_procesado_texto
  )

  mostrarDiff(candidato.cv_procesado_texto, cvNuevo)

  sep()
  console.log(green(`  ✅  Simulación completada para ${candidato.nombre} ${candidato.apellido}`))
  console.log(dim(`      Abrí su perfil en la app para verlo: /candidatos/${candidato.id}`))
  console.log()

  rl.close()
}

main().catch(err => {
  console.error(red(`\n❌ Error: ${err.message}`))
  rl.close()
  process.exit(1)
})
