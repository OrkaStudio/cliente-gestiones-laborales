"use server"

import { revalidatePath, revalidateTag } from "next/cache"
import { after } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"
import type { CVParseado } from "@/lib/cv/parse"
import { upsertCandidato } from "@/lib/cv/upsert-candidato"
import { anthropic } from "@ai-sdk/anthropic"
import { generateText } from "ai"
import { parseSections, assembleSections, parseKV, type KVPair } from "@/lib/cv/utils"
import { generarPreguntasMapeadas, type CampoPendienteInput } from "@/lib/cv/generar-preguntas-mapeadas"
import { runPostProcess } from "@/lib/cv/post-process"
import { fuzzyScore, normalize } from "@/lib/fuzzy"

export async function marcarVisto(candidatoId: string) {
  const supabase = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("candidatos") as any).update({ visto: true }).eq("id", candidatoId).eq("visto", false)
  await supabase.from("notificaciones").update({ leida: true }).eq("candidato_id", candidatoId).eq("tipo", "cv_nuevo").eq("leida", false)
  revalidatePath("/candidatos")
  revalidateTag("candidatos-list", {})
  revalidatePath("/", "layout")
}

export type ConversacionEntry = { id: string; fecha: string; texto: string }

async function agregarConversacion(
  candidatoId: string,
  texto: string,
  supabase: ReturnType<typeof createServiceClient>,
): Promise<void> {
  const { data } = await supabase
    .from("candidatos")
    .select("conversaciones_historial")
    .eq("id", candidatoId)
    .single()

  const historial = (data?.conversaciones_historial as ConversacionEntry[] | null) ?? []
  const nueva: ConversacionEntry = {
    id: crypto.randomUUID(),
    fecha: new Date().toISOString(),
    texto,
  }
  await supabase
    .from("candidatos")
    .update({ conversaciones_historial: [nueva, ...historial] as unknown as import("@/lib/supabase/types").Json })
    .eq("id", candidatoId)
}

// ─── Sync campos estructurados desde cv_procesado_texto ────────────────────────

type CampoCV = { label: string; field: string; type: "string" | "bool" | "num" | "date" }

const CAMPOS_CV_MAP: CampoCV[] = [
  { label: "dni",                  field: "dni",                 type: "string" },
  { label: "domicilio completo",   field: "domicilio_completo",  type: "string" },
  { label: "domicilio",            field: "domicilio_completo",  type: "string" },
  { label: "fecha de nacimiento",  field: "fecha_nacimiento",    type: "date"   },
  { label: "lugar de nacimiento",  field: "lugar_nacimiento",    type: "string" },
  { label: "estado civil",         field: "estado_civil",        type: "string" },
  { label: "hijos",                field: "hijos",               type: "string" },
  { label: "disponibilidad",       field: "disponibilidad",      type: "string" },
  { label: "pretensión salarial",  field: "pretension_salarial", type: "string" },
  { label: "pretension salarial",  field: "pretension_salarial", type: "string" },
  { label: "vehículo propio",      field: "vehiculo_propio",     type: "bool"   },
  { label: "vehiculo propio",      field: "vehiculo_propio",     type: "bool"   },
  { label: "detalle vehículo",     field: "vehiculo_detalle",    type: "string" },
  { label: "detalle vehiculo",     field: "vehiculo_detalle",    type: "string" },
  { label: "licencia de conducir", field: "licencia_conducir",   type: "bool"   },
  { label: "muebles propios",      field: "muebles_propios",     type: "string" },
  { label: "animales",             field: "animales",            type: "string" },
  { label: "hectáreas máx",        field: "hectareas_max",       type: "num"    },
  { label: "hectareas max",        field: "hectareas_max",       type: "num"    },
  { label: "personal a cargo",     field: "personal_a_cargo_max",type: "num"    },
]

function parseDateFromCV(val: string): string | null {
  // DD/MM/YYYY o D/M/YYYY
  const mDMY = val.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (mDMY) return `${mDMY[3]}-${mDMY[2].padStart(2, "0")}-${mDMY[1].padStart(2, "0")}`
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(val)) return val.slice(0, 10)
  return null
}

function parseBoolFromCV(val: string): boolean | null {
  const v = val.toLowerCase().trim()
  if (v.startsWith("sí") || v.startsWith("si") || v === "true" || v === "yes") return true
  if (v.startsWith("no") || v === "false") return false
  return null
}

function parseNumFromCV(val: string): number | null {
  const n = Number.parseInt(val.replace(/[^\d]/g, ""), 10)
  return Number.isNaN(n) ? null : n
}

async function sincronizarCamposDesdeCV(
  candidatoId: string,
  cvTexto: string,
  supabase: ReturnType<typeof createServiceClient>,
): Promise<void> {
  const { data: row } = await supabase
    .from("candidatos")
    .select("dni, domicilio_completo, fecha_nacimiento, lugar_nacimiento, estado_civil, hijos, disponibilidad, pretension_salarial, vehiculo_propio, vehiculo_detalle, licencia_conducir, muebles_propios, animales, hectareas_max, personal_a_cargo_max")
    .eq("id", candidatoId)
    .single()

  if (!row) return

  const sections = parseSections(cvTexto)
  const allKVs: KVPair[] = sections.flatMap((s) => parseKV(s.content))

  const update: Record<string, string | boolean | number> = {}
  const filled = new Set<string>() // evitar duplicados por alias

  for (const { label, field, type } of CAMPOS_CV_MAP) {
    if (filled.has(field)) continue
    const current = (row as Record<string, unknown>)[field]
    if (current !== null && current !== undefined && current !== "") continue // ya tiene valor

    const match = allKVs.find((kv) => kv.label.toLowerCase() === label.toLowerCase())
    if (!match?.value.trim()) continue

    if (type === "string") {
      update[field] = match.value.trim()
      filled.add(field)
    } else if (type === "bool") {
      const b = parseBoolFromCV(match.value)
      if (b !== null) { update[field] = b; filled.add(field) }
    } else if (type === "date") {
      const d = parseDateFromCV(match.value)
      if (d !== null) { update[field] = d; filled.add(field) }
    } else {
      const n = parseNumFromCV(match.value)
      if (n !== null) { update[field] = n; filled.add(field) }
    }
  }

  if (Object.keys(update).length === 0) return
  await supabase.from("candidatos")
    .update(update as import("@/lib/supabase/types").TablesUpdate<"candidatos">)
    .eq("id", candidatoId)
}

// ─── Labels del CV que corresponden a campos del perfil ────────────────────────

// Labels del CV que corresponden a campos del perfil
const PROFILE_TO_CV_LABEL: Record<string, string> = {
  telefono:         "Teléfono",
  email:            "Email",
  fecha_nacimiento: "Fecha de nacimiento",
  ubicacion:        "Ubicación",
}

function syncDatosPersonales(cvTexto: string, data: CandidatoData): string {
  const sections = parseSections(cvTexto)
  const dpIdx    = sections.findIndex((s) => s.title === "DATOS PERSONALES")
  if (dpIdx === -1) return cvTexto

  const managed  = new Set(Object.values(PROFILE_TO_CV_LABEL).map((l) => l.toLowerCase()))
  const existing = parseKV(sections[dpIdx].content)

  // Pares que no manejamos (DNI, Nacionalidad, etc.) → los conservamos
  const extra = existing.filter((p) => !managed.has(p.label.toLowerCase()))

  // Pares que sí manejamos, con los valores nuevos
  const updated: KVPair[] = Object.entries(PROFILE_TO_CV_LABEL).flatMap(([field, label]) => {
    const val = (data as Record<string, string | undefined>)[field]?.trim()
    return val ? [{ label, value: val }] : []
  })

  const content = [...updated, ...extra]
    .map((p) => (p.label ? `${p.label}: ${p.value}` : p.value))
    .join("\n")

  sections[dpIdx] = { ...sections[dpIdx], content }
  return assembleSections(sections)
}

export async function guardarCandidatoProcesado(data: CVParseado): Promise<ActionResult> {
  const supabase = createServiceClient()

  let id: string
  try {
    const result = await upsertCandidato(data, null)
    id = result.id
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Error guardando candidato" }
  }

  const { error } = await supabase
    .from("candidatos")
    .update({ cv_procesado_texto: data.cv_procesado_texto, preguntas_sugeridas: data.preguntas_sugeridas })
    .eq("id", id)

  if (error) return { success: false, error: error.message }

  // Post-procesado idéntico al webhook: preguntas_mapeadas + categorías — en background
  after(async () => { await runPostProcess(id, data) })

  revalidatePath("/candidatos")
  revalidateTag("candidatos-list", {})
  revalidatePath(`/candidatos/${id}`)
  revalidateTag(`candidato-${id}`, {})
  revalidatePath("/")
  revalidateTag("dashboard", {})
  return { success: true, id }
}

export async function updateCVProcesado(candidatoId: string, texto: string) {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("candidatos")
    .update({ cv_procesado_texto: texto })
    .eq("id", candidatoId);

  if (error) throw new Error(error.message);
  revalidatePath(`/candidatos/${candidatoId}`)
  revalidateTag(`candidato-${candidatoId}`, {});
}

export type PreguntaEnviada = {
  campo: string
  expId?: string
  label: string
  pregunta: string
  enviado_at: string
  tanda_id?: string
}

export async function registrarEnvioWhatsapp(
  candidatoId: string,
  mensajeEnviado: string,
  preguntasActuales?: string[],
  preguntasConCampo?: PreguntaEnviada[],
): Promise<ActionResult> {
  const supabase = createServiceClient()

  let preguntasEnviadasUpdate: PreguntaEnviada[] | undefined
  if (preguntasConCampo?.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from("candidatos") as any)
      .select("preguntas_enviadas")
      .eq("id", candidatoId)
      .single()
    const actuales = (data?.preguntas_enviadas as PreguntaEnviada[] | null) ?? []
    preguntasEnviadasUpdate = [...actuales, ...preguntasConCampo]
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("candidatos") as any)
    .update({
      fecha_consultado: new Date().toISOString(),
      mensaje_whatsapp: mensajeEnviado,
      ...(preguntasActuales ? { preguntas_sugeridas: preguntasActuales } : {}),
      ...(preguntasEnviadasUpdate ? { preguntas_enviadas: preguntasEnviadasUpdate } : {}),
    })
    .eq("id", candidatoId)

  if (error) return { success: false, error: error.message }

  revalidatePath("/candidatos")
  revalidateTag("candidatos-list", {})
  revalidatePath(`/candidatos/${candidatoId}`)
  revalidateTag(`candidato-${candidatoId}`, {})
  revalidatePath("/")
  return { success: true, id: candidatoId }
}

const CANDIDATO_BOOL_CAMPOS = new Set(["movilidad", "vehiculo_propio", "licencia_conducir"])
const CANDIDATO_NUM_CAMPOS  = new Set<string>() // actualmente ningún campo de candidato requiere coerción numérica

function parseCampoValue(campo: string, valorStr: string): string | boolean | number {
  const isBool =
    campo.endsWith(":en_blanco") ||
    (campo.startsWith("candidato:") && CANDIDATO_BOOL_CAMPOS.has(campo.split(":")[1] ?? ""))
  const isNum =
    campo.startsWith("candidato:") && CANDIDATO_NUM_CAMPOS.has(campo.split(":")[1] ?? "")

  if (isBool) {
    const v = valorStr.toLowerCase().trim()
    return v === "true" || v.startsWith("sí") || v === "si" || v === "yes"
  }
  if (isNum) {
    const n = Number.parseInt(valorStr.replace(/[^\d]/g, ""), 10)
    return Number.isNaN(n) ? 0 : n
  }
  if (campo === "candidato:fecha_nacimiento") {
    return parseDateFromCV(valorStr) ?? valorStr.trim()
  }
  return valorStr.trim()
}

export async function extraerYGuardarRespuestas(
  candidatoId: string,
  preguntasEnviadas: PreguntaEnviada[],
  textoRespuesta: string,
): Promise<ActionResult> {
  if (!textoRespuesta.trim()) return { success: false, error: "La respuesta está vacía" }
  if (!preguntasEnviadas.length) return { success: false, error: "No hay preguntas enviadas" }

  const supabase = createServiceClient()

  const listaPreguntas = preguntasEnviadas
    .map((p, i) => `${i + 1}. [${p.campo}] ${p.label}: "${p.pregunta}"`)
    .join("\n")

  let text: string
  try {
    const result = await generateText({
      model: anthropic("claude-haiku-4-5-20251001"),
      prompt: `Sos asistente de una consultora de RRHH agropecuaria. Un candidato respondió por WhatsApp a una serie de preguntas sobre su historial laboral.
Tu tarea es extraer la respuesta a cada pregunta y mapearla al campo correcto.

PREGUNTAS ENVIADAS (formato: número. [id_campo] label: "pregunta"):
${listaPreguntas}

RESPUESTA DEL CANDIDATO:
${textoRespuesta}

REGLAS DE EXTRACCIÓN:

1. AMBIGÜEDAD — Preservá el texto tal cual si la respuesta es imprecisa o un rango.
   Correcto:   "3 o 4 personas"  →  "3 o 4 personas"
   Incorrecto: "3 o 4 personas"  →  "34"  o  "3"

2. FECHAS — Usá formato YYYY-MM si es posible.
   - "principios de 2019" → "2019-03"
   - "a mediados del 2020" → "2020-06"
   - "fines de 2019" → "2019-11"
   - "2019" sin más contexto → "2019-01"
   - Si el candidato indica que ya NO trabaja ahí pero la fecha es incierta, aproximá el mes más razonable. No dejes null.
   - Si el candidato indica que SIGUE trabajando ahí ("sigo trabajando", "es mi trabajo actual", "hasta hoy"), omitir el campo "hasta" y poner "esActual": "true".

3. SEMÁNTICA DE CAMPOS — Cada campo tiene un significado exacto:
   - "dimension_establecimiento": superficie o tamaño físico del establecimiento agropecuario (ej: "5.000 ha", "800 hectáreas"). SOLO aplica si el trabajo es claramente agropecuario (campo, estancia, tambo, feedlot, etc.) o si el candidato menciona explícitamente hectáreas/superficie. Si el trabajo es comercial, urbano o de servicios, omitir este campo. Si la respuesta menciona animales (vacas, cabezas) o personas pero no superficie, omitir.
   - "personal_a_cargo": personas bajo supervisión directa del candidato (ej: "3 personas", "equipo de 5"). No confundir con total de empleados de la empresa.
   - "empresa": nombre del establecimiento o empresa, no del propietario.
   - "nombre_propietario": nombre del dueño o propietario, no de la empresa.
   - "ingresos_actuales" y "beneficios": solo incluir si el candidato sigue trabajando ahí (trabajo actual). Si ya se fue, omitir estos campos.
   - Si la pregunta es sobre cuántos empleados tenía la empresa en total (no a cargo del candidato), ese dato NO tiene campo propio — omitirlo.

4. BOOLEANOS — Para campos booleanos (en_blanco, vehiculo_propio, licencia_conducir):
   - Respuesta afirmativa (sí, claro, siempre) → "true"
   - Respuesta negativa (no, nunca) → "false"
   - Respuesta ambigua o parcial (ej: "estaba en blanco aunque los últimos meses hubo un problema") → "true" (interpretá la intención principal)
   - VEHÍCULO / MOVILIDAD: la pregunta sobre "vehículo o movilidad propia" mapea a "candidato:vehiculo_propio" (true/false). Si además el candidato menciona QUÉ vehículo tiene (moto, bicicleta, auto, camioneta, camión, etc.), agregá TAMBIÉN "candidato:vehiculo_detalle" con ese texto corto (ej: "camioneta"). Si responde que no tiene, omitir vehiculo_detalle.

5. IGNORANCIA / NEGACIÓN — Omitir el campo si el candidato expresa que no sabe o no recuerda.
   - "no recuerdo", "no sé", "no me acuerdo", "no tengo idea" → omitir el campo, NO poner ese texto como valor.

6. NÚMEROS — Solo usar unidades de superficie para "dimension_establecimiento" (ha, hectáreas, km²).
   - "800 vacas", "200 cabezas", "15 empleados" NO son valores válidos para dimension_establecimiento → omitir.

7. NO INCLUIR — Omitir el campo si:
   - El candidato claramente no respondió esa pregunta
   - La respuesta es irrelevante o incompatible con el campo
   - No podés determinar el valor con razonable certeza

Devolvé ÚNICAMENTE un JSON object donde las claves son los id_campo y los valores son strings.
Para booleanos devolvé "true" o "false" como string.
Ejemplo: {"candidato:dni": "30456789", "exp:0:ubicacion": "Córdoba", "exp:0:personal_a_cargo": "3 o 4 personas", "exp:0:hasta": "2019-10"}`,
    })
    text = result.text
  } catch (e) {
    return { success: false, error: `Error al llamar a Claude: ${e instanceof Error ? e.message : String(e)}` }
  }

  let extraido: Record<string, unknown> = {}
  try {
    const match = text.match(/\{[\s\S]*\}/)
    if (match) extraido = JSON.parse(match[0]) as Record<string, unknown>
  } catch {
    return { success: false, error: "No se pudo interpretar la respuesta de Claude" }
  }

  // Si Claude no encontró nada claro, igual retornamos success: la tanda se cierra
  // y el usuario ve "— sin respuesta" en cada campo
  if (!Object.keys(extraido).length) {
    return { success: true, id: candidatoId }
  }

  const candidatoUpdates: Record<string, unknown> = {}
  const expUpdates = new Map<string, Record<string, unknown>>()
  const camposCompletados: string[] = []

  for (const [campo, valorRaw] of Object.entries(extraido)) {
    // Claude puede devolver booleans/numbers — normalizar a string antes de procesar
    const valorStr = (valorRaw === null || valorRaw === undefined) ? "" : String(valorRaw)
    if (!valorStr.trim()) continue
    const valor = parseCampoValue(campo, valorStr)

    if (campo.startsWith("candidato:")) {
      const column = campo.slice("candidato:".length)
      candidatoUpdates[column] = valor
      camposCompletados.push(campo)
    } else if (campo.startsWith("exp:")) {
      const parts = campo.split(":")
      const column = parts[2]
      if (!column) continue
      const pregEnviada = preguntasEnviadas.find((p) => p.campo === campo)
      const expId = pregEnviada?.expId
      if (!expId) continue
      if (!expUpdates.has(expId)) expUpdates.set(expId, {})
      expUpdates.get(expId)![column] = valor
      camposCompletados.push(campo)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: candidatoData } = await (supabase.from("candidatos") as any)
    .select("respuestas_candidato")
    .eq("id", candidatoId)
    .single()

  const respuestasActuales = (candidatoData?.respuestas_candidato as RespuestaItem[] | null) ?? []
  // Guardar TODAS las preguntas de la tanda (respuesta vacía si Claude no encontró nada)
  // Así la tanda queda marcada como procesada en DB, independiente del cliente state
  const preguntasYaProcesadas = new Set(respuestasActuales.map((r) => r.pregunta))
  const nuevasRespuestas: RespuestaItem[] = preguntasEnviadas
    .filter((p) => !preguntasYaProcesadas.has(p.pregunta))
    .map((p) => ({
      pregunta: p.pregunta,
      respuesta: (extraido[p.campo] !== undefined && extraido[p.campo] !== null)
        ? String(extraido[p.campo])
        : "",
    }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("candidatos") as any)
    .update({
      ...candidatoUpdates,
      respuestas_candidato: [...respuestasActuales, ...nuevasRespuestas],
      // preguntas_enviadas intencionalmente NO se modifica: la card de tanda debe
      // seguir visible después del refresh para que el usuario pueda hacer "Actualizar CV"
    })
    .eq("id", candidatoId)

  for (const [expId, updates] of expUpdates) {
    await supabase
      .from("experiencia_laboral")
      .update(updates as import("@/lib/supabase/types").TablesUpdate<"experiencia_laboral">)
      .eq("id", expId)
  }

  revalidatePath("/candidatos")
  revalidateTag("candidatos-list", {})
  revalidatePath(`/candidatos/${candidatoId}`)
  revalidateTag(`candidato-${candidatoId}`, {})
  return { success: true, id: candidatoId }
}

// Acción combinada: extrae respuestas + regenera CV en un solo round-trip
export async function extraerYActualizarCV(
  candidatoId: string,
  preguntasEnviadas: PreguntaEnviada[],
  textoRespuesta: string,
): Promise<ActionResult> {
  try {
    const extractResult = await extraerYGuardarRespuestas(candidatoId, preguntasEnviadas, textoRespuesta)
    if (!extractResult.success) return extractResult

    // Regenerar CV desde datos estructurados (sin IA — determinístico, ~300ms)
    const cvResult = await regenerarCVTextoDesdeDatos(candidatoId)
    if (!cvResult.success) return cvResult

    return { success: true, id: candidatoId }
  } catch (e) {
    return { success: false, error: `Error inesperado: ${e instanceof Error ? e.message : String(e)}` }
  }
}

export type RespuestaItem = { pregunta: string; respuesta: string }

export async function guardarRespuestas(candidatoId: string, respuestas: RespuestaItem[]): Promise<ActionResult> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from("candidatos")
    .update({ respuestas_candidato: respuestas as unknown as import("@/lib/supabase/types").Json })
    .eq("id", candidatoId)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/candidatos/${candidatoId}`)
  revalidateTag(`candidato-${candidatoId}`, {})
  return { success: true, id: candidatoId }
}

export async function actualizarCVConRespuestas(candidatoId: string): Promise<ActionResult> {
  const supabase = createServiceClient()
  const { data: candidato, error: fetchError } = await supabase
    .from("candidatos")
    .select("nombre, cv_procesado_texto, preguntas_sugeridas, respuestas_candidato")
    .eq("id", candidatoId)
    .single()

  if (fetchError || !candidato) return { success: false, error: "Candidato no encontrado" }
  if (!candidato.cv_procesado_texto) return { success: false, error: "El candidato no tiene CV procesado" }

  const respuestas = candidato.respuestas_candidato as RespuestaItem[] | null
  if (!respuestas?.length) return { success: false, error: "No hay respuestas cargadas" }

  const qaTexto = respuestas
    .map((r, i) => `${i + 1}. Pregunta: ${r.pregunta}\n   Respuesta: ${r.respuesta || "(sin respuesta)"}`)
    .join("\n\n")

  const { text } = await generateText({
    model: anthropic("claude-haiku-4-5-20251001"),
    system: `Sos asistente de RRHH de Gestiones Laborales. Incorporás respuestas de preselección al CV procesado de un candidato.

REGLAS ABSOLUTAS:
1. Solo incorporá datos que vengan de las respuestas — NUNCA inventés información.
2. Si una respuesta no agrega nada nuevo, dejá el CV exactamente igual en esa parte.
3. Respondé ÚNICAMENTE con el CV actualizado, sin explicaciones ni comentarios.

FORMATO OBLIGATORIO — el CV usa este formato estricto:

Secciones en MAYÚSCULAS seguidas de ─────────────────────────────────────────────────── (49 guiones)

EXPERIENCIA LABORAL: cada trabajo tiene marcador ▸ y los siguientes campos en este orden exacto:
▸ TRABAJO ACTUAL
Cargo: [cargo]
Establecimiento: [empresa]
Período: [inicio] – [fin o "Actualidad"]
Ubicación: [localidad, provincia]
Propietario: [nombre o "sin dato"]
Hectáreas: [número o "sin dato"]
Personal a cargo: [número o "sin dato"]
En blanco: [Sí / No / sin dato]
Tareas: [descripción en prosa]
Ingresos actuales: [monto o "sin dato"]
Beneficios: [lista o "sin dato"]

Para trabajos anteriores: mismo formato con ▸ TRABAJO ANTERIOR N, y Motivo de salida en vez de Ingresos/Beneficios.

CRÍTICO: Si una respuesta aporta datos de un campo que dice "sin dato", reemplazá "sin dato" por el dato real. No agregues campos nuevos fuera del formato.
DATOS PERSONALES: formato "Label: Valor" por línea. Si falta, escribir "sin dato".`,
    prompt: `CV actual:\n${candidato.cv_procesado_texto}\n\nRespuestas del candidato a preguntas de preselección:\n${qaTexto}`,
  })

  const { error: updateError } = await supabase
    .from("candidatos")
    .update({ cv_procesado_texto: text })
    .eq("id", candidatoId)

  if (updateError) return { success: false, error: updateError.message }

  await sincronizarCamposDesdeCV(candidatoId, text, supabase)

  revalidatePath(`/candidatos/${candidatoId}`)
  revalidateTag(`candidato-${candidatoId}`, {})
  revalidatePath(`/candidatos/${candidatoId}/cv`)
  return { success: true, id: candidatoId }
}

export async function actualizarCVDesdeConversacion(
  candidatoId: string,
  conversacion: string,
): Promise<ActionResult> {
  const supabase = createServiceClient()
  const { data: candidato, error: fetchError } = await supabase
    .from("candidatos")
    .select("cv_procesado_texto")
    .eq("id", candidatoId)
    .single()

  if (fetchError || !candidato) return { success: false, error: "Candidato no encontrado" }
  if (!candidato.cv_procesado_texto) return { success: false, error: "El candidato no tiene CV procesado" }

  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-6"),
    system: `Sos asistente de RRHH de una consultora agropecuaria. Dado el CV procesado de un candidato y una conversación de WhatsApp, incorporá al CV toda información nueva y relevante que aparezca en la conversación. No inventés datos, no elimines información existente. Mantenés el formato exacto del CV: secciones en mayúsculas seguidas de separador ─────────────────────────────────────────────────── (49 guiones). Respondé solo con el CV actualizado, sin explicaciones.`,
    prompt: `CV actual:\n${candidato.cv_procesado_texto}\n\nConversación de WhatsApp:\n${conversacion}`,
  })

  const { error: updateError } = await supabase
    .from("candidatos")
    .update({ cv_procesado_texto: text })
    .eq("id", candidatoId)

  if (updateError) return { success: false, error: updateError.message }

  // Guardar la conversación en el historial + sincronizar campos estructurados
  await Promise.all([
    agregarConversacion(candidatoId, conversacion, supabase),
    sincronizarCamposDesdeCV(candidatoId, text, supabase),
  ])

  revalidatePath(`/candidatos/${candidatoId}`)
  revalidateTag(`candidato-${candidatoId}`, {})
  revalidatePath(`/candidatos/${candidatoId}/cv`)
  return { success: true, id: candidatoId }
}

export async function extraerRespuestasDeConversacion(
  preguntas: string[],
  conversacion: string,
): Promise<{ success: true; respuestas: string[] } | { success: false; error: string }> {
  if (!conversacion.trim()) return { success: false, error: "La conversación está vacía" }

  const listaPreguntas = preguntas.map((p, i) => `${i + 1}. ${p}`).join("\n")

  const { text } = await generateText({
    model: anthropic("claude-haiku-4-5-20251001"),
    prompt: `Se le hicieron estas preguntas a un candidato laboral:\n${listaPreguntas}\n\nEsta es la conversación de WhatsApp donde respondió:\n${conversacion}\n\nExtrae la respuesta a cada pregunta. Si no hay respuesta para una pregunta, dejá el campo vacío.\n\nRespondé ÚNICAMENTE con un JSON array con exactamente ${preguntas.length} elementos, en el mismo orden que las preguntas:\n["respuesta 1", "respuesta 2", ...]`,
  })

  try {
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) throw new Error("No JSON array found")
    const parsed = JSON.parse(match[0]) as unknown[]
    if (!Array.isArray(parsed)) throw new Error("Not an array")
    const respuestas = preguntas.map((_, i) =>
      typeof parsed[i] === "string" ? (parsed[i] as string) : ""
    )
    return { success: true, respuestas }
  } catch {
    return { success: false, error: "No se pudo interpretar la respuesta de Claude" }
  }
}

export type CampoPendiente = CampoPendienteInput
export type PreguntaGenerada = { campo: string; pregunta: string }

export async function generarPreguntasParaCampos(
  candidatoId: string,
  campos: CampoPendiente[],
): Promise<{ success: true; preguntas: PreguntaGenerada[] } | { success: false; error: string }> {
  if (!campos.length) return { success: true, preguntas: [] }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("candidatos")
    .select("nombre, cv_procesado_texto")
    .eq("id", candidatoId)
    .single()

  if (error || !data) return { success: false, error: "Candidato no encontrado" }

  try {
    const preguntas = await generarPreguntasMapeadas(
      data.nombre,
      data.cv_procesado_texto ?? "",
      campos,
    )
    return { success: true, preguntas }
  } catch {
    return { success: false, error: "No se pudo generar las preguntas" }
  }
}

export type ActionResult = { success: true; id: string } | { success: false; error: string }

export async function updateCandidatoFields(
  id: string,
  fields: import("@/lib/supabase/types").TablesUpdate<"candidatos">,
): Promise<ActionResult> {
  const supabase = createServiceClient()
  const { error } = await supabase.from("candidatos").update(fields).eq("id", id)
  if (error) return { success: false, error: error.message }
  revalidatePath("/candidatos")
  revalidateTag("candidatos-list", {})
  revalidatePath(`/candidatos/${id}`)
  revalidateTag(`candidato-${id}`, {})
  revalidatePath(`/candidatos/${id}/cv`)
  return { success: true, id }
}

async function maybeSyncCV(
  candidatoId: string,
  supabase: ReturnType<typeof createServiceClient>,
) {
  const { data } = await supabase
    .from("candidatos")
    .select("cv_procesado_texto")
    .eq("id", candidatoId)
    .single()
  if (data?.cv_procesado_texto) {
    await regenerarCVTextoDesdeDatos(candidatoId)
  }
}

export async function updateExperienciaFields(
  expId: string,
  candidatoId: string,
  fields: import("@/lib/supabase/types").TablesUpdate<"experiencia_laboral">,
): Promise<ActionResult> {
  const supabase = createServiceClient()
  const { error } = await supabase.from("experiencia_laboral").update(fields).eq("id", expId)
  if (error) return { success: false, error: error.message }
  await maybeSyncCV(candidatoId, supabase)
  revalidatePath(`/candidatos/${candidatoId}`)
  revalidateTag(`candidato-${candidatoId}`, {})
  revalidatePath(`/candidatos/${candidatoId}/cv`)
  return { success: true, id: expId }
}

export async function addExperiencia(
  candidatoId: string,
  fields: Omit<import("@/lib/supabase/types").TablesInsert<"experiencia_laboral">, "candidato_id">,
): Promise<ActionResult> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("experiencia_laboral")
    .insert({ ...fields, candidato_id: candidatoId })
    .select("id")
    .single()
  if (error) return { success: false, error: error.message }
  await maybeSyncCV(candidatoId, supabase)
  revalidatePath(`/candidatos/${candidatoId}`)
  revalidateTag(`candidato-${candidatoId}`, {})
  revalidatePath(`/candidatos/${candidatoId}/cv`)
  return { success: true, id: data.id }
}

export async function deleteExperiencia(expId: string, candidatoId: string): Promise<ActionResult> {
  const supabase = createServiceClient()
  const { error } = await supabase.from("experiencia_laboral").delete().eq("id", expId)
  if (error) return { success: false, error: error.message }
  await maybeSyncCV(candidatoId, supabase)
  revalidatePath(`/candidatos/${candidatoId}`)
  revalidateTag(`candidato-${candidatoId}`, {})
  revalidatePath(`/candidatos/${candidatoId}/cv`)
  return { success: true, id: expId }
}

type CandidatoData = {
  nombre: string
  apellido: string
  email?: string
  telefono?: string
  ultimo_puesto?: string
  disponibilidad?: string
  pretension_salarial?: string
  fecha_nacimiento?: string
  ubicacion?: string
  educacion?: string
  idiomas?: string
  notas_recruiter?: string
  estado?: "activo" | "inactivo"
}

function parseIdiomas(raw?: string): string[] {
  if (!raw) return []
  return raw.split(",").map((s) => s.trim()).filter(Boolean)
}

function buildPayload(data: CandidatoData) {
  return {
    nombre: data.nombre.trim(),
    apellido: data.apellido.trim(),
    email: data.email?.trim() || null,
    telefono: data.telefono?.trim() || null,
    ultimo_puesto: data.ultimo_puesto?.trim() || null,
    disponibilidad: data.disponibilidad?.trim() || null,
    pretension_salarial: data.pretension_salarial?.trim() || null,
    fecha_nacimiento: data.fecha_nacimiento?.trim() || null,
    ubicacion: data.ubicacion?.trim() || null,
    educacion: data.educacion?.trim() || null,
    idiomas: parseIdiomas(data.idiomas),
    notas_recruiter: data.notas_recruiter?.trim() || null,
    estado: (data.estado ?? "activo") as "activo" | "inactivo",
  }
}

export async function createCandidato(data: CandidatoData): Promise<ActionResult> {
  const supabase = createServiceClient()
  const { data: created, error } = await supabase
    .from("candidatos")
    .insert(buildPayload(data))
    .select("id")
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath("/candidatos")
  revalidateTag("candidatos-list", {})
  revalidatePath("/")
  return { success: true, id: created.id }
}

export async function updateCandidato(id: string, data: CandidatoData): Promise<ActionResult> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from("candidatos")
    .update(buildPayload(data))
    .eq("id", id)

  if (error) return { success: false, error: error.message }

  // Regenerar cv_procesado_texto desde datos estructurados (si ya tiene CV)
  const { data: row } = await supabase
    .from("candidatos")
    .select("cv_procesado_texto")
    .eq("id", id)
    .single()

  if (row?.cv_procesado_texto) {
    await regenerarCVTextoDesdeDatos(id)
  }

  revalidatePath("/candidatos")
  revalidateTag("candidatos-list", {})
  revalidatePath(`/candidatos/${id}`)
  revalidateTag(`candidato-${id}`, {})
  revalidatePath(`/candidatos/${id}/cv`)
  revalidatePath("/")
  return { success: true, id }
}

export async function toggleEstadoCandidato(
  id: string,
  nuevoEstado: "activo" | "inactivo",
): Promise<ActionResult> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from("candidatos")
    .update({ estado: nuevoEstado })
    .eq("id", id)

  if (error) return { success: false, error: error.message }

  revalidatePath("/candidatos")
  revalidateTag("candidatos-list", {})
  revalidatePath(`/candidatos/${id}`)
  revalidateTag(`candidato-${id}`, {})
  return { success: true, id }
}

export async function eliminarCandidato(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient()

  // Eliminar en orden para respetar FKs (no todas tienen ON DELETE CASCADE)
  await supabase.from("notificaciones").delete().eq("candidato_id", id)
  await supabase.from("webhook_logs").delete().eq("candidato_id", id)
  await supabase.from("gestiones").delete().eq("candidato_id", id)
  await supabase.from("experiencia_laboral").delete().eq("candidato_id", id)

  const { error } = await supabase.from("candidatos").delete().eq("id", id)
  if (error) return { success: false, error: error.message }

  revalidatePath("/candidatos")
  revalidateTag("candidatos-list", {})
  revalidatePath("/")
  return { success: true }
}

// ─── Migración: regenerar cv_procesado_texto en Formato B desde datos estructurados ──

export async function regenerarCVTextoDesdeDatos(candidatoId: string): Promise<ActionResult> {
  const supabase = createServiceClient()

  const [{ data: c, error }, { data: expData }] = await Promise.all([
    supabase.from("candidatos").select("*").eq("id", candidatoId).single(),
    supabase.from("experiencia_laboral").select("*").eq("candidato_id", candidatoId).order("orden"),
  ])

  if (error || !c) return { success: false, error: `Candidato no encontrado: ${error?.message ?? "sin datos"}` }

  const experiencias = (expData ?? []) as any[]
  const referencias  = (Array.isArray(c.referencias) ? c.referencias : []) as any[]

  function val(v: unknown) { return v && String(v).trim() ? String(v).trim() : "sin dato" }
  function bool(v: boolean | null) { return v === true ? "Sí" : v === false ? "No" : "sin dato" }

  // DATOS PERSONALES
  const datosPersonales = [
    `Nombre y Apellido: ${c.nombre ?? ""} ${c.apellido ?? ""}`.trim(),
    `Fecha de nacimiento: ${val(c.fecha_nacimiento)}`,
    `DNI: ${val(c.dni)}`,
    `Domicilio: ${val(c.domicilio_completo ?? c.ubicacion)}`,
    `Teléfono: ${val(c.telefono)}`,
    `Email: ${val(c.email)}`,
    `Estado civil: ${val(c.estado_civil)}`,
    `Hijos: ${val(c.hijos)}`,
    `Estudios: ${val(c.educacion)}`,
    `Vehículo propio: ${bool(c.vehiculo_propio)}`,
    `Detalle vehículo: ${val(c.vehiculo_detalle)}`,
    `Licencia de conducir: ${bool(c.licencia_conducir)}`,
    `Disponibilidad: ${val(c.disponibilidad)}`,
    `Pretensión salarial: ${val(c.pretension_salarial)}`,
  ].join("\n")

  // EXPERIENCIA LABORAL
  const sorted = [...experiencias].sort((a, b) => {
    if (!a.hasta) return -1
    if (!b.hasta) return  1
    return (b.desde ?? "").localeCompare(a.desde ?? "")
  })

  function formatFechaSimple(d: string | null) {
    if (!d) return "Actualidad"
    const [y, m] = d.split("-")
    return m && m !== "01" ? `${m}/${y}` : y
  }

  let anteriorIdx = 0
  const expBlocks = sorted.map((exp: any) => {
    const esActual = !exp.hasta
    const label    = esActual ? "TRABAJO ACTUAL" : `TRABAJO ANTERIOR ${++anteriorIdx}`
    const periodo  = `${formatFechaSimple(exp.desde)} – ${formatFechaSimple(exp.hasta)}`
    const lines = [
      `▸ ${label}`,
      `Cargo: ${val(exp.rol)}`,
      `Establecimiento: ${val(exp.empresa)}`,
      `Período: ${periodo}`,
      `Ubicación: ${val(exp.ubicacion)}`,
      `Propietario: ${val(exp.nombre_propietario)}`,
      `Hectáreas: ${val(exp.dimension_establecimiento)}`,
      `Personal a cargo: ${val(exp.personal_a_cargo)}`,
      `En blanco: ${bool(exp.en_blanco)}`,
      `Tareas: ${val(exp.descripcion)}`,
    ]
    if (esActual) {
      lines.push(`Ingresos actuales: ${val(exp.ingresos_actuales)}`)
      lines.push(`Beneficios: ${val(exp.beneficios)}`)
    } else if (exp.motivo_cambio_o_salida) {
      lines.push(`Motivo de salida: ${exp.motivo_cambio_o_salida}`)
    }
    return lines.join("\n")
  }).join("\n\n")

  // REFERENCIAS
  const refsLines = referencias.map((r: any) =>
    [r.nombre, r.relacion, r.contacto ? `Tel: ${r.contacto}` : null].filter(Boolean).join(" — ")
  ).join("\n")

  // Armar texto completo
  const sep = "─".repeat(49)
  const secciones: string[] = [
    `DATOS PERSONALES\n${sep}\n${datosPersonales}`,
  ]
  if (c.perfil_laboral?.trim()) {
    secciones.push(`PERFIL LABORAL\n${sep}\n${c.perfil_laboral.trim()}`)
  }
  if (expBlocks.trim()) {
    secciones.push(`EXPERIENCIA LABORAL\n${sep}\n${expBlocks}`)
  }
  if (refsLines.trim()) {
    secciones.push(`REFERENCIAS\n${sep}\n${refsLines}`)
  }

  const texto = secciones.join("\n\n")

  const { error: upErr } = await supabase
    .from("candidatos")
    .update({ cv_procesado_texto: texto })
    .eq("id", candidatoId)

  if (upErr) return { success: false, error: upErr.message }

  revalidatePath(`/candidatos/${candidatoId}`)
  revalidateTag(`candidato-${candidatoId}`, {})
  revalidatePath(`/candidatos/${candidatoId}/cv`)
  return { success: true, id: candidatoId }
}

// ════════════════════════════════════════════════════════════════════
// Vínculo de pareja
// Las parejas llegan como dos CVs separados → dos candidatos individuales
// unidos (1:1 simétrico). El alta/baja se administra desde el perfil; el
// vínculo siempre lo confirma una persona a mano (nunca se linkea en silencio).
// ════════════════════════════════════════════════════════════════════

export type ParejaCandidato = {
  id: string
  nombre: string
  apellido: string
  ultimo_puesto: string | null
  ubicacion: string | null
  estado_civil: string | null
}

function revalidarCandidato(id: string) {
  revalidatePath(`/candidatos/${id}`)
  revalidateTag(`candidato-${id}`, {})
  revalidatePath("/candidatos")
  revalidateTag("candidatos-list", {})
}

export async function vincularPareja(aId: string, bId: string): Promise<ActionResult> {
  if (aId === bId) return { success: false, error: "No se puede vincular un candidato consigo mismo" }
  const supabase = createServiceClient()
  // RPC atómica: setea ambos lados en una transacción (ver migración 021)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc("vincular_pareja", { a: aId, b: bId })
  if (error) return { success: false, error: error.message }
  revalidarCandidato(aId)
  revalidarCandidato(bId)
  return { success: true, id: aId }
}

export async function desvincularPareja(aId: string): Promise<ActionResult> {
  const supabase = createServiceClient()
  // leer la pareja actual para revalidar también el otro lado
  const { data } = await supabase.from("candidatos").select("pareja_id").eq("id", aId).single()
  const partnerId = (data as { pareja_id: string | null } | null)?.pareja_id ?? null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc("desvincular_pareja", { a: aId })
  if (error) return { success: false, error: error.message }
  revalidarCandidato(aId)
  if (partnerId) revalidarCandidato(partnerId)
  return { success: true, id: aId }
}

// Sugerencia on-demand: resuelve el nombre que el CV declara como pareja contra
// la base (fuzzy, reusa fuzzy.ts). Devuelve el mejor match o null si no hay uno claro.
export async function sugerirPareja(candidatoId: string): Promise<ParejaCandidato | null> {
  const supabase = createServiceClient()
  const { data: cand } = await supabase
    .from("candidatos")
    .select("pareja_declarada")
    .eq("id", candidatoId)
    .single()
  const declarada = (cand as { pareja_declarada: string | null } | null)?.pareja_declarada
  if (!declarada || !declarada.trim()) return null
  const { data: todos } = await supabase
    .from("candidatos")
    .select("id, nombre, apellido, ultimo_puesto, ubicacion, estado_civil")
    .neq("id", candidatoId)
  if (!todos) return null
  let best: ParejaCandidato | null = null
  let bestScore = 0
  for (const c of todos as unknown as ParejaCandidato[]) {
    const score = fuzzyScore([`${c.nombre} ${c.apellido}`], declarada)
    if (score > bestScore) { bestScore = score; best = c }
  }
  // exige que todas las palabras del nombre declarado matcheen (score >= 1)
  return bestScore >= 1 ? best : null
}

// Búsqueda de candidatos para vincular a mano (excluye al propio).
// Sin query: lista "inteligente" por defecto — prioriza misma zona y mismo apellido
// que el candidato (señales de pareja) y casados/en pareja. Con query: fuzzy.
export async function buscarCandidatosParaPareja(
  candidatoId: string,
  query: string,
): Promise<ParejaCandidato[]> {
  const supabase = createServiceClient()
  const { data: self } = await supabase
    .from("candidatos")
    .select("ubicacion, apellido")
    .eq("id", candidatoId)
    .single()
  const selfUb = normalize((self as { ubicacion: string | null } | null)?.ubicacion ?? "")
  const selfAp = normalize((self as { apellido: string | null } | null)?.apellido ?? "")

  const { data } = await supabase
    .from("candidatos")
    .select("id, nombre, apellido, ultimo_puesto, ubicacion, estado_civil")
    .neq("id", candidatoId)
    .limit(500)
  if (!data) return []
  const list = data as unknown as ParejaCandidato[]

  if (query.trim()) {
    return list
      .map((c) => ({ c, score: fuzzyScore([`${c.nombre} ${c.apellido}`, c.ultimo_puesto], query) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((x) => x.c)
  }

  // sin query → sugeridos rankeados por afinidad con el candidato
  const afinidad = (c: ParejaCandidato) => {
    let s = 0
    const ub = normalize(c.ubicacion ?? "")
    const ap = normalize(c.apellido ?? "")
    if (selfUb && ub === selfUb) s += 3
    else if (selfUb && ub && (ub.includes(selfUb) || selfUb.includes(ub))) s += 1
    if (selfAp && ap === selfAp) s += 2
    if (/casad|pareja|concubin|uni[oó]n/i.test(c.estado_civil ?? "")) s += 1
    return s
  }
  return [...list]
    .sort((a, b) => afinidad(b) - afinidad(a) || `${a.nombre} ${a.apellido}`.localeCompare(`${b.nombre} ${b.apellido}`))
    .slice(0, 8)
}
