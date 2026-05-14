import type { Tables } from "@/lib/supabase/types"

type Candidato   = Tables<"candidatos">
type Experiencia = Tables<"experiencia_laboral">
type Referencia  = { nombre: string; contacto: string; relacion: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPeriodo(desde: string | null, hasta: string | null): string {
  const fmt = (d: string) => {
    const [y, m] = d.split("-")
    return m && m !== "01" ? `${m}/${y}` : y
  }
  const desdeStr = desde ? fmt(desde) : "?"
  return `${desdeStr} — ${hasta ? fmt(hasta) : "Actualidad"}`
}

function calcEdad(fechaNac: string): number | null {
  const b = new Date(fechaNac)
  if (isNaN(b.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - b.getFullYear()
  if (today.getMonth() - b.getMonth() < 0 || (today.getMonth() - b.getMonth() === 0 && today.getDate() < b.getDate())) age--
  return age
}

// ─── Paleta ───────────────────────────────────────────────────────────────────

const OLIVE  = "#2a4a18"
const INK    = "#0d1117"
const INK2   = "#3d4451"
const INK3   = "#8b949e"
const BORDER = "#eaecef"

// ─── Componentes de layout ────────────────────────────────────────────────────

function CVSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        fontSize:      10,
        fontWeight:    700,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        color:         OLIVE,
        borderBottom:  `1.5px solid ${OLIVE}`,
        paddingBottom: 4,
        marginBottom:  12,
      }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function KVRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value?.trim()) return null
  return (
    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 8, marginBottom: 5, alignItems: "baseline" }}>
      <span style={{ fontSize: 11.5, color: INK3, fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 12.5, color: INK2 }}>{value}</span>
    </div>
  )
}

// ─── Secciones ────────────────────────────────────────────────────────────────

function DatosPersonales({ c }: { c: Candidato }) {
  const edad = c.fecha_nacimiento ? calcEdad(c.fecha_nacimiento) : null

  return (
    <CVSection title="Datos Personales">
      <KVRow label="Nombre y Apellido" value={`${c.nombre} ${c.apellido}`} />
      {c.fecha_nacimiento && (
        <KVRow
          label="Fecha de nac."
          value={edad != null ? `${c.fecha_nacimiento} (${edad} años)` : c.fecha_nacimiento}
        />
      )}
      <KVRow label="DNI"            value={c.dni} />
      <KVRow label="Domicilio"      value={c.domicilio_completo ?? c.ubicacion} />
      <KVRow label="Teléfono"       value={c.telefono} />
      <KVRow label="Email"          value={c.email} />
      <KVRow label="Estado civil"   value={c.estado_civil} />
      <KVRow label="Hijos"          value={c.hijos} />
      <KVRow label="Estudios"       value={c.educacion} />
      {c.vehiculo_propio !== null && (
        <KVRow label="Vehículo propio"  value={c.vehiculo_propio ? "Sí" : "No"} />
      )}
      {c.licencia_conducir !== null && (
        <KVRow label="Licencia conducir" value={c.licencia_conducir ? "Sí" : "No"} />
      )}
      <KVRow label="Muebles propios" value={c.muebles_propios} />
      <KVRow label="Animales"        value={c.animales} />
    </CVSection>
  )
}

function ExperienciaSection({ experiencia }: { experiencia: Experiencia[] }) {
  if (!experiencia.length) return null
  return (
    <CVSection title="Experiencia Laboral">
      {experiencia.map((exp) => (
        <div
          key={exp.id}
          style={{ marginBottom: 16, paddingLeft: 10, borderLeft: `2px solid ${BORDER}` }}
        >
          <div style={{ fontSize: 10.5, color: OLIVE, fontWeight: 700, letterSpacing: "0.05em", marginBottom: 3 }}>
            {formatPeriodo(exp.desde, exp.hasta)}
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: INK, marginBottom: 1 }}>
            {exp.rol} — {exp.empresa}
          </div>
          {exp.nombre_propietario && (
            <div style={{ fontSize: 11.5, color: INK3, marginBottom: 2 }}>
              <span style={{ fontWeight: 600 }}>Propietario: </span>{exp.nombre_propietario}
            </div>
          )}
          {exp.ubicacion && (
            <div style={{ fontSize: 11.5, color: INK3, marginBottom: 2 }}>
              <span style={{ fontWeight: 600 }}>Ubicación: </span>{exp.ubicacion}
            </div>
          )}
          <div style={{ display: "flex", gap: 16, marginBottom: 2 }}>
            {exp.dimension_establecimiento && (
              <div style={{ fontSize: 11.5, color: INK3 }}>
                <span style={{ fontWeight: 600 }}>Establecimiento: </span>{exp.dimension_establecimiento}
              </div>
            )}
            {exp.personal_a_cargo && (
              <div style={{ fontSize: 11.5, color: INK3 }}>
                <span style={{ fontWeight: 600 }}>Personal a cargo: </span>{exp.personal_a_cargo}
              </div>
            )}
          </div>
          {exp.en_blanco !== null && (
            <div style={{ fontSize: 11.5, color: INK3, marginBottom: 2 }}>
              <span style={{ fontWeight: 600 }}>En blanco: </span>
              <span style={{ color: exp.en_blanco ? OLIVE : "#cf222e", fontWeight: 600 }}>
                {exp.en_blanco ? "Sí" : "No"}
              </span>
            </div>
          )}
          {exp.descripcion && (
            <div style={{ fontSize: 12.5, color: INK2, lineHeight: 1.7, marginTop: 5 }}>
              {exp.descripcion}
            </div>
          )}
          {exp.hasta === null && exp.ingresos_actuales && (
            <div style={{ fontSize: 11.5, color: INK3, marginTop: 4 }}>
              <span style={{ fontWeight: 600 }}>Ingresos actuales: </span>{exp.ingresos_actuales}
            </div>
          )}
          {exp.hasta === null && exp.beneficios && (
            <div style={{ fontSize: 11.5, color: INK3, marginTop: 2 }}>
              <span style={{ fontWeight: 600 }}>Beneficios: </span>{exp.beneficios}
            </div>
          )}
          {exp.motivo_cambio_o_salida && (
            <div style={{ fontSize: 11.5, color: INK3, marginTop: 2 }}>
              <span style={{ fontWeight: 600 }}>Motivo de {exp.hasta === null ? "cambio" : "salida"}: </span>
              {exp.motivo_cambio_o_salida}
            </div>
          )}
        </div>
      ))}
    </CVSection>
  )
}

function ReferenciasSection({ refs }: { refs: Referencia[] }) {
  if (!refs.length) return null
  return (
    <CVSection title="Referencias">
      {refs.map((ref, i) => (
        <div key={i} style={{ marginBottom: 12, paddingLeft: 10, borderLeft: `2px solid ${BORDER}` }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: INK, marginBottom: 2 }}>{ref.nombre}</div>
          {ref.contacto && <div style={{ fontSize: 11.5, color: INK3 }}>{ref.contacto}</div>}
          {ref.relacion && <div style={{ fontSize: 11.5, color: INK3 }}>{ref.relacion}</div>}
        </div>
      ))}
    </CVSection>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function CandidatoCVView({
  candidato,
  experiencia,
}: {
  candidato:   Candidato
  experiencia: Experiencia[]
}) {
  const refs: Referencia[] = (candidato.referencias as Referencia[] | null) ?? []
  const conocimientos = [
    ...(candidato.idiomas ?? []),
    ...(candidato.tipos_ganaderia ?? []),
  ]

  return (
    <div
      style={{
        background:   "#fff",
        borderRadius: 16,
        border:       `1px solid ${BORDER}`,
        boxShadow:    "0 4px 32px rgba(13,17,23,0.08)",
        overflow:     "hidden",
      }}
    >
      {/* Header */}
      <div style={{
        background:    OLIVE,
        padding:       "20px 28px 16px",
        display:       "flex",
        alignItems:    "flex-start",
        justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)" }}>
            Gestiones Laborales
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginTop: 4, letterSpacing: "-0.02em" }}>
            {candidato.nombre} {candidato.apellido}
          </div>
          {candidato.ultimo_puesto && (
            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>
              {candidato.ultimo_puesto}
            </div>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)" }}>
            Currículum Vitae
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", marginTop: 3 }}>
            {new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })}
          </div>
        </div>
      </div>

      {/* Cuerpo */}
      <div style={{ padding: "24px 28px" }}>

        <DatosPersonales c={candidato} />

        {candidato.perfil_laboral && (
          <CVSection title="Perfil Laboral">
            <p style={{ fontSize: 12.5, color: INK2, lineHeight: 1.75, margin: 0 }}>
              {candidato.perfil_laboral}
            </p>
          </CVSection>
        )}

        <ExperienciaSection experiencia={experiencia} />

        {candidato.educacion && (
          <CVSection title="Formación">
            <p style={{ fontSize: 12.5, color: INK2, margin: 0 }}>{candidato.educacion}</p>
          </CVSection>
        )}

        {conocimientos.length > 0 && (
          <CVSection title="Conocimientos">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {conocimientos.map((k, i) => (
                <span key={i} style={{
                  fontSize: 11.5, fontWeight: 500,
                  background: "rgba(42,74,24,0.08)", color: OLIVE,
                  padding: "3px 10px", borderRadius: 6,
                }}>
                  {k}
                </span>
              ))}
            </div>
          </CVSection>
        )}

        <ReferenciasSection refs={refs} />

        {(candidato.pretension_salarial || candidato.disponibilidad) && (
          <CVSection title="Condiciones">
            <KVRow label="Pretensión salarial" value={candidato.pretension_salarial} />
            <KVRow label="Disponibilidad"      value={candidato.disponibilidad} />
          </CVSection>
        )}
      </div>

      {/* Footer */}
      <div style={{
        borderTop:      `1px solid ${BORDER}`,
        padding:        "8px 28px",
        display:        "flex",
        justifyContent: "space-between",
        alignItems:     "center",
      }}>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: OLIVE }}>
          Gestiones Laborales
        </span>
        <span style={{ fontSize: 9, color: INK3 }}>
          {new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })}
        </span>
      </div>
    </div>
  )
}
