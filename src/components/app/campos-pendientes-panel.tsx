import type { Tables } from "@/lib/supabase/types"

type Candidato   = Tables<"candidatos">
type Experiencia = Tables<"experiencia_laboral">

// Campos del candidato que consideramos importantes
const CAMPOS: { key: keyof Candidato; label: string; grupo: string }[] = [
  { key: "lugar_nacimiento",    label: "Lugar de nacimiento",  grupo: "Personal" },
  { key: "estado_civil",        label: "Estado civil",         grupo: "Personal" },
  { key: "hijos",               label: "Hijos",                grupo: "Personal" },
  { key: "disponibilidad",      label: "Disponibilidad",       grupo: "Condiciones" },
  { key: "pretension_salarial", label: "Pretensión salarial",  grupo: "Condiciones" },
  { key: "movilidad",           label: "Movilidad",            grupo: "Condiciones" },
  { key: "vehiculo_propio",     label: "Vehículo propio",      grupo: "Condiciones" },
  { key: "licencia_conducir",   label: "Licencia de conducir", grupo: "Condiciones" },
  { key: "muebles_propios",     label: "Muebles propios",      grupo: "Campo" },
  { key: "animales",            label: "Animales",             grupo: "Campo" },
  { key: "hectareas_max",       label: "Hectáreas máx.",       grupo: "Capacidad" },
  { key: "personal_a_cargo_max",label: "Personal a cargo",     grupo: "Capacidad" },
]

function isMissing(val: unknown): boolean {
  return val === null || val === undefined || val === ""
}

interface Props {
  candidato:   Candidato
  experiencia: Experiencia[]
}

export function CamposPendientesPanel({ candidato, experiencia }: Props) {
  const pendientes = CAMPOS.filter(c => isMissing(candidato[c.key]))

  // Campos faltantes en experiencia laboral
  const expPendientes: string[] = []
  experiencia.forEach((exp, i) => {
    if (isMissing(exp.ubicacion))                expPendientes.push(`Exp ${i+1}: ubicación`)
    if (isMissing(exp.dimension_establecimiento)) expPendientes.push(`Exp ${i+1}: tamaño establecimiento`)
    if (exp.en_blanco === null)                   expPendientes.push(`Exp ${i+1}: en blanco`)
    if (isMissing(exp.motivo_cambio_o_salida) && exp.hasta !== null)
      expPendientes.push(`Exp ${i+1}: motivo de salida`)
    if (exp.hasta === null) {
      if (isMissing(exp.ingresos_actuales)) expPendientes.push("Trabajo actual: ingresos")
      if (isMissing(exp.beneficios))        expPendientes.push("Trabajo actual: beneficios")
    }
  })

  const total = pendientes.length + expPendientes.length
  if (total === 0) return null

  // Agrupar por grupo
  const grupos = Array.from(new Set(pendientes.map(p => p.grupo)))

  return (
    <div style={{
      background:   "#fafbf8",
      border:       "1px solid #e2e8d9",
      borderRadius: 12,
      padding:      "14px 18px",
    }}>
      <div style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        marginBottom:   12,
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#6b7c5a" }}>
          Pendiente de completar
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: "#8b9e73", background: "#e8f0df",
          padding: "2px 8px", borderRadius: 20,
        }}>
          {total} campo{total !== 1 ? "s" : ""}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {grupos.map(grupo => {
          const items = pendientes.filter(p => p.grupo === grupo)
          return (
            <div key={grupo}>
              <div style={{ fontSize: 9.5, fontWeight: 600, color: "#8b9e73", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 5 }}>
                {grupo}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {items.map(c => (
                  <span key={c.key} style={{
                    fontSize: 11.5, color: "#5a6e48",
                    background: "#edf2e6", border: "1px solid #d4e0c4",
                    borderRadius: 6, padding: "2px 8px",
                  }}>
                    {c.label}
                  </span>
                ))}
              </div>
            </div>
          )
        })}

        {expPendientes.length > 0 && (
          <div>
            <div style={{ fontSize: 9.5, fontWeight: 600, color: "#8b9e73", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 5 }}>
              Experiencia laboral
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {expPendientes.map(e => (
                <span key={e} style={{
                  fontSize: 11.5, color: "#5a6e48",
                  background: "#edf2e6", border: "1px solid #d4e0c4",
                  borderRadius: 6, padding: "2px 8px",
                }}>
                  {e}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <p style={{ fontSize: 11, color: "#8b9e73", marginTop: 10, marginBottom: 0 }}>
        Se completan a medida que el candidato responde las preguntas de WhatsApp.
      </p>
    </div>
  )
}
