import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"
import { parseSections } from "./utils"

// ─── Paleta GL ────────────────────────────────────────────────────────────────
const C = {
  olive:      "#2a4a18",
  oliveMid:   "#3d6b24",
  oliveBg:    "#eef5e8",
  oliveFaint: "#d4e6c3",
  ink:        "#0d1117",
  ink2:       "#3d4451",
  ink3:       "#8b949e",
  border:     "#e2e6ea",
  white:      "#ffffff",
  pageBg:     "#f7f8f9",
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({

  // Página
  page: {
    backgroundColor: C.pageBg,
    fontFamily: "Helvetica",
    paddingBottom: 48,
  },

  // Barra lateral izquierda — va fija en todas las páginas
  sideBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    backgroundColor: C.olive,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    backgroundColor: C.olive,
    paddingLeft: 44,
    paddingRight: 36,
    paddingTop: 30,
    paddingBottom: 26,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  brandName: {
    color: C.white,
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    letterSpacing: 2,
  },
  brandSub: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 6.5,
    letterSpacing: 2,
    marginTop: 4,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  cvLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 6.5,
    letterSpacing: 2.5,
    marginBottom: 5,
  },
  candidateName: {
    color: C.white,
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  // Separador dentro del header
  headerRule: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginTop: 16,
    marginBottom: 12,
  },

  // ── Cuerpo ──────────────────────────────────────────────────────────────────
  body: {
    paddingLeft:  44,
    paddingRight: 36,
    paddingTop:   22,
    backgroundColor: C.white,
    marginLeft: 5,           // respeta el sidebar
  },

  // ── Secciones ───────────────────────────────────────────────────────────────
  section: {
    marginBottom: 16,
  },

  // Cabecera de sección — NO se separa del contenido
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  sectionAccent: {
    width: 3,
    height: 9,
    backgroundColor: C.olive,
    marginRight: 7,
    borderRadius: 1,
  },
  sectionTitle: {
    color: C.olive,
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    letterSpacing: 2,
    flexShrink: 1,
  },

  // Línea divisora de sección
  sectionRule: {
    height: 1,
    backgroundColor: C.border,
    marginBottom: 8,
  },

  // Contenido
  sectionContent: {
    color: C.ink2,
    fontSize: 10,
    lineHeight: 1.72,
  },

  // ── Footer ──────────────────────────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 0,
    left: 5,       // respeta sidebar
    right: 0,
    height: 36,
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingLeft:  39,
    paddingRight: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  footerBrand: {
    color: C.olive,
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    letterSpacing: 1,
  },
  footerDot: {
    color: C.border,
    fontSize: 8,
  },
  footerMuted: {
    color: C.ink3,
    fontSize: 7,
  },
  footerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  footerPage: {
    color: C.ink3,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
  },
})

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

        {/* Barra lateral izquierda — fija en todas las páginas */}
        <View style={s.sideBar} fixed />

        {/* ── Header ────────────────────────────────────────────────────── */}
        <View style={s.header}>
          <View style={s.headerTop}>
            {/* Marca */}
            <View>
              <Text style={s.brandName}>GESTIONES LABORALES</Text>
              <Text style={s.brandSub}>CONSULTORA RRHH AGROPECUARIO</Text>
            </View>
            {/* Candidato */}
            <View style={s.headerRight}>
              <Text style={s.cvLabel}>CURRÍCULUM VITAE</Text>
              <Text style={s.candidateName}>{nombre} {apellido}</Text>
            </View>
          </View>

          {/* Línea divisora interna */}
          <View style={s.headerRule} />

          {/* Fecha de generación */}
          <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 6.5, letterSpacing: 1 }}>
            Documento generado el {fecha}
          </Text>
        </View>

        {/* ── Cuerpo ────────────────────────────────────────────────────── */}
        <View style={s.body}>
          {sections.length > 0
            ? sections.map((sec, i) => (
                <View key={i} style={s.section}>

                  {/* Título + regla: se mantienen juntos con el inicio del contenido */}
                  <View wrap={false}>
                    <View style={s.sectionHeader}>
                      <View style={s.sectionAccent} />
                      <Text style={s.sectionTitle}>{sec.title}</Text>
                    </View>
                    <View style={s.sectionRule} />

                    {/* Primera parte del contenido pegada al título (evita huérfanos) */}
                    <Text style={s.sectionContent}>
                      {sec.content.split("\n").slice(0, 3).join("\n")}
                    </Text>
                  </View>

                  {/* Resto del contenido — puede fluir a la página siguiente */}
                  {sec.content.split("\n").length > 3 && (
                    <Text style={s.sectionContent}>
                      {sec.content.split("\n").slice(3).join("\n")}
                    </Text>
                  )}

                </View>
              ))
            : (
                <View style={s.section}>
                  <Text style={s.sectionContent}>{cvTexto}</Text>
                </View>
              )
          }
        </View>

        {/* ── Footer — fijo en todas las páginas ────────────────────────── */}
        <View style={s.footer} fixed>
          <View style={s.footerLeft}>
            <Text style={s.footerBrand}>GESTIONES LABORALES</Text>
            <Text style={s.footerDot}>·</Text>
            <Text style={s.footerMuted}>Documento confidencial</Text>
            <Text style={s.footerDot}>·</Text>
            <Text style={s.footerMuted}>{fecha}</Text>
          </View>
          <View style={s.footerRight}>
            <Text
              style={s.footerPage}
              render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
            />
          </View>
        </View>

      </Page>
    </Document>
  )
}
