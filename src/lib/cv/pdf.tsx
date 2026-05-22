import path from "path"
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer"
import type { Tables } from "@/lib/supabase/types"

type Candidato   = Tables<"candidatos">
type Experiencia = Tables<"experiencia_laboral">
type Referencia  = { nombre: string; contacto: string; relacion: string }

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

const PL = 52
const PR = 48
const PT = 52

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page:          { backgroundColor: C.white, fontFamily: "Helvetica", paddingBottom: 48 },
  brandFixed:    { position: "absolute", top: 24, right: PR, width: 90, height: "auto" },
  body:          { paddingLeft: PL, paddingRight: PR, paddingTop: PT },
  candidatoHeader: { marginBottom: 22, borderBottomWidth: 1.5, borderBottomColor: C.olive, paddingBottom: 10 },
  candidatoNombre: { fontFamily: "Helvetica-Bold", fontSize: 22, color: C.ink, letterSpacing: -0.5 },
  candidatoSub:  { fontSize: 8, color: C.ink3, marginTop: 4, letterSpacing: 2 },
  section:       { marginBottom: 16 },
  sectionTitle:  {
    fontFamily: "Helvetica-Bold", fontSize: 11, color: C.olive, letterSpacing: 1.2,
    textTransform: "uppercase", borderBottomWidth: 1, borderBottomColor: C.olive,
    paddingBottom: 3, marginBottom: 10,
  },
  kvRow:         { flexDirection: "row", marginBottom: 4, paddingLeft: 4 },
  kvLabel:       { fontFamily: "Helvetica-Bold", fontSize: 9.5, color: C.ink3, width: 130 },
  kvValue:       { flex: 1, fontSize: 9.5, color: C.ink2, lineHeight: 1.5 },
  jobBlock:      { marginBottom: 12 },
  jobPeriod:     { fontFamily: "Helvetica-Bold", fontSize: 8, color: C.olive, letterSpacing: 0.5, marginBottom: 2 },
  jobTitle:      { fontFamily: "Helvetica-Bold", fontSize: 11, color: C.ink, marginBottom: 1 },
  jobCompany:    { fontFamily: "Helvetica-BoldOblique", fontSize: 9.5, color: C.ink2, marginBottom: 5 },
  jobMeta:       { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 4 },
  jobMetaItem:   { flexDirection: "row", fontSize: 9 },
  jobMetaLabel:  { fontFamily: "Helvetica-Bold", color: C.ink3 },
  jobMetaValue:  { color: C.ink2 },
  jobDesc:       { fontSize: 9.5, color: C.ink2, lineHeight: 1.7, textAlign: "justify" },
  refBlock:      { marginBottom: 8, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: C.border },
  refName:       { fontFamily: "Helvetica-Bold", fontSize: 9.5, color: C.ink, marginBottom: 2 },
  refDetail:     { fontSize: 9, color: C.ink3 },
  para:          { fontSize: 9.5, color: C.ink2, lineHeight: 1.72, textAlign: "justify" },
  tag:           { fontSize: 9, color: C.ink2, marginBottom: 3, marginRight: 12 },
  footer:        {
    position: "absolute", bottom: 0, left: 0, right: 0, height: 36,
    paddingLeft: PL, paddingRight: PR, borderTopWidth: 1, borderTopColor: C.border,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: C.white,
  },
  footerBrand:   { fontFamily: "Helvetica-Bold", fontSize: 7, color: C.olive, letterSpacing: 1.5 },
  footerMid:     { fontSize: 7, color: C.ink3, letterSpacing: 0.3 },
  footerPage:    { fontFamily: "Helvetica-Bold", fontSize: 7, color: C.olive, letterSpacing: 0.5 },
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFecha(d: string | null): string {
  if (!d) return "Actualidad"
  const [y, m] = d.split("-")
  return m && m !== "01" ? `${m}/${y}` : y
}

function calcEdad(fechaNac: string): number | null {
  const b = new Date(fechaNac)
  if (isNaN(b.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - b.getFullYear()
  if (today.getMonth() - b.getMonth() < 0 || (today.getMonth() - b.getMonth() === 0 && today.getDate() < b.getDate())) age--
  return age
}

// ─── Secciones PDF ────────────────────────────────────────────────────────────

function KVRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value?.trim()) return null
  return (
    <View style={s.kvRow}>
      <Text style={s.kvLabel}>{label}:</Text>
      <Text style={s.kvValue}>{value}</Text>
    </View>
  )
}

function DatosPersonalesPDF({ c }: { c: Candidato }) {
  const edad = c.fecha_nacimiento ? calcEdad(c.fecha_nacimiento) : null
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Datos Personales</Text>
      <KVRow label="Nombre y Apellido" value={`${c.nombre} ${c.apellido}`} />
      {c.fecha_nacimiento && (
        <KVRow label="Fecha de nacimiento" value={edad != null ? `${c.fecha_nacimiento} (${edad} años)` : c.fecha_nacimiento} />
      )}
      <KVRow label="DNI"            value={c.dni} />
      <KVRow label="Domicilio"      value={c.domicilio_completo ?? c.ubicacion} />
      <KVRow label="Teléfono"       value={c.telefono} />
      <KVRow label="Email"          value={c.email} />
      <KVRow label="Estado civil"   value={c.estado_civil} />
      <KVRow label="Hijos"          value={c.hijos} />
      <KVRow label="Estudios"       value={c.educacion} />
      {c.vehiculo_propio !== null && <KVRow label="Vehículo propio"  value={c.vehiculo_propio ? "Sí" : "No"} />}
      {c.licencia_conducir !== null && <KVRow label="Licencia conducir" value={c.licencia_conducir ? "Sí" : "No"} />}
      <KVRow label="Muebles propios" value={c.muebles_propios} />
      <KVRow label="Animales"       value={c.animales} />
    </View>
  )
}

function ExperienciaPDF({ experiencia }: { experiencia: Experiencia[] }) {
  if (!experiencia.length) return null
  const sorted = [...experiencia].sort((a, b) => {
    if (a.hasta === null) return -1
    if (b.hasta === null) return  1
    return (b.desde ?? "").localeCompare(a.desde ?? "")
  })
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Experiencia Laboral</Text>
      {sorted.map((exp, idx) => {
        const label = exp.hasta === null ? "TRABAJO ACTUAL" : `TRABAJO ANTERIOR ${sorted.filter(e => e.hasta !== null).indexOf(exp) + 1}`
        const periodo = `${formatFecha(exp.desde)} – ${formatFecha(exp.hasta)}`
        return (
          <View key={exp.id} style={s.jobBlock} wrap={false}>
            {/* Label pequeño */}
            <Text style={s.jobPeriod}>{label}</Text>

            {/* Cargo + Período — misma fila */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 3 }}>
              <Text style={[s.jobTitle, { flex: 1, marginBottom: 0 }]}>
                {exp.rol || "sin dato"}
              </Text>
              <Text style={{ fontSize: 8.5, color: C.ink3, fontFamily: "Helvetica" }}>{periodo}</Text>
            </View>

            {/* Establecimiento · Ubicación */}
            {(exp.empresa || exp.ubicacion) && (
              <Text style={{ fontSize: 9.5, color: C.ink2, marginBottom: 5, fontFamily: "Helvetica-Bold" }}>
                {[exp.empresa, exp.ubicacion].filter(Boolean).join("  ·  ")}
              </Text>
            )}

            {/* Meta: Propietario, Hectáreas, Personal, En blanco */}
            <View style={s.jobMeta}>
              {exp.nombre_propietario       && <View style={s.jobMetaItem}><Text style={s.jobMetaLabel}>Propietario: </Text><Text style={s.jobMetaValue}>{exp.nombre_propietario}</Text></View>}
              {exp.dimension_establecimiento && <View style={s.jobMetaItem}><Text style={s.jobMetaLabel}>Hectáreas: </Text><Text style={s.jobMetaValue}>{exp.dimension_establecimiento}</Text></View>}
              {exp.personal_a_cargo          && <View style={s.jobMetaItem}><Text style={s.jobMetaLabel}>Personal: </Text><Text style={s.jobMetaValue}>{exp.personal_a_cargo}</Text></View>}
              {exp.en_blanco !== null         && <View style={s.jobMetaItem}><Text style={s.jobMetaLabel}>En blanco: </Text><Text style={s.jobMetaValue}>{exp.en_blanco ? "Sí" : "No"}</Text></View>}
            </View>

            {/* Tareas */}
            {exp.descripcion && <Text style={s.jobDesc}>{exp.descripcion}</Text>}

            {/* Ingresos / Beneficios / Motivo */}
            <View style={s.jobMeta}>
              {exp.hasta === null && exp.ingresos_actuales && (
                <View style={s.jobMetaItem}><Text style={s.jobMetaLabel}>Ingresos actuales: </Text><Text style={s.jobMetaValue}>{exp.ingresos_actuales}</Text></View>
              )}
              {exp.hasta === null && exp.beneficios && (
                <View style={s.jobMetaItem}><Text style={s.jobMetaLabel}>Beneficios: </Text><Text style={s.jobMetaValue}>{exp.beneficios}</Text></View>
              )}
              {exp.motivo_cambio_o_salida && (
                <View style={s.jobMetaItem}>
                  <Text style={s.jobMetaLabel}>Motivo de {exp.hasta === null ? "cambio" : "salida"}: </Text>
                  <Text style={s.jobMetaValue}>{exp.motivo_cambio_o_salida}</Text>
                </View>
              )}
            </View>
          </View>
        )
      })}
    </View>
  )
}

// ─── CVTextoDocument: renderiza desde cv_procesado_texto ─────────────────────

function parseSectionsPDF(texto: string): Array<{ title: string | null; lines: string[] }> {
  const sections: Array<{ title: string | null; lines: string[] }> = []
  let current: { title: string | null; lines: string[] } = { title: null, lines: [] }

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

// ─── Helpers CVTextoDocument ──────────────────────────────────────────────────

const PRIMARY_KEYS_PDF = new Set([
  "cargo", "establecimiento",
  "período", "periodo",
  "ubicación", "ubicacion",
  "tareas", "descripción", "descripcion",
])

function splitJobsPDF(lines: string[]): { preLines: string[]; blocks: Array<{ header: string; lines: string[] }> } {
  const preLines: string[] = []
  const blocks: Array<{ header: string; lines: string[] }> = []
  let cur: { header: string; lines: string[] } | null = null
  for (const line of lines) {
    const t = line.trim()
    if (t.startsWith("▸")) {
      if (cur) blocks.push(cur)
      cur = { header: t.replace(/^▸\s*/, ""), lines: [] }
    } else if (cur) {
      cur.lines.push(line)
    } else {
      preLines.push(line)
    }
  }
  if (cur) blocks.push(cur)
  return { preLines, blocks }
}

function extractJobFieldsPDF(lines: string[]) {
  const fields: Record<string, string> = {}
  const metadata: Array<{ label: string; value: string }> = []
  for (const line of lines) {
    const t = line.trim()
    if (!t) continue
    const kv = t.match(/^([^:]+?):\s*(.+)$/)
    if (kv && kv[1].length < 50) {
      const key = kv[1].trim().toLowerCase()
      if (PRIMARY_KEYS_PDF.has(key)) {
        fields[key] = kv[2].trim()
      } else {
        metadata.push({ label: kv[1].trim(), value: kv[2].trim() })
      }
    }
  }
  return {
    cargo:           fields["cargo"]            ?? "",
    establecimiento: fields["establecimiento"]  ?? "",
    periodo:         fields["período"]  ?? fields["periodo"]  ?? "",
    ubicacion:       fields["ubicación"] ?? fields["ubicacion"] ?? "",
    tareas:          fields["tareas"] ?? fields["descripción"] ?? fields["descripcion"] ?? "",
    metadata,
  }
}

function parseKVLines(lines: string[]): Array<{ label: string; value: string }> {
  return lines
    .map(l => l.trim())
    .filter(Boolean)
    .map(t => {
      const kv = t.match(/^([^:]+?):\s*(.+)$/)
      if (kv && kv[1].length < 50) return { label: kv[1].trim(), value: kv[2].trim() }
      return null
    })
    .filter(Boolean) as Array<{ label: string; value: string }>
}

function renderLinePDF(line: string, idx: number) {
  const t = line.trim()
  if (!t) return <View key={idx} style={{ height: 3 }} />
  if (t.startsWith("•")) {
    return (
      <View key={idx} style={{ flexDirection: "row", marginBottom: 3 }}>
        <Text style={{ color: C.olive, marginRight: 5, fontSize: 9.5 }}>•</Text>
        <Text style={{ flex: 1, fontSize: 9.5, color: C.ink2, lineHeight: 1.55 }}>{t.replace(/^•\s*/, "")}</Text>
      </View>
    )
  }
  return (
    <Text key={idx} style={{ fontSize: 9.5, color: C.ink2, lineHeight: 1.72, marginBottom: 3 }}>{t}</Text>
  )
}

export function CVTextoDocument({
  candidato,
  fecha,
}: {
  candidato: Candidato
  fecha:     string
}) {
  const sections = parseSectionsPDF(candidato.cv_procesado_texto ?? "")

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Image src={LOGO_LEYENDA} style={s.brandFixed} fixed />
        <View fixed render={({ pageNumber }) => pageNumber > 1 ? <View style={{ height: 64 }} /> : null} />

        <View style={s.body}>
          <View style={s.candidatoHeader}>
            <Text style={s.candidatoNombre}>{candidato.nombre} {candidato.apellido}</Text>
            <Text style={s.candidatoSub}>CURRÍCULUM VITAE</Text>
          </View>

          {sections.map((sec, si) => {
            if (!sec.title) {
              return <View key={si}>{sec.lines.map((l, li) => renderLinePDF(l, li))}</View>
            }

            const { preLines, blocks } = splitJobsPDF(sec.lines)

            // DATOS PERSONALES — grilla 2 columnas
            if (sec.title === "DATOS PERSONALES") {
              const pairs = parseKVLines(sec.lines)
              return (
                <View key={si} style={s.section}>
                  <Text style={s.sectionTitle}>{sec.title}</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                    {pairs.map((p, pi) => {
                      const sinDato = p.value === "sin dato"
                      return (
                        <View key={pi} style={{ width: "50%", paddingRight: 12, marginBottom: 7 }}>
                          <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: C.ink3, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 1 }}>
                            {p.label}
                          </Text>
                          <Text style={{ fontSize: 9.5, color: sinDato ? C.ink3 : C.ink2, fontStyle: sinDato ? "italic" : "normal" }}>
                            {p.value}
                          </Text>
                        </View>
                      )
                    })}
                  </View>
                </View>
              )
            }

            return (
              <View key={si} style={s.section}>
                <Text style={s.sectionTitle}>{sec.title}</Text>
                {preLines.map((l, li) => renderLinePDF(l, li))}
                {blocks.map((block, bi) => {
                  const f = extractJobFieldsPDF(block.lines)
                  const isSinDato = (v: string) => !v || v === "sin dato"
                  return (
                    <View key={bi} wrap={false} style={{ marginBottom: 12, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: C.olive }}>
                      {/* Tipo */}
                      <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 7, color: C.olive, letterSpacing: 0.8, opacity: 0.7, marginBottom: 4 }}>
                        {block.header.toUpperCase()}
                      </Text>

                      {/* Cargo + Período — misma fila */}
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 3 }}>
                        <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 11, color: isSinDato(f.cargo) ? C.ink3 : C.ink, flex: 1 }}>
                          {isSinDato(f.cargo) ? "sin dato" : f.cargo}
                        </Text>
                        {!isSinDato(f.periodo) && (
                          <Text style={{ fontSize: 8, color: C.ink3, fontFamily: "Helvetica" }}>{f.periodo}</Text>
                        )}
                      </View>

                      {/* Establecimiento · Ubicación */}
                      {(!isSinDato(f.establecimiento) || !isSinDato(f.ubicacion)) && (
                        <Text style={{ fontSize: 9.5, fontFamily: "Helvetica-Bold", color: C.olive, marginBottom: 5 }}>
                          {[
                            isSinDato(f.establecimiento) ? null : f.establecimiento,
                            isSinDato(f.ubicacion) ? null : f.ubicacion,
                          ].filter(Boolean).join("  ·  ")}
                        </Text>
                      )}

                      {/* Metadata — grilla 2 columnas */}
                      {f.metadata.length > 0 && (
                        <View style={{ flexDirection: "row", flexWrap: "wrap", backgroundColor: "rgba(42,74,24,0.05)", borderRadius: 3, padding: 5, marginBottom: 5 }}>
                          {f.metadata.map((m, mi) => {
                            const sinD = m.value === "sin dato"
                            return (
                              <View key={mi} style={{ width: "50%", paddingRight: 8, marginBottom: 4 }}>
                                <Text style={{ fontSize: 7, fontFamily: "Helvetica-Bold", color: C.ink3, letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 1 }}>
                                  {m.label}
                                </Text>
                                <Text style={{ fontSize: 9, color: sinD ? C.ink3 : C.ink2 }}>
                                  {m.value}
                                </Text>
                              </View>
                            )
                          })}
                        </View>
                      )}

                      {/* Tareas */}
                      {!isSinDato(f.tareas) && (
                        <Text style={{ fontSize: 9.5, color: C.ink2, lineHeight: 1.65 }}>
                          {f.tareas}
                        </Text>
                      )}
                    </View>
                  )
                })}
              </View>
            )
          })}
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerBrand}>GESTIONES LABORALES</Text>
          <Text style={s.footerMid}>{fecha}</Text>
          <Text style={s.footerPage} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}

// ─── Documento ────────────────────────────────────────────────────────────────

export function CVDocument({
  candidato,
  experiencia,
  fecha,
}: {
  candidato:   Candidato
  experiencia: Experiencia[]
  fecha:       string
}) {
  const refs: Referencia[] = (candidato.referencias as Referencia[] | null) ?? []
  const conocimientos = [...(candidato.idiomas ?? []), ...(candidato.tipos_ganaderia ?? [])]

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Image src={LOGO_LEYENDA} style={s.brandFixed} fixed />
        <View fixed render={({ pageNumber }) => pageNumber > 1 ? <View style={{ height: 64 }} /> : null} />

        <View style={s.body}>
          {/* Nombre */}
          <View style={s.candidatoHeader}>
            <Text style={s.candidatoNombre}>{candidato.nombre} {candidato.apellido}</Text>
            <Text style={s.candidatoSub}>CURRÍCULUM VITAE</Text>
          </View>

          <DatosPersonalesPDF c={candidato} />

          {candidato.perfil_laboral && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Perfil Laboral</Text>
              <Text style={s.para}>{candidato.perfil_laboral}</Text>
            </View>
          )}

          <ExperienciaPDF experiencia={experiencia} />

          {candidato.educacion && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Formación</Text>
              <Text style={s.para}>{candidato.educacion}</Text>
            </View>
          )}

          {conocimientos.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Conocimientos</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {conocimientos.map((k, i) => <Text key={i} style={s.tag}>▪ {k}</Text>)}
              </View>
            </View>
          )}

          {refs.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Referencias</Text>
              {refs.map((ref, i) => (
                <View key={i} style={s.refBlock}>
                  <Text style={s.refName}>{ref.nombre}</Text>
                  {ref.contacto && <Text style={s.refDetail}>{ref.contacto}</Text>}
                  {ref.relacion && <Text style={s.refDetail}>{ref.relacion}</Text>}
                </View>
              ))}
            </View>
          )}

          {(candidato.pretension_salarial || candidato.disponibilidad) && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Condiciones</Text>
              <KVRow label="Pretensión salarial" value={candidato.pretension_salarial} />
              <KVRow label="Disponibilidad"      value={candidato.disponibilidad} />
            </View>
          )}
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerBrand}>GESTIONES LABORALES</Text>
          <Text style={s.footerMid}>{fecha}</Text>
          <Text style={s.footerPage} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
