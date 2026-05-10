import path from "path"
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer"
import { parseSections, parseKV, parseJobs, parseBullets, parseRefs } from "./utils"

// ─── Paleta ───────────────────────────────────────────────────────────────────
const C = {
  olive:  "#45602a",
  ink:    "#1a1d23",
  ink2:   "#3d4451",
  ink3:   "#6b7280",
  border: "#d1d5db",
  white:  "#ffffff",
}

// ─── Assets ───────────────────────────────────────────────────────────────────
const LOGO_LEYENDA = path.join(process.cwd(), "public", "brand", "logo-leyenda.png")

// ─── Márgenes ─────────────────────────────────────────────────────────────────
const PL = 52
const PR = 48
const PT = 52   // top padding (espacio para la marca fija)

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({

  page: {
    backgroundColor: C.white,
    fontFamily:      "Helvetica",
    paddingBottom:   48,
  },

  // ── MARCA FIJA (top-right en todas las páginas) ───────────────────────────
  brandFixed: {
    position:  "absolute",
    top:       24,
    right:     PR,
    width:     90,
    height:    "auto",
  },

  // ── BODY ──────────────────────────────────────────────────────────────────
  body: {
    paddingLeft:  PL,
    paddingRight: PR,
    paddingTop:   PT,
  },

  // ── NOMBRE DEL CANDIDATO (primera página) ─────────────────────────────────
  candidatoHeader: {
    marginBottom: 22,
    borderBottomWidth: 1.5,
    borderBottomColor: C.olive,
    paddingBottom: 10,
  },
  candidatoNombre: {
    fontFamily:    "Helvetica-Bold",
    fontSize:      22,
    color:         C.ink,
    letterSpacing: -0.5,
  },
  candidatoSub: {
    fontSize:  8,
    color:     C.ink3,
    marginTop: 4,
    letterSpacing: 2,
  },

  // ── SECTION ───────────────────────────────────────────────────────────────
  section: {
    marginBottom: 16,
  },

  sectionTitle: {
    fontFamily:      "Helvetica-Bold",
    fontSize:        11,
    color:           C.olive,
    letterSpacing:   1.2,
    textTransform:   "uppercase",
    borderBottomWidth: 1,
    borderBottomColor: C.olive,
    paddingBottom:   3,
    marginBottom:    10,
  },

  // ── BULLETS (datos personales y formación) ────────────────────────────────
  bulletRow: {
    flexDirection: "row",
    marginBottom:  4,
    paddingLeft:   4,
  },
  bulletDot: {
    color:     C.olive,
    fontSize:  9,
    width:     12,
    marginTop: 0.5,
  },
  bulletLabel: {
    fontFamily:  "Helvetica-Bold",
    fontSize:    9.5,
    color:       C.ink3,
    marginRight: 3,
  },
  bulletValue: {
    flex:       1,
    fontSize:   9.5,
    color:      C.ink2,
    lineHeight: 1.5,
  },

  // ── EXPERIENCIA ───────────────────────────────────────────────────────────
  jobBlock: {
    marginBottom: 12,
  },
  jobPeriod: {
    fontFamily:    "Helvetica-Bold",
    fontSize:      8,
    color:         C.olive,
    letterSpacing: 0.5,
    marginBottom:  2,
  },
  jobTitle: {
    fontFamily:   "Helvetica-Bold",
    fontSize:     11,
    color:        C.ink,
    marginBottom: 1,
  },
  jobCompany: {
    fontFamily:   "Helvetica-BoldOblique",
    fontSize:     9.5,
    color:        C.ink2,
    marginBottom: 5,
  },
  jobBulletRow: {
    flexDirection: "row",
    marginBottom:  3,
    paddingLeft:   4,
  },
  jobBulletDot: {
    color:    C.ink3,
    fontSize: 9,
    width:    12,
  },
  jobBulletText: {
    flex:       1,
    fontSize:   9.5,
    color:      C.ink2,
    lineHeight: 1.6,
  },
  jobDesc: {
    fontSize:   9.5,
    color:      C.ink2,
    lineHeight: 1.7,
    textAlign:  "justify",
  },

  // ── BULLETS GRID (conocimientos) ──────────────────────────────────────────
  bulletGrid: {
    flexDirection: "row",
    flexWrap:      "wrap",
  },
  bulletGridItem: {
    width:         "50%",
    flexDirection: "row",
    marginBottom:  4,
    paddingRight:  8,
  },

  // ── REFERENCIAS ───────────────────────────────────────────────────────────
  refBlock: {
    marginBottom:    8,
    paddingLeft:     10,
    borderLeftWidth: 2,
    borderLeftColor: C.border,
  },
  refName: {
    fontFamily:   "Helvetica-Bold",
    fontSize:     9.5,
    color:        C.ink,
    marginBottom: 2,
  },
  refDetail: {
    fontSize: 9,
    color:    C.ink3,
  },

  // ── PÁRRAFO GENÉRICO ──────────────────────────────────────────────────────
  para: {
    fontSize:   9.5,
    color:      C.ink2,
    lineHeight: 1.72,
    textAlign:  "justify",
  },

  // ── FOOTER ────────────────────────────────────────────────────────────────
  footer: {
    position:        "absolute",
    bottom:          0,
    left:            0,
    right:           0,
    height:          36,
    paddingLeft:     PL,
    paddingRight:    PR,
    borderTopWidth:  1,
    borderTopColor:  C.border,
    flexDirection:   "row",
    alignItems:      "center",
    justifyContent:  "space-between",
    backgroundColor: C.white,
  },
  footerBrand: {
    fontFamily:    "Helvetica-Bold",
    fontSize:      7,
    color:         C.olive,
    letterSpacing: 1.5,
  },
  footerMid: {
    fontSize:      7,
    color:         C.ink3,
    letterSpacing: 0.3,
  },
  footerPage: {
    fontFamily:    "Helvetica-Bold",
    fontSize:      7,
    color:         C.olive,
    letterSpacing: 0.5,
  },
})

// ─── Renderers ────────────────────────────────────────────────────────────────

function DatosPersonales({ content }: { content: string }) {
  const pairs = parseKV(content)
  return (
    <View>
      {pairs.map((p, i) => (
        <View key={i} style={s.bulletRow}>
          <Text style={s.bulletDot}>•</Text>
          {p.label
            ? (
              <>
                <Text style={s.bulletLabel}>{p.label}:</Text>
                <Text style={s.bulletValue}>{p.value}</Text>
              </>
            )
            : <Text style={s.bulletValue}>{p.value}</Text>
          }
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
      {jobs.map((job, i) => {
        const lines = job.desc
          ? job.desc.split("\n").map(l => l.replace(/^[-•]\s*/, "").trim()).filter(Boolean)
          : []

        return (
          <View key={i} style={s.jobBlock} wrap={false}>
            {!!job.periodo && <Text style={s.jobPeriod}>{job.periodo}</Text>}
            {!!job.titulo  && <Text style={s.jobTitle}>{job.titulo}</Text>}
            {!!job.empresa && <Text style={s.jobCompany}>{job.empresa}</Text>}
            {lines.length > 1
              ? lines.map((line, j) => (
                  <View key={j} style={s.jobBulletRow}>
                    <Text style={s.jobBulletDot}>•</Text>
                    <Text style={s.jobBulletText}>{line}</Text>
                  </View>
                ))
              : !!job.desc && <Text style={s.jobDesc}>{job.desc}</Text>
            }
          </View>
        )
      })}
    </View>
  )
}

function Formacion({ content }: { content: string }) {
  const items = content.split("\n").map(l => l.replace(/^[-•]\s*/, "").trim()).filter(Boolean)
  return (
    <View>
      {items.map((item, i) => (
        <View key={i} style={s.bulletRow}>
          <Text style={s.bulletDot}>•</Text>
          <Text style={s.bulletValue}>{item}</Text>
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
        <View key={i} style={s.bulletGridItem}>
          <Text style={s.bulletDot}>•</Text>
          <Text style={[s.bulletValue, { fontSize: 9 }]}>{item}</Text>
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
  if (title === "DATOS PERSONALES")                   return <DatosPersonales content={content} />
  if (title === "EXPERIENCIA LABORAL")                return <Experiencia     content={content} />
  if (title.startsWith("CONOCIMIENTOS"))              return <Conocimientos   content={content} />
  if (title === "FORMACIÓN" || title === "FORMACION") return <Formacion       content={content} />
  if (title === "REFERENCIAS")                        return <Referencias     content={content} />
  return <Parrafo content={content} />
}

// ─── Documento ────────────────────────────────────────────────────────────────
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

        {/* Marca GL — fija en todas las páginas, esquina superior derecha */}
        <Image src={LOGO_LEYENDA} style={s.brandFixed} fixed />

        {/* Espaciador para páginas 2+ — deja aire bajo la marca fija */}
        <View fixed render={({ pageNumber }) => pageNumber > 1 ? <View style={{ height: 64 }} /> : null} />

        {/* Cuerpo */}
        <View style={s.body}>

          {/* Nombre del candidato — solo página 1 */}
          <View style={s.candidatoHeader}>
            <Text style={s.candidatoNombre}>{nombre} {apellido}</Text>
            <Text style={s.candidatoSub}>CURRÍCULUM VITAE</Text>
          </View>

          {/* Secciones */}
          {sections.length > 0
            ? sections.map((sec, i) => (
                <View key={i} style={s.section}>
                  <View wrap={false}>
                    <Text style={s.sectionTitle}>{sec.title}</Text>
                  </View>
                  <SectionContent title={sec.title} content={sec.content} />
                </View>
              ))
            : <Text style={s.para}>{cvTexto}</Text>
          }
        </View>

        {/* Footer — fijo en todas las páginas */}
        <View style={s.footer} fixed>
          <Text style={s.footerBrand}>GESTIONES LABORALES</Text>
          <Text style={s.footerMid}>{fecha}</Text>
          <Text
            style={s.footerPage}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>

      </Page>
    </Document>
  )
}
