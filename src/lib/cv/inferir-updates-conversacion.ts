import { anthropic } from "@ai-sdk/anthropic"
import { generateText } from "ai"
import type { SupabaseClient } from "@supabase/supabase-js"
import { citaValida } from "./habilidades"

/**
 * SLICE 1 del Spec A (durabilidad de datos de conversación). Infiere de una
 * conversación libre de WhatsApp los updates targeteados que aporta, reusando el
 * esquema de campos del Q&A estructurado (`candidato:<campo>` / `exp:<idx>:<campo>`)
 * y matcheando cada dato al PUESTO correcto por nombre (el Q&A lo sabe de antemano;
 * la conversación no — este es el trabajo nuevo).
 *
 * READ-ONLY: NO escribe nada. Devuelve propuestas para que Oriana confirme (Slice 3)
 * y recién ahí se apliquen (Slice 2). Cada propuesta trae la cita textual y marca
 * conflicto si el campo ya tenía un valor distinto (Q4: no pisar en silencio).
 *
 * NOTA: la semántica de campos está duplicada del prompt de extraerYGuardarRespuestas
 * a propósito, para no tocar el path del Q&A en este slice. Slice 2 unifica (DRY).
 */

export type UpdatePropuesto = {
  campo: string // "candidato:disponibilidad" | "exp:<expId>:dimension_establecimiento"
  destino: string // legible: "Candidato · Disponibilidad" | "Grupo Pampa Agro · Hectáreas"
  valorActual: string
  valorPropuesto: string
  cita: string
  conflicto: boolean
}

export type ResultadoInferencia = {
  propuestas: UpdatePropuesto[]
  sinCampo: { dato: string; cita: string }[] // datos relevantes que no mapean a un campo
}

// Campos del candidato que la conversación puede completar, con su etiqueta legible.
const CAMPOS_CANDIDATO: Record<string, string> = {
  disponibilidad: "Disponibilidad",
  pretension_salarial: "Pretensión salarial",
  vehiculo_propio: "Vehículo propio (sí/no)",
  vehiculo_detalle: "Qué vehículo",
  licencia_conducir: "Licencia de conducir (sí/no)",
  estado_civil: "Estado civil",
  hijos: "Hijos",
  domicilio_completo: "Domicilio",
  lugar_nacimiento: "Lugar de nacimiento",
}

// Campos de cada experiencia laboral que la conversación puede completar.
const CAMPOS_EXP: Record<string, string> = {
  dimension_establecimiento: "Hectáreas",
  personal_a_cargo: "Personal a cargo",
  en_blanco: "En blanco (sí/no)",
  motivo_cambio_o_salida: "Motivo de salida",
  nombre_propietario: "Propietario",
  ubicacion: "Ubicación",
  ingresos_actuales: "Ingresos actuales",
  beneficios: "Beneficios",
  descripcion: "Tareas",
}

function val(v: unknown): string {
  return v != null && String(v).trim() ? String(v).trim() : "sin dato"
}

export async function inferirUpdatesDesdeConversacion(
  // biome-ignore lint/suspicious/noExplicitAny: cliente compartido entre service y script
  supabase: SupabaseClient<any>,
  candidatoId: string,
  conversacion: string,
): Promise<ResultadoInferencia> {
  const vacio: ResultadoInferencia = { propuestas: [], sinCampo: [] }
  if (!conversacion.trim()) return vacio

  const [{ data: cand }, { data: exps }] = await Promise.all([
    supabase
      .from("candidatos")
      .select(
        "disponibilidad, pretension_salarial, vehiculo_propio, vehiculo_detalle, licencia_conducir, estado_civil, hijos, domicilio_completo, lugar_nacimiento",
      )
      .eq("id", candidatoId)
      .single(),
    supabase
      .from("experiencia_laboral")
      .select("*")
      .eq("candidato_id", candidatoId)
      .order("orden"),
  ])
  if (!cand) return vacio
  // biome-ignore lint/suspicious/noExplicitAny: filas dinámicas
  const experiencias = (exps ?? []) as any[]

  // Referencia para el LLM: puestos con índice, empresa, período y campos vacíos.
  const refPuestos = experiencias
    .map((e, i) => {
      const vacios = Object.keys(CAMPOS_EXP)
        .filter((c) => val(e[c]) === "sin dato")
        .map((c) => CAMPOS_EXP[c])
      return `[${i}] ${val(e.empresa)} (${val(e.desde)}–${val(e.hasta) === "sin dato" ? "actual" : val(e.hasta)}) — vacíos: ${vacios.join(", ") || "ninguno"}`
    })
    .join("\n")

  const refCandidato = Object.entries(CAMPOS_CANDIDATO)
    .map(([c, label]) => `candidato:${c} (${label}) = ${val((cand as Record<string, unknown>)[c])}`)
    .join("\n")

  const prompt = `Sos asistente de una consultora de RRHH agropecuaria. Oriana pegó una conversación de WhatsApp con un candidato. Extraé SOLO los datos concretos que la conversación aporta y mapealos al campo correcto.

PUESTOS DEL CANDIDATO (para targetear datos de un trabajo específico; usá el índice):
${refPuestos || "(sin puestos cargados)"}

DATOS DEL CANDIDATO (valor actual):
${refCandidato}

CONVERSACIÓN:
${conversacion}

REGLAS:
- Campos de un puesto → "exp:<índice>:<campo>". Campos del candidato → "candidato:<campo>". Usá los nombres de campo EXACTOS de las listas.
- Para saber a QUÉ puesto va un dato, matcheá por el nombre del establecimiento/empresa que menciona la conversación. Si no podés determinar el puesto con certeza, NO inventes el índice: mandalo a "sin_campo".
- "dimension_establecimiento" (Hectáreas): SOLO superficie en hectáreas/km². "13000 hectáreas" sí; "800 vacas" o "15 empleados" NO.
- "personal_a_cargo": personas bajo su supervisión directa, no el total de la empresa.
- Booleanos (en_blanco, vehiculo_propio, licencia_conducir): "true"/"false".
- Fechas: formato YYYY-MM.
- Si el candidato dice que no sabe/no recuerda → omitir el campo.
- Cada dato DEBE traer una CITA literal de la conversación. Si no podés citar, no lo incluyas.
- Datos relevantes que no encajan en ningún campo (ej. una habilidad, un comentario) → "sin_campo".

Respondé SOLO un JSON:
{"updates":[{"campo":"exp:0:dimension_establecimiento","valor":"13000 hectáreas","cita":"<cita literal>"}],"sin_campo":[{"dato":"<qué es>","cita":"<cita literal>"}]}`

  const { text } = await generateText({
    model: anthropic("claude-haiku-4-5-20251001"),
    temperature: 0,
    prompt,
  })

  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return vacio
  let parsed: {
    updates?: { campo?: unknown; valor?: unknown; cita?: unknown }[]
    sin_campo?: { dato?: unknown; cita?: unknown }[]
  }
  try {
    parsed = JSON.parse(match[0])
  } catch {
    return vacio
  }

  const propuestas: UpdatePropuesto[] = []
  for (const u of parsed.updates ?? []) {
    if (typeof u?.campo !== "string" || typeof u?.valor !== "string" || typeof u?.cita !== "string") continue
    if (!u.valor.trim() || !citaValida(u.cita, conversacion)) continue

    if (u.campo.startsWith("candidato:")) {
      const col = u.campo.slice("candidato:".length)
      if (!(col in CAMPOS_CANDIDATO)) continue
      const actual = val((cand as Record<string, unknown>)[col])
      propuestas.push({
        campo: u.campo,
        destino: `Candidato · ${CAMPOS_CANDIDATO[col]}`,
        valorActual: actual,
        valorPropuesto: u.valor.trim(),
        cita: u.cita.trim(),
        conflicto: actual !== "sin dato" && actual.toLowerCase() !== u.valor.trim().toLowerCase(),
      })
    } else if (u.campo.startsWith("exp:")) {
      const parts = u.campo.split(":")
      const idx = Number(parts[1])
      const col = parts[2]
      if (!Number.isInteger(idx) || !experiencias[idx] || !col || !(col in CAMPOS_EXP)) continue
      const row = experiencias[idx]
      const actual = val(row[col])
      propuestas.push({
        campo: `exp:${row.id}:${col}`, // resuelto al expId real
        destino: `${val(row.empresa)} · ${CAMPOS_EXP[col]}`,
        valorActual: actual,
        valorPropuesto: u.valor.trim(),
        cita: u.cita.trim(),
        conflicto: actual !== "sin dato" && actual.toLowerCase() !== u.valor.trim().toLowerCase(),
      })
    }
  }

  const sinCampo = (parsed.sin_campo ?? [])
    .filter((s) => typeof s?.dato === "string" && typeof s?.cita === "string" && citaValida(s.cita, conversacion))
    .map((s) => ({ dato: (s.dato as string).trim(), cita: (s.cita as string).trim() }))

  return { propuestas, sinCampo }
}
