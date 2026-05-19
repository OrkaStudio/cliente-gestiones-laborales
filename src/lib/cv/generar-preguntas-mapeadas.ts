import { generateText } from "ai"
import { anthropic } from "@ai-sdk/anthropic"

export type CampoPendienteInput =
  | { tipo: "candidato"; campo: string; label: string }
  | { tipo: "experiencia"; expIndex: number; empresa: string; campo: string; label: string }

export type PreguntaMapeada = { campo: string; pregunta: string }

export async function generarPreguntasMapeadas(
  nombre: string,
  cvTexto: string,
  campos: CampoPendienteInput[],
): Promise<PreguntaMapeada[]> {
  if (!campos.length) return []

  const lista = campos
    .map((c, i) => {
      const desc =
        c.tipo === "candidato"
          ? c.label
          : `Trabajo en ${c.empresa}: ${c.label}`
      return `${i + 1}. ${desc}`
    })
    .join("\n")

  const { text } = await generateText({
    model: anthropic("claude-haiku-4-5-20251001"),
    prompt: `Sos una recruitera de Gestiones Laborales, consultora de RRHH agropecuaria.
Formular preguntas para hacerle al candidato ${nombre} sobre los datos que faltan.

CV actual:
${cvTexto || "(sin CV)"}

Datos faltantes (uno por línea):
${lista}

Para cada dato, escribí UNA pregunta en español rioplatense informal, personalizada con el contexto del CV si aplica.
Una pregunta por dato — sin agrupar.

Respondé ÚNICAMENTE con un JSON array de exactamente ${campos.length} strings, en el mismo orden:
["pregunta 1", "pregunta 2", ...]`,
  })

  try {
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) return []
    const parsed = JSON.parse(match[0]) as unknown[]
    if (!Array.isArray(parsed)) return []

    return campos
      .map((c, i) => {
        const pregunta = typeof parsed[i] === "string" ? (parsed[i] as string).trim() : ""
        if (!pregunta) return null
        const campo =
          c.tipo === "candidato"
            ? `candidato:${c.campo}`
            : `exp:${c.expIndex}:${c.campo}`
        return { campo, pregunta }
      })
      .filter((p): p is PreguntaMapeada => p !== null)
  } catch {
    return []
  }
}
