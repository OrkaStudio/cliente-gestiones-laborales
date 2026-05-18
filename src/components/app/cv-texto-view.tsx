// Renderiza cv_procesado_texto (texto formateado con secciones en MAYÚSCULAS)
// como un documento visual limpio, sin depender de campos estructurados.

const OLIVE  = "#2a4a18"
const INK    = "#0d1117"
const INK2   = "#3d4451"
const INK3   = "#8b949e"
const BORDER = "#eaecef"

// ─── Parser ───────────────────────────────────────────────────────────────────

interface Section {
  title: string | null  // null = bloque inicial antes de la primera sección
  lines: string[]
}

function parseCVTexto(texto: string): Section[] {
  const lines = texto.split("\n")
  const sections: Section[] = []
  let current: Section = { title: null, lines: [] }

  for (const raw of lines) {
    const line = raw.trimEnd()
    // Separadores (═══ o ─────) los saltamos
    if (/^[═─]{10,}$/.test(line.trim())) continue
    // Título de sección: línea en MAYÚSCULAS, no vacía, sin números ni ▸ •
    if (line.trim() && line.trim() === line.trim().toUpperCase() && /^[A-ZÁÉÍÓÚÑ\s\/\-]+$/.test(line.trim()) && line.trim().length > 2) {
      sections.push(current)
      current = { title: line.trim(), lines: [] }
      continue
    }
    current.lines.push(line)
  }
  sections.push(current)
  return sections.filter(s => s.title !== null || s.lines.some(l => l.trim()))
}

// ─── Renderizador de una línea ────────────────────────────────────────────────

function renderLine(line: string, i: number) {
  const t = line.trim()
  if (!t) return <div key={i} style={{ height: 6 }} />

  // Encabezado de trabajo/entrada: ▸ TRABAJO ACTUAL
  if (t.startsWith("▸")) {
    return (
      <div key={i} style={{ fontWeight: 700, fontSize: 12.5, color: OLIVE, marginTop: 12, marginBottom: 4 }}>
        {t.replace(/^▸\s*/, "")}
      </div>
    )
  }

  // Ítem de lista: • algo
  if (t.startsWith("•")) {
    return (
      <div key={i} style={{ display: "flex", gap: 6, marginBottom: 3 }}>
        <span style={{ color: OLIVE, flexShrink: 0, marginTop: 1 }}>•</span>
        <span style={{ fontSize: 12, color: INK2, lineHeight: 1.55 }}>{t.replace(/^•\s*/, "")}</span>
      </div>
    )
  }

  // Par clave: valor
  const kvMatch = t.match(/^([^:]+?):\s*(.+)$/)
  if (kvMatch && kvMatch[1].length < 45 && !kvMatch[1].includes("http")) {
    return (
      <div key={i} style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 6, marginBottom: 4, alignItems: "baseline" }}>
        <span style={{ fontSize: 11, color: INK3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {kvMatch[1]}
        </span>
        <span style={{ fontSize: 12.5, color: INK2, lineHeight: 1.5 }}>{kvMatch[2]}</span>
      </div>
    )
  }

  // Texto libre (perfil, descripción, etc.)
  return (
    <p key={i} style={{ fontSize: 12.5, color: INK2, lineHeight: 1.6, margin: "0 0 4px" }}>
      {t}
    </p>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function CVTextoView({ cvTexto, nombre }: { cvTexto: string; nombre: string }) {
  const sections = parseCVTexto(cvTexto)

  return (
    <div style={{ fontFamily: "inherit", color: INK }}>

      {/* Título del documento */}
      <div style={{
        textAlign:    "center",
        paddingBottom: 20,
        marginBottom:  20,
        borderBottom:  `2px solid ${OLIVE}`,
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: OLIVE, marginBottom: 6 }}>
          Curriculum Vitae
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: INK, letterSpacing: "-0.02em" }}>
          {nombre}
        </div>
      </div>

      {/* Secciones */}
      {sections.map((section, si) => {
        const contentLines = section.lines

        if (section.title === null) {
          // Bloque inicial (antes de la primera sección) — raro, pero por las dudas
          return (
            <div key={si}>
              {contentLines.map((l, li) => renderLine(l, li))}
            </div>
          )
        }

        return (
          <div key={si} style={{ marginBottom: 22 }}>
            <div style={{
              fontSize:      10,
              fontWeight:    700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color:         OLIVE,
              borderBottom:  `1.5px solid ${OLIVE}`,
              paddingBottom:  4,
              marginBottom:  12,
            }}>
              {section.title}
            </div>
            <div>
              {contentLines.map((l, li) => renderLine(l, li))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
