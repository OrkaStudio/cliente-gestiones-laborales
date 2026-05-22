"use server"

import { revalidatePath } from "next/cache"
import { createServiceClient } from "@/lib/supabase/service"
import type { CVParseado } from "@/lib/cv/parse"
import { upsertCandidato } from "@/lib/cv/upsert-candidato"
import { anthropic } from "@ai-sdk/anthropic"
import { generateText } from "ai"
import { parseSections, assembleSections, parseKV, type KVPair } from "@/lib/cv/utils"
import { generarPreguntasMapeadas, type CampoPendienteInput } from "@/lib/cv/generar-preguntas-mapeadas"

export async function marcarVisto(candidatoId: string) {
  const supabase = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("candidatos") as any).update({ visto: true }).eq("id", candidatoId).eq("visto", false)
  revalidatePath("/candidatos")
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
  { label: "movilidad",            field: "movilidad",           type: "bool"   },
  { label: "vehículo propio",      field: "vehiculo_propio",     type: "bool"   },
  { label: "vehiculo propio",      field: "vehiculo_propio",     type: "bool"   },
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
    .select("dni, domicilio_completo, fecha_nacimiento, lugar_nacimiento, estado_civil, hijos, disponibilidad, pretension_salarial, movilidad, vehiculo_propio, licencia_conducir, muebles_propios, animales, hectareas_max, personal_a_cargo_max")
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

  // Guardar cv_procesado_texto + preguntas (igual que el webhook, por separado)
  const { error } = await supabase
    .from("candidatos")
    .update({ cv_procesado_texto: data.cv_procesado_texto, preguntas_sugeridas: data.preguntas_sugeridas })
    .eq("id", id)

  if (error) return { success: false, error: error.message }

  revalidatePath("/candidatos")
  revalidatePath(`/candidatos/${id}`)
  revalidatePath("/")
  return { success: true, id }
}

export async function updateCVProcesado(candidatoId: string, texto: string) {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("candidatos")
    .update({ cv_procesado_texto: texto })
    .eq("id", candidatoId);

  if (error) throw new Error(error.message);
  revalidatePath(`/candidatos/${candidatoId}`);
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
  revalidatePath(`/candidatos/${candidatoId}`)
  revalidatePath("/")
  return { success: true, id: candidatoId }
}

const CANDIDATO_BOOL_CAMPOS = new Set(["movilidad", "vehiculo_propio", "licencia_conducir"])
const CANDIDATO_NUM_CAMPOS  = new Set(["hectareas_max", "personal_a_cargo_max"])

function parseCampoValue(campo: string, valorStr: string): string | boolean | number {
  const isBool =
    campo.endsWith(":en_blanco") ||
    (campo.startsWith("candidato:") && CANDIDATO_BOOL_CAMPOS.has(campo.split(":")[1] ?? ""))
  const isNum =
    campo.endsWith(":personal_a_cargo") ||
    (campo.startsWith("candidato:") && CANDIDATO_NUM_CAMPOS.has(campo.split(":")[1] ?? ""))

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

  const { text } = await generateText({
    model: anthropic("claude-haiku-4-5-20251001"),
    prompt: `Se le enviaron estas preguntas a un candidato laboral y respondió por WhatsApp.
Extraé la respuesta a cada pregunta del texto de respuesta.

Preguntas enviadas (formato: número. [id_campo] label: "pregunta"):
${listaPreguntas}

Texto de respuesta del candidato:
${textoRespuesta}

Devolvé ÚNICAMENTE un JSON object donde las claves son los id_campo y los valores son las respuestas extraídas.
Solo incluí campos donde encontraste una respuesta clara.
Para campos booleanos (en_blanco, movilidad, vehiculo_propio, licencia_conducir), devolvé "true" o "false".
Ejemplo: {"candidato:dni": "30456789", "exp:0:ubicacion": "Córdoba"}`,
  })

  let extraido: Record<string, string> = {}
  try {
    const match = text.match(/\{[\s\S]*\}/)
    if (match) extraido = JSON.parse(match[0]) as Record<string, string>
  } catch {
    return { success: false, error: "No se pudo interpretar la respuesta de Claude" }
  }

  if (!Object.keys(extraido).length) {
    return { success: false, error: "No se encontraron respuestas claras en el texto" }
  }

  const candidatoUpdates: Record<string, unknown> = {}
  const expUpdates = new Map<string, Record<string, unknown>>()
  const camposCompletados: string[] = []

  for (const [campo, valorStr] of Object.entries(extraido)) {
    if (!valorStr?.trim()) continue
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
  const nuevasRespuestas: RespuestaItem[] = preguntasEnviadas
    .filter((p) => extraido[p.campo])
    .map((p) => ({ pregunta: p.pregunta, respuesta: String(extraido[p.campo] ?? "") }))

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
  revalidatePath(`/candidatos/${candidatoId}`)
  return { success: true, id: candidatoId }
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
    model: anthropic("claude-sonnet-4-6"),
    system: `Sos asistente de RRHH de Gestiones Laborales. Incorporás respuestas de preselección al CV procesado de un candidato.

REGLAS ABSOLUTAS:
1. Solo incorporá datos que vengan de las respuestas — NUNCA inventés información.
2. Si una respuesta no agrega nada nuevo, dejá el CV exactamente igual en esa parte.
3. Respondé ÚNICAMENTE con el CV actualizado, sin explicaciones ni comentarios.

FORMATO OBLIGATORIO — respetá la estructura exacta de cada sección:

SECCIONES EN MAYÚSCULAS
─────────────────────────────────────────────────── (49 guiones)

Para DATOS PERSONALES: un campo por línea con formato "Label: Valor"
  Nombre y Apellido: Juan García
  Fecha de nacimiento: 15/05/1986
  DNI: 12345678

Para EXPERIENCIA LABORAL — cada trabajo tiene EXACTAMENTE este orden de líneas:
  Línea 1 → período: "2022 – Actualidad"  (solo fechas, nada más)
  Línea 2 → cargo y empresa: "Encargado — Estancia La Pampa"  (formato CARGO — EMPRESA, con " — ")
  Línea 3 → contexto: "Coronel Suárez, Buenos Aires. 1.200 hectáreas. Propietario: Juan Pérez. 3 personas a cargo. En blanco."
  Línea 4 → tareas: descripción de lo que hacía
  Línea 5 → (si trabajo actual) "Ingresos actuales: $X. Beneficios: Y."
  Línea 6 → (si trabajo anterior) "Motivo de salida: Z."

CRÍTICO: La línea 2 de cada trabajo SIEMPRE es "CARGO — EMPRESA". Nunca pongas ubicación, propietario ni otros datos en la línea 2. Esos van en la línea 3 (contexto).

Si una respuesta aporta datos de contexto (ubicación, propietario, tamaño, personal a cargo), incorporalos en la línea 3 del trabajo correspondiente.
Si aporta datos personales (DNI, domicilio, etc.), incorporalos en DATOS PERSONALES con el formato "Label: Valor".`,
    prompt: `CV actual:\n${candidato.cv_procesado_texto}\n\nRespuestas del candidato a preguntas de preselección:\n${qaTexto}`,
  })

  const { error: updateError } = await supabase
    .from("candidatos")
    .update({ cv_procesado_texto: text })
    .eq("id", candidatoId)

  if (updateError) return { success: false, error: updateError.message }

  await sincronizarCamposDesdeCV(candidatoId, text, supabase)

  revalidatePath(`/candidatos/${candidatoId}`)
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
  revalidatePath(`/candidatos/${id}`)
  revalidatePath(`/candidatos/${id}/cv`)
  return { success: true, id }
}

export async function updateExperienciaFields(
  expId: string,
  candidatoId: string,
  fields: import("@/lib/supabase/types").TablesUpdate<"experiencia_laboral">,
): Promise<ActionResult> {
  const supabase = createServiceClient()
  const { error } = await supabase.from("experiencia_laboral").update(fields).eq("id", expId)
  if (error) return { success: false, error: error.message }
  revalidatePath(`/candidatos/${candidatoId}`)
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
  revalidatePath(`/candidatos/${candidatoId}`)
  revalidatePath(`/candidatos/${candidatoId}/cv`)
  return { success: true, id: data.id }
}

export async function deleteExperiencia(expId: string, candidatoId: string): Promise<ActionResult> {
  const supabase = createServiceClient()
  const { error } = await supabase.from("experiencia_laboral").delete().eq("id", expId)
  if (error) return { success: false, error: error.message }
  revalidatePath(`/candidatos/${candidatoId}`)
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

  // Sincronizar DATOS PERSONALES del CV con los valores del perfil
  const { data: row } = await supabase
    .from("candidatos")
    .select("cv_procesado_texto")
    .eq("id", id)
    .single()

  if (row?.cv_procesado_texto) {
    const synced = syncDatosPersonales(row.cv_procesado_texto, data)
    if (synced !== row.cv_procesado_texto) {
      await supabase
        .from("candidatos")
        .update({ cv_procesado_texto: synced })
        .eq("id", id)
    }
  }

  revalidatePath("/candidatos")
  revalidatePath(`/candidatos/${id}`)
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
  revalidatePath(`/candidatos/${id}`)
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
  revalidatePath("/")
  return { success: true }
}
