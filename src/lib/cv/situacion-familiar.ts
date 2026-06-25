import { anthropic } from "@ai-sdk/anthropic"
import { generateText } from "ai"

export type PersonaSF = {
  nombre: string
  apellido: string
  estado_civil: string | null
  hijos: string | null
  ubicacion: string | null
  ultimo_puesto: string | null
}

// Redacta la narrativa de "Situación Familiar" del CV de pareja a partir de los
// datos reales de ambos. No inventa: si algo es s/d, lo omite. Sale corto y factual.
export async function redactarSituacionFamiliar(principal: PersonaSF, otro: PersonaSF): Promise<string> {
  const ficha = (c: PersonaSF) =>
    `${c.nombre} ${c.apellido} — estado civil: ${c.estado_civil ?? "s/d"}, hijos: ${c.hijos ?? "s/d"}, zona: ${c.ubicacion ?? "s/d"}, último puesto: ${c.ultimo_puesto ?? "s/d"}`

  const { text } = await generateText({
    model: anthropic("claude-haiku-4-5-20251001"),
    prompt: `Sos asistente de Gestiones Laborales, consultora de RRHH agropecuario. Redactá la sección "SITUACIÓN FAMILIAR" del CV unificado de una pareja que se postula para un puesto de casero/matrimonio en el campo.

Principal: ${ficha(principal)}
Pareja: ${ficha(otro)}

Escribí 2-3 oraciones en tercera persona, tono profesional y sobrio, enfocadas SOLO en lo familiar: que están en pareja (nombrá a ${otro.nombre} ${otro.apellido}), la composición familiar (hijos, si figuran) y que buscan una posición de casero/matrimonio que les permita convivir en el establecimiento. NO describas la experiencia ni el rubro profesional de cada uno (eso va en otras secciones del CV) y NO afirmes que trabajan en el agro si no surge de los datos. No inventes nada: si algo es "s/d", omitilo. Devolvé SOLO el texto, sin títulos ni comillas.`,
  })
  return text.trim()
}
