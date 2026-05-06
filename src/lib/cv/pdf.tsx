import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"
import { parseSections } from "./utils"

// ─── Paleta ───────────────────────────────────────────────────────────────────
const C = {
  olive:   "#2a4a18",
  ink:     "#1a1d23",
  ink2:    "#3d4451",
  ink3:    "#6b7280",
  border:  "#e5e7eb",
  white:   "#ffffff",
  bg:      "#f9fafb",
}

// ─── Dimensiones A4 ───────────────────────────────────────────────────────────
const PL = 48   // padding left
const PR = 44   // padding right
const PT = 20   // padding top body

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({

  page: {
    backgroundColor: C.white,
    fontFamily: "Helvetica",
    paddingBottom: 50,
  },

  // Espaciador fijo que solo se renderiza en páginas 2+ (header full-bleed en pág. 1)
  pageTopGap: {
    height: 28,
  },

  // ── HEADER ────────────────────────────────────────────────────────────────
  header: {
    backgroundColor: C.olive,
    paddingLeft:  PL,
    paddingRight: PR,
    paddingTop:   32,
    paddingBottom: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  headerLeft: {},
  brandName: {
    color: C.white,
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    letterSpacing: 3,
  },
  brandSub: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 6.5,
    letterSpacing: 1.5,
    marginTop: 5,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  cvLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 7,
    letterSpacing: 2,
    marginBottom: 4,
  },
  candidateName: {
    color: C.white,
    fontFamily: "Helvetica-Bold",
    fontSize: 20,
  },

  // Línea debajo del header
  headerLine: {
    height: 2,
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  // ── BODY ──────────────────────────────────────────────────────────────────
  body: {
    paddingLeft:  PL,
    paddingRight: PR,
    paddingTop:   PT,
  },
  section: {
    marginBottom: 14,
  },

  // ── SECTION HEADER ────────────────────────────────────────────────────────
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  sectionDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.olive,
    marginRight: 7,
  },
  sectionTitle: {
    color: C.olive,
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    letterSpacing: 2.5,
  },
  sectionRule: {
    height: 1,
    backgroundColor: C.border,
    marginBottom: 9,
  },

  // ── KEY-VALUE (DATOS PERSONALES) ──────────────────────────────────────────
  kvRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  kvLabel: {
    width: 110,
    color: C.ink3,
    fontSize: 9,
  },
  kvValue: {
    flex: 1,
    color: C.ink,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
  },

  // ── PÁRRAFO JUSTIFICADO ───────────────────────────────────────────────────
  para: {
    color: C.ink2,
    fontSize: 9.5,
    lineHeight: 1.72,
    textAlign: "justify",
  },

  // ── EXPERIENCIA ───────────────────────────────────────────────────────────
  jobBlock: {
    marginBottom: 10,
  },
  jobPeriod: {
    color: C.olive,
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  jobTitle: {
    color: C.ink,
    fontFamily: "Helvetica-Bold",
    fontSize: 9.5,
    marginBottom: 3,
  },
  jobCompany: {
    color: C.ink3,
    fontSize: 9,
    marginBottom: 4,
  },
  jobDesc: {
    color: C.ink2,
    fontSize: 9.5,
    lineHeight: 1.7,
    textAlign: "justify",
  },

  // ── BULLETS (CONOCIMIENTOS) ───────────────────────────────────────────────
  bulletGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  bulletItem: {
    width: "50%",
    flexDirection: "row",
    marginBottom: 4,
    paddingRight: 8,
  },
  bulletDot: {
    color: C.olive,
    fontSize: 9,
    marginRight: 5,
    marginTop: 1,
  },
  bulletText: {
    flex: 1,
    color: C.ink2,
    fontSize: 9,
    lineHeight: 1.5,
  },

  // ── REFERENCIAS ───────────────────────────────────────────────────────────
  refBlock: {
    marginBottom: 8,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: C.border,
  },
  refName: {
    color: C.ink,
    fontFamily: "Helvetica-Bold",
    fontSize: 9.5,
    marginBottom: 2,
  },
  refDetail: {
    color: C.ink3,
    fontSize: 9,
  },

  // ── FOOTER ────────────────────────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 32,
    backgroundColor: C.bg,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingLeft:  PL,
    paddingRight: PR,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerBrand: {
    color: C.olive,
    fontFamily: "Helvetica-Bold",
    fontSize: 6.5,
    letterSpacing: 1,
  },
  footerMid: {
    color: C.ink3,
    fontSize: 6.5,
  },
  footerPage: {
    color: C.ink3,
    fontFamily: "Helvetica-Bold",
    fontSize: 6.5,
  },
})

// ─── Parsers de contenido ─────────────────────────────────────────────────────

function parseKV(content: string) {
  return content.split("\n")
    .filter(l => l.trim())
    .map(line => {
      const idx = line.indexOf(":")
      if (idx === -1) return { label: "", value: line.trim() }
      return {
        label: line.slice(0, idx).trim(),
        value: line.slice(idx + 1).trim(),
      }
    })
}

function parseJobs(content: string) {
  const lines = content.split("\n")
  const jobs: Array<{ periodo: string; titulo: string; empresa: string; desc: string }> = []
  let cur: { periodo: string; titulo: string; empresa: string; descLines: string[] } | null = null

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue

    // Detecta línea de periodo: formato numérico (06/2020, 2018) o mes textual (Enero 2020)
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
      // Segunda línea: "Rol — Empresa" o "Rol"
      const sep = line.indexOf(" — ")
      if (sep !== -1) {
        cur.titulo  = line.slice(0, sep).trim()
        cur.empresa = line.slice(sep + 3).trim()
      } else {
        cur.titulo = line
      }
    } else {
      cur.descLines.push(line)
    }
  }
  if (cur) jobs.push({ periodo: cur.periodo, titulo: cur.titulo, empresa: cur.empresa, desc: cur.descLines.join(" ") })
  return jobs
}

function parseBullets(content: string) {
  return content.split("\n")
    .map(l => l.trim().replace(/^[-•]\s*/, ""))
    .filter(Boolean)
}

function parseRefs(content: string) {
  // Agrupa por bloques separados por línea en blanco
  const blocks: string[][] = []
  let cur: string[] = []
  for (const line of content.split("\n")) {
    if (!line.trim()) {
      if (cur.length) { blocks.push(cur); cur = [] }
    } else {
      cur.push(line.trim())
    }
  }
  if (cur.length) blocks.push(cur)
  return blocks
}

// ─── Renderers por sección ────────────────────────────────────────────────────

function DatosPersonales({ content }: { content: string }) {
  const pairs = parseKV(content)
  return (
    <View>
      {pairs.map((p, i) => (
        <View key={i} style={s.kvRow}>
          <Text style={s.kvLabel}>{p.label}</Text>
          <Text style={s.kvValue}>{p.value}</Text>
        </View>
      ))}
    </View>
  )
}

function Parrafo({ content }: { content: string }) {
  return <Text style={s.para}>{content}</Text>
}

function Experiencia({ content }: { content: string }) {
  const jobs = parseJobs(content)
  if (!jobs.length) return <Parrafo content={content} />
  return (
    <View>
      {jobs.map((job, i) => (
        <View key={i} style={s.jobBlock} wrap={false}>
          <Text style={s.jobPeriod}>{job.periodo}</Text>
          <Text style={s.jobTitle}>{job.titulo}</Text>
          {!!job.empresa && <Text style={s.jobCompany}>{job.empresa}</Text>}
          {!!job.desc && <Text style={s.jobDesc}>{job.desc}</Text>}
        </View>
      ))}
    </View>
  )
}

function Conocimientos({ content }: { content: string }) {
  const items = parseBullets(content)
  return (
    <View style={s.bulletGrid}>
      {items.map((item, i) => (
        <View key={i} style={s.bulletItem}>
          <Text style={s.bulletDot}>▪</Text>
          <Text style={s.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  )
}

function Formacion({ content }: { content: string }) {
  const items = content.split("\n").filter(l => l.trim())
  return (
    <View>
      {items.map((item, i) => (
        <View key={i} style={{ flexDirection: "row", marginBottom: 4 }}>
          <Text style={s.bulletDot}>▪</Text>
          <Text style={[s.bulletText, { fontSize: 9.5 }]}>{item.trim()}</Text>
        </View>
      ))}
    </View>
  )
}

function Referencias({ content }: { content: string }) {
  const blocks = parseRefs(content)
  return (
    <View>
      {blocks.map((block, i) => (
        <View key={i} style={s.refBlock}>
          <Text style={s.refName}>{block[0]}</Text>
          {block.slice(1).map((line, j) => (
            <Text key={j} style={s.refDetail}>{line}</Text>
          ))}
        </View>
      ))}
    </View>
  )
}

function SectionContent({ title, content }: { title: string; content: string }) {
  if (title === "DATOS PERSONALES")                return <DatosPersonales content={content} />
  if (title === "EXPERIENCIA LABORAL")             return <Experiencia     content={content} />
  if (title.startsWith("CONOCIMIENTOS"))           return <Conocimientos   content={content} />
  if (title === "FORMACIÓN" || title === "FORMACION") return <Formacion   content={content} />
  if (title === "REFERENCIAS")                     return <Referencias     content={content} />
  return <Parrafo content={content} />
}

// ─── Documento final ──────────────────────────────────────────────────────────
export function CVDocument({
  nombre,
  apellido,
  cvTexto,
  fecha,
}: {
  nombre:   string
  apellido: string
  cvTexto:  string
  fecha:    string
}) {
  const sections = parseSections(cvTexto)

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* Margen superior solo en páginas 2+ — página 1 usa el header como full-bleed */}
        <View
          fixed
          render={({ pageNumber }) => pageNumber > 1 ? <View style={s.pageTopGap} /> : null}
        />

        {/* ── Header ───────────────────────────────────────────────────── */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.brandName}>GESTIONES LABORALES</Text>
            <Text style={s.brandSub}>CONSULTORA RRHH AGROPECUARIO</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.cvLabel}>CURRÍCULUM VITAE</Text>
            <Text style={s.candidateName}>{nombre} {apellido}</Text>
          </View>
        </View>
        <View style={s.headerLine} />

        {/* ── Cuerpo ───────────────────────────────────────────────────── */}
        <View style={s.body}>
          {sections.length > 0
            ? sections.map((sec, i) => (
                <View key={i} style={s.section}>
                  {/* Título — se mantiene pegado a al menos las primeras líneas */}
                  <View wrap={false}>
                    <View style={s.sectionTitleRow}>
                      <View style={s.sectionDot} />
                      <Text style={s.sectionTitle}>{sec.title}</Text>
                    </View>
                    <View style={s.sectionRule} />
                  </View>
                  <SectionContent title={sec.title} content={sec.content} />
                </View>
              ))
            : <Text style={s.para}>{cvTexto}</Text>
          }
        </View>

        {/* ── Footer — fijo ─────────────────────────────────────────────── */}
        <View style={s.footer} fixed>
          <Text style={s.footerBrand}>GESTIONES LABORALES</Text>
          <Text style={s.footerMid}>Documento confidencial  ·  {fecha}</Text>
          <Text
            style={s.footerPage}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>

      </Page>
    </Document>
  )
}
