import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"
import { parseSections } from "./utils"

const GL = {
  olive:     "#2a4a18",
  oliveLight:"#3d6b24",
  oliveBg:   "#eef5e8",
  ink:       "#0d1117",
  ink2:      "#3d4451",
  ink3:      "#8b949e",
  border:    "#eaecef",
  white:     "#ffffff",
}

const s = StyleSheet.create({
  page: {
    backgroundColor: GL.white,
    paddingBottom: 52,
    fontFamily: "Helvetica",
  },

  // ── Header ──
  header: {
    backgroundColor: GL.olive,
    paddingHorizontal: 40,
    paddingTop: 28,
    paddingBottom: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  brandName: {
    color: GL.white,
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.5,
  },
  brandSub: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 7,
    letterSpacing: 1.8,
    marginTop: 5,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  cvLabel: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 7,
    letterSpacing: 2,
    marginBottom: 5,
  },
  candidateName: {
    color: GL.white,
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
  },

  // ── Accent bar ──
  accentBar: {
    height: 3,
    backgroundColor: GL.oliveLight,
    opacity: 0.4,
  },

  // ── Body ──
  body: {
    paddingHorizontal: 40,
    paddingTop: 26,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    color: GL.olive,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 2,
    marginBottom: 6,
  },
  sectionRule: {
    height: 1,
    backgroundColor: GL.border,
    marginBottom: 9,
  },
  sectionContent: {
    color: GL.ink2,
    fontSize: 9.5,
    lineHeight: 1.7,
  },

  // ── Footer ──
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    borderTopWidth: 1,
    borderTopColor: GL.border,
    paddingHorizontal: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  footerBrand: {
    color: GL.olive,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
  },
  footerSep: {
    color: GL.border,
    fontSize: 7,
  },
  footerText: {
    color: GL.ink3,
    fontSize: 7,
  },
})

// ── Documento ────────────────────────────────────────────────────────────────
export function CVDocument({
  nombre,
  apellido,
  cvTexto,
  fecha,
}: {
  nombre: string
  apellido: string
  cvTexto: string
  fecha: string
}) {
  const sections = parseSections(cvTexto)

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.brandName}>GESTIONES LABORALES</Text>
            <Text style={s.brandSub}>CONSULTORA RRHH AGROPECUARIO</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.cvLabel}>CURRÍCULUM VITAE</Text>
            <Text style={s.candidateName}>{nombre} {apellido}</Text>
          </View>
        </View>

        <View style={s.accentBar} />

        {/* Body */}
        <View style={s.body}>
          {sections.length > 0
            ? sections.map((sec, i) => (
                <View key={i} style={s.section} wrap={false}>
                  <Text style={s.sectionTitle}>{sec.title}</Text>
                  <View style={s.sectionRule} />
                  <Text style={s.sectionContent}>{sec.content}</Text>
                </View>
              ))
            : (
                <View style={s.section}>
                  <Text style={s.sectionContent}>{cvTexto}</Text>
                </View>
              )
          }
        </View>

        {/* Footer — se repite en cada página */}
        <View style={s.footer} fixed>
          <View style={s.footerLeft}>
            <Text style={s.footerBrand}>GESTIONES LABORALES</Text>
            <Text style={s.footerSep}>·</Text>
            <Text style={s.footerText}>Documento confidencial</Text>
          </View>
          <Text style={s.footerText}>{fecha}</Text>
        </View>

      </Page>
    </Document>
  )
}
