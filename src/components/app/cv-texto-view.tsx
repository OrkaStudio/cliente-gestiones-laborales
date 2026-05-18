const OLIVE  = "#2a4a18"
const INK    = "#0d1117"
const INK2   = "#3d4451"
const INK3   = "#8b949e"
const BORDER = "#eaecef"

// ─── Parser de secciones ──────────────────────────────────────────────────────

interface Section {
  title: string | null
  lines: string[]
}

function parseSections(texto: string): Section[] {
  const sections: Section[] = []
  let current: Section = { title: null, lines: [] }

  for (const raw of texto.split("\n")) {
    const t = raw.trimEnd()
    if (/^[═─]{6,}$/.test(t.trim())) continue
    if (/^CURRICULUM VITAE/i.test(t.trim())) continue
    if (
      t.trim().length > 2 &&
      t.trim() === t.trim().toUpperCase() &&
      /^[A-ZÁÉÍÓÚÑÜÀÈÌÒÙÂÊÎÔÛÇ\s\/\-–—]+$/.test(t.trim())
    ) {
      sections.push(current)
      current = { title: t.trim(), lines: [] }
      continue
    }
    current.lines.push(t)
  }
  sections.push(current)
  return sections.filter(s => s.title !== null || s.lines.some(l => l.trim()))
}

// ─── Bloques de trabajo ────────────────────────────────────────────────────────

interface JobBlock {
  header: string
  lines: string[]
}

function splitJobBlocks(lines: string[]): { preLines: string[]; blocks: JobBlock[] } {
  const preLines: string[] = []
  const blocks: JobBlock[] = []
  let cur: JobBlock | null = null

  for (const line of lines) {
    if (line.trim().startsWith("▸")) {
      if (cur) blocks.push(cur)
      cur = { header: line.trim().replace(/^▸\s*/, ""), lines: [] }
    } else if (cur) {
      cur.lines.push(line)
    } else {
      preLines.push(line)
    }
  }
  if (cur) blocks.push(cur)
  return { preLines, blocks }
}

// ─── Extracción semántica de campos de trabajo ────────────────────────────────

interface JobFields {
  cargo:          string
  establecimiento: string
  periodo:        string
  tareas:         string
  metadata:       string[]   // los demás KV que no son los 4 primarios
}

const PRIMARY_KEYS = new Set(["cargo", "establecimiento", "período", "periodo", "tareas", "descripción", "descripcion"])

function extractJobFields(lines: string[]): JobFields {
  const fields: Record<string, string> = {}
  const rest: string[] = []

  for (const line of lines) {
    const t = line.trim()
    if (!t) continue
    const kv = t.match(/^([^:]+?):\s*(.+)$/)
    if (kv && kv[1].length < 50) {
      const key = kv[1].trim().toLowerCase()
      if (PRIMARY_KEYS.has(key)) {
        fields[key] = kv[2].trim()
      } else {
        rest.push(`${kv[1]}: ${kv[2]}`)
      }
    } else if (t.startsWith("•")) {
      rest.push(t)
    } else if (t) {
      rest.push(t)
    }
  }

  return {
    cargo:           fields["cargo"] ?? "",
    establecimiento: fields["establecimiento"] ?? "",
    periodo:         fields["período"] ?? fields["periodo"] ?? "",
    tareas:          fields["tareas"] ?? fields["descripción"] ?? fields["descripcion"] ?? "",
    metadata:        rest,
  }
}

// ─── Job Card ─────────────────────────────────────────────────────────────────

function JobCard({ block }: { block: JobBlock }) {
  const f = extractJobFields(block.lines)

  const hasHeader = f.cargo || f.establecimiento || f.periodo
  const hasTareas = !!f.tareas
  const hasMeta   = f.metadata.length > 0

  return (
    <div style={{
      background:    "#f7f9f5",
      borderRadius:  8,
      borderLeft:    `3px solid ${OLIVE}`,
      padding:       "14px 18px",
      marginBottom:  14,
    }}>
      {/* Tipo (TRABAJO ACTUAL / TRABAJO ANTERIOR) — pequeño */}
      <div style={{
        fontSize:      10,
        fontWeight:    700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color:         OLIVE,
        marginBottom:  hasHeader ? 8 : 0,
        opacity:       0.8,
      }}>
        {block.header}
      </div>

      {/* Cargo */}
      {f.cargo && (
        <div style={{ fontSize: 15, fontWeight: 700, color: INK, lineHeight: 1.3, marginBottom: 3 }}>
          {f.cargo}
        </div>
      )}

      {/* Empresa · Período */}
      {(f.establecimiento || f.periodo) && (
        <div style={{ fontSize: 13, color: INK2, marginBottom: hasTareas || hasMeta ? 10 : 0 }}>
          {[f.establecimiento, f.periodo].filter(Boolean).join("  ·  ")}
        </div>
      )}

      {/* Tareas */}
      {hasTareas && (
        <p style={{ fontSize: 13, color: INK2, lineHeight: 1.65, margin: hasMeta ? "0 0 10px" : 0 }}>
          {f.tareas}
        </p>
      )}

      {/* Metadata en línea */}
      {hasMeta && (
        <div style={{ fontSize: 11.5, color: INK3, lineHeight: 1.6 }}>
          {f.metadata.join("  ·  ")}
        </div>
      )}
    </div>
  )
}

// ─── Línea genérica ───────────────────────────────────────────────────────────

function renderLine(line: string, i: number) {
  const t = line.trim()
  if (!t) return null

  if (t.startsWith("•")) {
    return (
      <div key={i} style={{ display: "flex", gap: 8, marginBottom: 5 }}>
        <span style={{ color: OLIVE, flexShrink: 0 }}>•</span>
        <span style={{ fontSize: 13, color: INK2, lineHeight: 1.55 }}>{t.replace(/^•\s*/, "")}</span>
      </div>
    )
  }

  const kv = t.match(/^([^:]+?):\s*(.+)$/)
  if (kv && kv[1].length < 50 && !kv[1].includes("http")) {
    return (
      <div key={i} style={{ display: "flex", gap: 6, marginBottom: 5, lineHeight: 1.5 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: INK, flexShrink: 0 }}>{kv[1]}:</span>
        <span style={{ fontSize: 13, color: INK2 }}>{kv[2]}</span>
      </div>
    )
  }

  return (
    <p key={i} style={{ fontSize: 13, color: INK2, lineHeight: 1.65, margin: "0 0 6px" }}>{t}</p>
  )
}

// ─── Sección ──────────────────────────────────────────────────────────────────

function SectionBlock({ section }: { section: Section }) {
  if (!section.title) {
    return <div>{section.lines.map((l, i) => renderLine(l, i))}</div>
  }

  const { preLines, blocks } = splitJobBlocks(section.lines)

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        fontSize:      10,
        fontWeight:    700,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        color:         OLIVE,
        borderBottom:  `1.5px solid ${OLIVE}`,
        paddingBottom:  4,
        marginBottom:  14,
      }}>
        {section.title}
      </div>

      {preLines.map((l, i) => renderLine(l, i))}
      {blocks.map((b, i) => <JobCard key={i} block={b} />)}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function CVTextoView({ cvTexto, nombre }: { cvTexto: string; nombre: string }) {
  const sections = parseSections(cvTexto)
  const fecha = new Date().toLocaleDateString("es-AR", { year: "numeric", month: "long", day: "numeric" })

  return (
    <div style={{
      background:   "#fff",
      borderRadius: 16,
      border:       `1px solid ${BORDER}`,
      boxShadow:    "0 4px 32px rgba(13,17,23,0.08)",
      overflow:     "hidden",
      fontFamily:   "inherit",
      color:        INK,
    }}>
      {/* Header verde */}
      <div style={{
        background:     OLIVE,
        padding:        "20px 28px 18px",
        display:        "flex",
        justifyContent: "space-between",
        alignItems:     "flex-start",
      }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 5 }}>
            Gestiones Laborales
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>
            {nombre}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 5 }}>
            Currículum Vitae
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)" }}>{fecha}</div>
        </div>
      </div>

      {/* Cuerpo */}
      <div style={{ padding: "28px 32px" }}>
        {sections.map((s, i) => <SectionBlock key={i} section={s} />)}
      </div>

      {/* Footer */}
      <div style={{
        borderTop:      `1px solid ${BORDER}`,
        padding:        "10px 32px",
        display:        "flex",
        justifyContent: "space-between",
        alignItems:     "center",
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: OLIVE }}>
          Gestiones Laborales
        </span>
        <span style={{ fontSize: 11, color: INK3 }}>{fecha}</span>
      </div>
    </div>
  )
}
