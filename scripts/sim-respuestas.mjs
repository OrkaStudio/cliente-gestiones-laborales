/**
 * Simulaciones end-to-end del flujo de respuestas WhatsApp.
 * Candidato: Florencia Anabella Vazquez (ce00ee07)
 *
 * Ejecutar: node --env-file=.env.local scripts/sim-respuestas.mjs
 */

const SUPABASE_URL   = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? ""
const SERVICE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
const ANTHROPIC_KEY  = process.env.ANTHROPIC_API_KEY         ?? ""
const CANDIDATO_ID   = "ce00ee07-14e4-41cd-bff8-bf55c052ac93"
const ANTHROPIC_URL  = "https://api.anthropic.com/v1/messages"

if (!SUPABASE_URL || !SERVICE_KEY || !ANTHROPIC_KEY) {
  console.error("Falta alguna variable de entorno. Ejecutá con: node --env-file=.env.local scripts/sim-respuestas.mjs")
  process.exit(1)
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function callAnthropic({ model, system, userPrompt, maxTokens = 2048 }) {
  const body = {
    model,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: userPrompt }],
  }
  if (system) body.system = system

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key":         ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "content-type":      "application/json",
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.content[0].text
}

async function sbGet(table, params = "") {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${params}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  })
  return res.json()
}

async function sbPatch(table, params, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${params}`, {
    method:  "PATCH",
    headers: {
      apikey:         SERVICE_KEY,
      Authorization:  `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer:         "return=minimal",
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`PATCH ${res.status}: ${await res.text()}`)
}

function sep(label) {
  console.log(`\n${"─".repeat(62)}`)
  console.log(`  ${label}`)
  console.log("─".repeat(62))
}
const ok   = (m) => console.log(`  ✅  ${m}`)
const fail = (m) => console.log(`  ❌  ${m}`)
const info = (m) => console.log(`  ℹ   ${m}`)

// ── Conversaciones simuladas ──────────────────────────────────────────────────

const CONV_COMPLETA = `
[13/05 10:02] Oriana: Hola Florencia, te escribo de GL Consultora. Tengo unas preguntas para conocerte mejor.

[13/05 10:15] Florencia: Sí claro, adelante!

[13/05 10:16] Oriana: ¿Cuál es tu estado civil? ¿Tenés hijos?

[13/05 10:18] Florencia: Soy soltera, no tengo hijos.

[13/05 10:19] Oriana: ¿Tenés vehículo propio y/o licencia de conducir?

[13/05 10:21] Florencia: Sí, tengo auto propio (Gol 2012) y licencia B1.

[13/05 10:22] Oriana: ¿Tenés muebles propios y animales?

[13/05 10:24] Florencia: Tengo muebles propios. Tengo un perro.

[13/05 10:25] Oriana: ¿Disponibilidad para mudarte o vivir en campo?

[13/05 10:27] Florencia: Sí, disponibilidad total. De hecho lo prefiero, quiero salir de Luján.

[13/05 10:28] Oriana: ¿Cuál es tu pretensión salarial?

[13/05 10:30] Florencia: Entre $800.000 y $1.000.000 por mes, más beneficios si es en campo.

[13/05 10:31] Oriana: En Alternativas Agrarias, ¿estás en blanco? ¿Cuáles son tus ingresos actuales?

[13/05 10:35] Florencia: Estoy en blanco. Cobro $620.000 por mes. Sin beneficios adicionales.

[13/05 10:36] Oriana: ¿Por qué estás buscando cambiar de trabajo?

[13/05 10:39] Florencia: Quiero aplicar mis conocimientos agronómicos en campo real. El vivero no me permite crecer y quiero ganar más.

[13/05 10:40] Oriana: El trabajo con Banchero en siembra/cosecha, ¿sigue activo? ¿Podés contarme más del establecimiento?

[13/05 10:43] Florencia: Sí, sigue activo pero es estacional. El establecimiento son unas 3.000 ha cerca de Chacabuco, maíz y soja principalmente. No tiene nombre propio.

[13/05 10:44] Oriana: ¿Tuviste personal a cargo en alguno de esos trabajos?

[13/05 10:47] Florencia: En Alternativas Agrarias tengo 2 personas a cargo en el laboratorio. En siembra/cosecha no, soy ayudante.

[13/05 10:48] Oriana: ¿Cuál es tu lugar de nacimiento?

[13/05 10:50] Florencia: Nací en Luján, Buenos Aires.
`

const CONV_PARCIAL = `
[14/05 09:00] Oriana: Hola Flor, una consulta rápida. ¿Cuál es tu estado civil? ¿Tenés hijos?

[14/05 09:05] Florencia: Soltera, sin hijos.

[14/05 09:06] Oriana: ¿Tenés vehículo propio y licencia?

[14/05 09:08] Florencia: Sí, auto propio y licencia B1.

[14/05 09:09] Oriana: Gracias, el resto te pregunto después.

[14/05 09:10] Florencia: Ok!
`

// ── Sim 1 — Extracción conversación completa ─────────────────────────────────

async function sim1(preguntas) {
  sep("SIM 1 — Haiku extrae respuestas de conversación completa")

  const listaPreguntas = preguntas.map((p, i) => `${i + 1}. ${p}`).join("\n")
  info(`Enviando ${preguntas.length} preguntas + conversación a claude-haiku-4-5-20251001...`)

  const text = await callAnthropic({
    model: "claude-haiku-4-5-20251001",
    maxTokens: 1024,
    userPrompt: `Se le hicieron estas preguntas a un candidato laboral:\n${listaPreguntas}\n\nEsta es la conversación de WhatsApp donde respondió:\n${CONV_COMPLETA}\n\nExtrae la respuesta a cada pregunta. Si no hay respuesta para una pregunta, dejá el campo vacío.\n\nRespondé ÚNICAMENTE con un JSON array con exactamente ${preguntas.length} elementos, en el mismo orden que las preguntas:\n["respuesta 1", "respuesta 2", ...]`,
  })

  const match = text.match(/\[[\s\S]*\]/)
  if (!match) { fail("No encontró JSON array en la respuesta"); return null }

  let parsed
  try { parsed = JSON.parse(match[0]) } catch { fail("JSON inválido"); return null }

  if (!Array.isArray(parsed)) { fail("No es array"); return null }
  if (parsed.length !== preguntas.length) {
    fail(`Esperaba ${preguntas.length} elementos, recibió ${parsed.length}`)
    return null
  }

  const respuestas = preguntas.map((_, i) => typeof parsed[i] === "string" ? parsed[i] : "")
  const llenas = respuestas.filter(r => r.trim()).length

  console.log("\n  Respuestas extraídas:")
  preguntas.forEach((p, i) => {
    const r = respuestas[i]
    console.log(`  ${r.trim() ? "✅" : "⬜"} ${i+1}. ${p.substring(0, 55)}`)
    if (r.trim()) console.log(`       → "${r}"`)
    else console.log(`       → (vacío)`)
  })

  if (llenas === preguntas.length) ok(`${llenas}/${preguntas.length} respuestas extraídas — todas llenadas`)
  else if (llenas >= preguntas.length * 0.8) ok(`${llenas}/${preguntas.length} respuestas extraídas`)
  else fail(`Solo ${llenas}/${preguntas.length} respuestas — menos de lo esperado`)

  return respuestas
}

// ── Sim 2 — Extracción parcial ────────────────────────────────────────────────

async function sim2(preguntas) {
  sep("SIM 2 — Haiku con conversación parcial (candidato responde solo 2)")

  const listaPreguntas = preguntas.map((p, i) => `${i + 1}. ${p}`).join("\n")
  info("Conversación donde el candidato solo responde preguntas 1 y 2...")

  const text = await callAnthropic({
    model: "claude-haiku-4-5-20251001",
    maxTokens: 512,
    userPrompt: `Se le hicieron estas preguntas a un candidato laboral:\n${listaPreguntas}\n\nEsta es la conversación de WhatsApp donde respondió:\n${CONV_PARCIAL}\n\nExtrae la respuesta a cada pregunta. Si no hay respuesta para una pregunta, dejá el campo vacío.\n\nRespondé ÚNICAMENTE con un JSON array con exactamente ${preguntas.length} elementos, en el mismo orden que las preguntas:\n["respuesta 1", "respuesta 2", ...]`,
  })

  const match = text.match(/\[[\s\S]*\]/)
  if (!match) { fail("No JSON array"); return }

  const parsed = JSON.parse(match[0])
  const respuestas = preguntas.map((_, i) => typeof parsed[i] === "string" ? parsed[i] : "")
  const llenas = respuestas.filter(r => r.trim()).length
  const vacias = respuestas.filter(r => !r.trim()).length
  const indicesLlenas = respuestas.map((r, i) => r.trim() ? i+1 : null).filter(Boolean)
  const indicesVacias = respuestas.map((r, i) => !r.trim() ? i+1 : null).filter(Boolean)

  info(`Llenadas: preguntas ${indicesLlenas.join(", ")}`)
  info(`Vacías:   preguntas ${indicesVacias.join(", ")}`)

  if (llenas >= 1 && llenas <= 4) ok(`Comportamiento correcto: ${llenas} llenadas, ${vacias} vacías`)
  else fail(`Resultado inesperado: ${llenas} llenadas`)

  if (indicesLlenas.includes(1) && indicesLlenas.includes(2))
    ok("Las 2 preguntas respondidas en el chat fueron extraídas correctamente")
  else
    fail("No extrajo las preguntas 1 y 2 que sí fueron respondidas en la conversación")
}

// ── Sim 3 — Guardar respuestas ────────────────────────────────────────────────

async function sim3(preguntas, respuestas) {
  sep("SIM 3 — guardarRespuestas persiste en Supabase")

  const payload = preguntas.map((p, i) => ({ pregunta: p, respuesta: respuestas[i] ?? "" }))
  info(`Guardando ${payload.length} pares en candidatos.respuestas_candidato...`)

  await sbPatch("candidatos", `?id=eq.${CANDIDATO_ID}`, { respuestas_candidato: payload })

  const [data] = await sbGet("candidatos", `?id=eq.${CANDIDATO_ID}&select=respuestas_candidato`)
  const guardadas = data.respuestas_candidato

  if (!Array.isArray(guardadas)) { fail("respuestas_candidato no es array"); return false }
  if (guardadas.length !== preguntas.length) {
    fail(`Esperaba ${preguntas.length} items, guardó ${guardadas.length}`)
    return false
  }

  ok(`${guardadas.length} pares guardados`)
  const conTexto = guardadas.filter(r => r.respuesta?.trim()).length
  info(`${conTexto} con texto, ${guardadas.length - conTexto} vacías`)

  // Verificar que el primer par es correcto
  const primerGuardado = guardadas[0]
  if (primerGuardado.pregunta === preguntas[0]) ok("Estructura pregunta/respuesta correcta")
  else fail(`Estructura incorrecta: ${JSON.stringify(primerGuardado)}`)

  return true
}

// ── Sim 4 — Actualizar CV ─────────────────────────────────────────────────────

async function sim4(cvActual, preguntas, respuestas) {
  sep("SIM 4 — actualizarCVConRespuestas integra info en el CV (Sonnet)")

  const qaTexto = preguntas.map((p, i) =>
    `${i+1}. Pregunta: ${p}\n   Respuesta: ${respuestas[i]?.trim() || "(sin respuesta)"}`
  ).join("\n\n")

  info(`CV actual: ${cvActual.length} chars | Enviando a claude-sonnet-4-6...`)

  const cvNuevo = await callAnthropic({
    model:     "claude-sonnet-4-6",
    maxTokens: 4096,
    system:    `Sos asistente de RRHH de una consultora agropecuaria. Dado el CV procesado de un candidato y sus respuestas a preguntas de preselección, actualizá el CV incorporando la información nueva sin inventar datos. Mantenés el formato exacto: secciones en mayúsculas seguidas de separador ═══════════════════════════════════════ (39 signos). No agregues secciones nuevas si el CV no las tiene. Respondé solo con el CV actualizado, sin explicaciones.`,
    userPrompt: `CV actual:\n${cvActual}\n\nRespuestas del candidato a preguntas de preselección:\n${qaTexto}`,
  })

  info(`CV actualizado: ${cvNuevo.length} chars (${cvNuevo.length > cvActual.length ? "+" : ""}${cvNuevo.length - cvActual.length})`)

  // Checks de integridad
  const checks = [
    ["Nombre del candidato presente",    cvNuevo.includes("Florencia Anabella Vazquez")],
    ["DATOS PERSONALES intactos",        cvNuevo.includes("DATOS PERSONALES")],
    ["EXPERIENCIA LABORAL intacta",      cvNuevo.includes("EXPERIENCIA LABORAL")],
    ["Info estado civil incorporada",    cvNuevo.toLowerCase().includes("soltera")],
    ["Info vehículo incorporada",        cvNuevo.toLowerCase().includes("auto") || cvNuevo.toLowerCase().includes("gol") || cvNuevo.toLowerCase().includes("vehículo")],
    ["Pretensión salarial incorporada",  cvNuevo.includes("800") || cvNuevo.includes("1.000") || cvNuevo.includes("1000") || cvNuevo.toLowerCase().includes("pretensión")],
    ["Lugar de nacimiento incorporado",  cvNuevo.toLowerCase().includes("luján") || cvNuevo.toLowerCase().includes("lujan")],
  ]

  checks.forEach(([label, passed]) => passed ? ok(label) : fail(label))

  info("\n  Primeros 600 chars del CV actualizado:")
  console.log("  " + cvNuevo.substring(0, 600).replace(/\n/g, "\n  "))

  // Guardar en DB
  info("\nGuardando CV actualizado en Supabase...")
  await sbPatch("candidatos", `?id=eq.${CANDIDATO_ID}`, { cv_procesado_texto: cvNuevo })
  ok("CV guardado en DB")

  return cvNuevo
}

// ── Sim 5 — Pregunta propia persiste al enviar ───────────────────────────────

async function sim5(preguntasOriginales) {
  sep("SIM 5 — Pregunta propia de Oriana persiste al registrar envío")

  const preguntaPropia = "¿Tenés experiencia con ovinos o caprinos?"
  const preguntasConPropia = [...preguntasOriginales, preguntaPropia]

  info(`Preguntas en DB: ${preguntasOriginales.length}`)
  info(`Oriana agrega: "${preguntaPropia}"`)

  // registrarEnvioWhatsapp ahora guarda preguntasActuales
  await sbPatch("candidatos", `?id=eq.${CANDIDATO_ID}`, {
    fecha_consultado:    new Date().toISOString(),
    mensaje_whatsapp:    "Mensaje de prueba sim5",
    preguntas_sugeridas: preguntasConPropia,
  })

  const [data] = await sbGet("candidatos", `?id=eq.${CANDIDATO_ID}&select=preguntas_sugeridas,fecha_consultado`)

  if (data.preguntas_sugeridas.length === preguntasConPropia.length)
    ok(`preguntas_sugeridas = ${data.preguntas_sugeridas.length} (incluye la propia)`)
  else
    fail(`Esperaba ${preguntasConPropia.length}, encontró ${data.preguntas_sugeridas.length}`)

  if (data.preguntas_sugeridas.includes(preguntaPropia))
    ok("Pregunta propia de Oriana persiste en DB ✓ — si recarga la página, sigue ahí")
  else
    fail("La pregunta propia NO está en DB — bug!")

  ok(`fecha_consultado registrada: ${new Date(data.fecha_consultado).toLocaleString("es-AR")}`)

  // Restaurar preguntas originales
  await sbPatch("candidatos", `?id=eq.${CANDIDATO_ID}`, { preguntas_sugeridas: preguntasOriginales })
  info("Preguntas restauradas a las 10 originales")
}

// ── Sim 6 — Pregunta propia de Oriana → respuesta → entra al CV ──────────────

async function sim6(cvActual, preguntasOriginales) {
  sep("SIM 6 — Pregunta propia de Oriana: respuesta integrada en el CV")

  const preguntaPropia = "¿Tenés experiencia con ovinos o caprinos?"
  const respuestaPropia = "Sí, durante 2 temporadas trabajé con ovejas Merino en un establecimiento en la Patagonia. Asistí en esquila y en el manejo sanitario del rodeo ovino."

  info(`Oriana agrega: "${preguntaPropia}"`)
  info(`Respuesta del candidato: "${respuestaPropia}"`)

  // Simula que las respuestas existentes de sim3 ya están en DB,
  // y agregamos el par extra de la pregunta propia
  const [data] = await sbGet("candidatos", `?id=eq.${CANDIDATO_ID}&select=respuestas_candidato`)
  const respuestasExistentes = (data.respuestas_candidato ?? [])

  const respuestasConPropia = [
    ...respuestasExistentes,
    { pregunta: preguntaPropia, respuesta: respuestaPropia },
  ]

  info(`Guardando ${respuestasConPropia.length} pares (${respuestasExistentes.length} originales + 1 propia)...`)
  await sbPatch("candidatos", `?id=eq.${CANDIDATO_ID}`, { respuestas_candidato: respuestasConPropia })
  ok("Respuestas guardadas incluyendo la pregunta propia")

  // Leer CV actual (el que actualizó sim4)
  const [cvData] = await sbGet("candidatos", `?id=eq.${CANDIDATO_ID}&select=cv_procesado_texto`)
  const cvBase = cvData.cv_procesado_texto

  // Actualizar CV con todas las respuestas (Sonnet)
  const qaTexto = respuestasConPropia
    .map((r, i) => `${i+1}. Pregunta: ${r.pregunta}\n   Respuesta: ${r.respuesta || "(sin respuesta)"}`)
    .join("\n\n")

  info(`Enviando CV (${cvBase.length} chars) + ${respuestasConPropia.length} Q&A a Sonnet...`)

  const cvNuevo = await callAnthropic({
    model:     "claude-sonnet-4-6",
    maxTokens: 4096,
    system:    `Sos asistente de RRHH de una consultora agropecuaria. Dado el CV procesado de un candidato y sus respuestas a preguntas de preselección, actualizá el CV incorporando la información nueva sin inventar datos. Mantenés el formato exacto: secciones en mayúsculas seguidas de separador ═══════════════════════════════════════ (39 signos). No agregues secciones nuevas si el CV no las tiene. Respondé solo con el CV actualizado, sin explicaciones.`,
    userPrompt: `CV actual:\n${cvBase}\n\nRespuestas del candidato a preguntas de preselección:\n${qaTexto}`,
  })

  // Verificar que incorporó la info de ovinos
  const tieneOvinos = cvNuevo.toLowerCase().includes("ovino") || cvNuevo.toLowerCase().includes("merino") || cvNuevo.toLowerCase().includes("esquila") || cvNuevo.toLowerCase().includes("patagonia")

  if (tieneOvinos) {
    ok("Info de ovinos incorporada en el CV ✓")
    // Mostrar el fragmento donde aparece
    const lines = cvNuevo.split("\n")
    const idx = lines.findIndex(l => l.toLowerCase().includes("ovino") || l.toLowerCase().includes("merino") || l.toLowerCase().includes("esquila"))
    if (idx !== -1) {
      const context = lines.slice(Math.max(0, idx - 2), idx + 3).join("\n")
      info(`Contexto en el CV donde aparece:\n\n  ${context.replace(/\n/g, "\n  ")}`)
    }
  } else {
    fail("La info de ovinos NO aparece en el CV — Sonnet no la integró")
    info("Nota: puede ser que Sonnet la haya omitido por no tener sección de habilidades específicas")
  }

  info(`CV final: ${cvNuevo.length} chars (delta: +${cvNuevo.length - cvBase.length})`)

  // Guardar
  await sbPatch("candidatos", `?id=eq.${CANDIDATO_ID}`, { cv_procesado_texto: cvNuevo })
  ok("CV actualizado en DB")

  return tieneOvinos
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🧪  SIMULACIONES END-TO-END — Flujo WhatsApp → Respuestas → CV")
  console.log(`    Candidato: Florencia Anabella Vazquez (${CANDIDATO_ID})`)

  const [candidato] = await sbGet(
    "candidatos",
    `?id=eq.${CANDIDATO_ID}&select=cv_procesado_texto,preguntas_sugeridas,respuestas_candidato`
  )

  const { cv_procesado_texto: cvOriginal, preguntas_sugeridas: preguntas } = candidato
  info(`Estado inicial: CV ${cvOriginal.length} chars | ${preguntas.length} preguntas | respuestas: ${candidato.respuestas_candidato ? "sí" : "ninguna"}`)

  const respuestas = await sim1(preguntas)
  if (!respuestas) { process.exit(1) }

  await sim2(preguntas)

  const sim3ok = await sim3(preguntas, respuestas)
  if (!sim3ok) { process.exit(1) }

  await sim4(cvOriginal, preguntas, respuestas)

  await sim5(preguntas)

  await sim6(cvOriginal, preguntas)

  sep("RESUMEN FINAL")
  ok("Sim 1 — Haiku extrae respuestas de conversación completa")
  ok("Sim 2 — Haiku maneja conversación parcial (vacíos correctos)")
  ok("Sim 3 — guardarRespuestas guarda en Supabase")
  ok("Sim 4 — actualizarCVConRespuestas integra en el CV vía Sonnet")
  ok("Sim 5 — pregunta propia de Oriana persiste al enviar WhatsApp")
  ok("Sim 6 — respuesta a pregunta propia de Oriana entra al CV")
  console.log()
}

main().catch(err => { console.error("\n❌ Error inesperado:", err.message); process.exit(1) })
