export type CvSection = { title: string; content: string }

export function assembleSections(sections: CvSection[]): string {
  return sections
    .map((s) => `${s.title}\n${"─".repeat(49)}\n${s.content}`)
    .join("\n\n")
}

export function parseSections(text: string): CvSection[] {
  const lines  = text.split("\n")
  const result: CvSection[] = []
  let current: { title: string; lines: string[] } | null = null

  for (let i = 0; i < lines.length; i++) {
    const line    = lines[i]
    const trimmed = line.trim()
    const next    = lines[i + 1]?.trim() ?? ""

    const isSectionHeader =
      trimmed.length > 0 &&
      trimmed.length < 80 &&
      /^[A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑ\s/()]+$/.test(trimmed) &&
      (next.startsWith("─") || next.startsWith("-"))

    if (isSectionHeader) {
      if (current) result.push({ title: current.title, content: clean(current.lines) })
      current = { title: trimmed, lines: [] }
      i++ // saltar línea ─────
      continue
    }

    if (current) current.lines.push(line)
  }

  if (current) result.push({ title: current.title, content: clean(current.lines) })
  return result
}

function clean(lines: string[]): string {
  return lines
    .map((l) => (/^─+$/.test(l.trim()) ? "" : l))
    .join("\n")
    .trim()
}
