export type CvSection = { title: string; content: string }
export type KVPair    = { label: string; value: string }
export type JobBlock  = { periodo: string; titulo: string; empresa: string; desc: string }

export function assembleSections(sections: CvSection[]): string {
  return sections
    .map((s) => `${s.title}\n${"─".repeat(49)}\n${s.content}`)
    .join("\n\n")
}

export function parseKV(content: string): KVPair[] {
  return content.split("\n")
    .filter(l => l.trim())
    .map(line => {
      const idx = line.indexOf(":")
      if (idx === -1) return { label: "", value: line.trim() }
      return { label: line.slice(0, idx).trim(), value: line.slice(idx + 1).trim() }
    })
}

export function parseJobs(content: string): JobBlock[] {
  const lines = content.split("\n")
  const jobs: JobBlock[] = []
  let cur: { periodo: string; titulo: string; empresa: string; descLines: string[] } | null = null

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue

    const isPeriodo =
      /^(\d{2}\/\d{4}|\d{4})\s*[\s\-–—]/.test(line) ||
      /^(Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre)\s+\d{4}/i.test(line)

    if (isPeriodo) {
      if (cur) jobs.push({ periodo: cur.periodo, titulo: cur.titulo, empresa: cur.empresa, desc: cur.descLines.join(" ") })
      cur = { periodo: line, titulo: "", empresa: "", descLines: [] }
      continue
    }
    if (!cur) continue

    if (!cur.titulo) {
      const sep = line.indexOf(" — ")
      if (sep !== -1) { cur.titulo = line.slice(0, sep).trim(); cur.empresa = line.slice(sep + 3).trim() }
      else             { cur.titulo = line }
    } else {
      cur.descLines.push(line)
    }
  }
  if (cur) jobs.push({ periodo: cur.periodo, titulo: cur.titulo, empresa: cur.empresa, desc: cur.descLines.join(" ") })
  return jobs
}

export function parseBullets(content: string): string[] {
  return content.split("\n").map(l => l.trim().replace(/^[-•▪]\s*/, "")).filter(Boolean)
}

export function parseRefs(content: string): string[][] {
  const blocks: string[][] = []
  let cur: string[] = []
  for (const line of content.split("\n")) {
    if (!line.trim()) { if (cur.length) { blocks.push(cur); cur = [] } }
    else              { cur.push(line.trim()) }
  }
  if (cur.length) blocks.push(cur)
  return blocks
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
