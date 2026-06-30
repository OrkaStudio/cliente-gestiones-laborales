import { generateText } from "ai"
import { anthropic } from "@ai-sdk/anthropic"

// Vocabulario controlado HABILIDADES_GL (lockeado 28/06). Compartido candidato↔búsqueda,
// match por valor exacto (como CATEGORIAS_GL). Cada label trae las "pistas" que cuentan
// como evidencia para el extractor. Ver spec en orka-brain:
// clientes/gestiones-laborales/especificaciones/2026-06-28-habilidades-gl-vocabulario-lockeado.md
export const HABILIDADES_GL_PISTAS: Record<string, string[]> = {
  // Ganadería
  "Rodeo de cría/recría": ["rodeo de cría", "recría", "vientres", "terneros"],
  "Feedlot/engorde": ["feedlot", "engorde a corral", "invernada intensiva", "engorde"],
  "Inseminación artificial": ["inseminación", "iatf", "inseminador"],
  "Manga y corrales": ["manga", "corral", "apartes", "pesadas", "embarques", "caravaneo", "caravanas"],
  "Sanidad animal": ["vacunación", "vacunar", "desparasitación", "curaciones", "castración", "sanidad"],
  "Parición y destete": ["parición", "asistencia al parto", "destete", "señalada"],
  // A caballo
  "Trabajo de a caballo": ["a caballo", "arreo", "tropero", "jinete"],
  Doma: ["doma", "domador", "amansar"],
  // Tambo
  "Ordeñe / tambo": ["tambo", "ordeñe", "ordeño", "sala de ordeñe"],
  // Agricultura
  "Siembra y cosecha": ["siembra", "cosecha", "labranza", "sembrar"],
  Riego: ["riego", "pivot", "sistema de riego"],
  "Fumigación / pulverización": ["fumigación", "pulverización", "aplicador", "mosquito"],
  "Monitoreo de cultivos": ["monitoreo", "plagas", "seguimiento de cultivo"],
  // Maquinaria
  "Manejo de tractor": ["tractor", "tractorista"],
  "Maquinaria agrícola": ["sembradora", "cosechadora", "cosechero", "maquinista", "maquinaria agrícola"],
  "Mixer / mixero": ["mixer", "mixero", "mixeado"],
  "Chofer / camión": ["chofer", "camión", "camionero"],
  "Planta de silo": ["planta de silo", "silo", "acopio", "secado de granos"],
  "Mecánica de maquinaria": ["mecánica", "reparación de maquinaria", "taller"],
  // Infraestructura del campo
  "Mantenimiento de alambrados": ["alambrado", "alambrar", "postes"],
  "Control de molinos y aguadas": ["molinos", "aguadas", "bombas", "bebederos"],
  "Armado de parcelas / pasturas": ["parcelas", "boyero", "pasturas", "pastoreo rotativo"],
  Oficios: ["soldadura", "carpintería", "electricidad", "plomería", "albañilería"],
  // Administración
  "Registros y reportes (PC/Excel)": ["registros", "planillas", "excel", "software de gestión", "stock en sistema"],
  // Casero / casa
  "Tareas domésticas": ["limpieza", "cocina", "casera", "jardín", "parque", "pileta"],
}

export const HABILIDADES_GL = Object.keys(HABILIDADES_GL_PISTAS)

export type ResultadoExtraccion = {
  habilidades: string[]
  residir: "si" | "no" | "sin_dato"
  residir_zona_preferida: string | null
}

// Normaliza para comparar citas: minúsculas, sin acentos, solo alfanumérico.
function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

// Valida la cita contra la fuente por SOLAPAMIENTO de palabras, no substring exacto:
// el LLM reformatea la cita (espacios, recortes) y el match byte-a-byte tira citas buenas.
// Regla (lección 2026-06-27): substring O ≥70% de las palabras (>3 letras) presentes.
export function citaValida(cita: string, fuente: string): boolean {
  const c = normalizar(cita)
  const f = normalizar(fuente)
  if (!c || !f) return false
  if (f.includes(c)) return true
  const palabras = c.split(" ").filter((w) => w.length > 3)
  if (palabras.length === 0) return f.includes(c)
  const presentes = palabras.filter((w) => f.includes(w)).length
  return presentes / palabras.length >= 0.7
}

// Derivación DETERMINÍSTICA (sin IA) por coincidencia de pistas. Para el build local
// de V2 con datos reales: suficiente para lógica + visual. El backfill con Haiku (mejor
// calidad, con guardrails de residir) se corre recién al pasar a prod, post-validación
// de Andrea/Oriana.
// Match por INICIO de palabra (permite sufijos): la pista debe arrancar una palabra
// pero puede continuar. Así "alambrado" matchea "alambrados" (plural) y "tractor" a
// "tractores", pero "ración" NO matchea dentro de "operación" (no arranca palabra ahí).
// La fuente ya viene normalizada a alfanumérico + espacios simples.
function pistaPresente(pistaNorm: string, fuenteNorm: string): boolean {
  if (!pistaNorm) return false
  const escapada = pistaNorm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return new RegExp(`(?:^|\\s)${escapada}`).test(fuenteNorm)
}

export function derivarHabilidadesPorPistas(cvTexto: string): string[] {
  const f = normalizar(cvTexto)
  if (!f) return []
  return HABILIDADES_GL.filter((label) =>
    HABILIDADES_GL_PISTAS[label].some((pista) => pistaPresente(normalizar(pista), f)),
  )
}

function buildVocabPrompt(): string {
  return HABILIDADES_GL.map((label) => `- "${label}" — pistas: ${HABILIDADES_GL_PISTAS[label].join(", ")}`).join("\n")
}

const PROMPT_SISTEMA = `Sos un extractor de datos de CVs de trabajadores rurales argentinos. Extraés DOS cosas:

(A) HABILIDADES: de la lista controlada de abajo, cuáles DEMUESTRA el CV. Solo las que el texto evidencia (por las pistas o equivalentes claros). Usá el label EXACTO de la lista. Pueden ser varias o ninguna.

(B) RESIDIR: si el candidato DECLARA EXPLÍCITAMENTE su disponibilidad para residir/mudarse al campo. "si"/"no" SOLO si lo declara de sí mismo. NO infieras de la trayectoria (fue puestero ≠ se muda hoy). NO tomes los beneficios que ofrecía un empleo (vivienda/casa que daba el trabajo) como su disponibilidad. "Me mudo, preferentemente a X" es "si" (guardá X en zona), NUNCA "no". Un "no" real es "no puede mudarse". Ante la duda: "sin_dato".

Cada ítem (habilidad y residir) DEBE traer una cita LITERAL del CV. Si no podés citar, no lo incluyas / "sin_dato". Nunca inventes.

Respondé SOLO un JSON válido, sin texto alrededor:
{"habilidades":[{"label":"<label exacto>","evidencia":"<cita literal>"}],"residir":"si|no|sin_dato","residir_evidencia":"<cita o vacío>","residir_zona_preferida":"<o vacío>"}

Lista controlada de habilidades (label — pistas):
`

export async function extraerHabilidadesYResidir(cvTexto: string): Promise<ResultadoExtraccion> {
  const vacio: ResultadoExtraccion = { habilidades: [], residir: "sin_dato", residir_zona_preferida: null }
  if (!cvTexto.trim()) return vacio

  const { text } = await generateText({
    model: anthropic("claude-haiku-4-5-20251001"),
    // Texto COMPLETO — sin slice(0,3000): cortar pierde señales del final del CV.
    prompt: `${PROMPT_SISTEMA}${buildVocabPrompt()}\n\nCV:\n${cvTexto}`,
  })

  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return vacio

  let parsed: {
    habilidades?: { label?: unknown; evidencia?: unknown }[]
    residir?: unknown
    residir_evidencia?: unknown
    residir_zona_preferida?: unknown
  }
  try {
    parsed = JSON.parse(match[0])
  } catch {
    return vacio
  }

  // Habilidades: label en el vocab + cita validada contra el CV.
  const habilidades = Array.from(
    new Set(
      (parsed.habilidades ?? [])
        .filter(
          (h) =>
            typeof h?.label === "string" &&
            HABILIDADES_GL.includes(h.label) &&
            typeof h?.evidencia === "string" &&
            citaValida(h.evidencia, cvTexto),
        )
        .map((h) => h.label as string),
    ),
  )

  // Residir: solo si/no si la cita valida; si no, sin_dato.
  let residir: ResultadoExtraccion["residir"] = "sin_dato"
  let zona: string | null = null
  if (
    (parsed.residir === "si" || parsed.residir === "no") &&
    typeof parsed.residir_evidencia === "string" &&
    citaValida(parsed.residir_evidencia, cvTexto)
  ) {
    residir = parsed.residir
    if (residir === "si" && typeof parsed.residir_zona_preferida === "string" && parsed.residir_zona_preferida.trim()) {
      zona = parsed.residir_zona_preferida.trim()
    }
  }

  return { habilidades, residir, residir_zona_preferida: zona }
}
