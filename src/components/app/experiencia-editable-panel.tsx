"use client"

import { useState, useTransition } from "react"
import { Pencil, Trash2, Plus, Check, X, ChevronDown, ChevronUp } from "lucide-react"
import { updateExperienciaFields, addExperiencia, deleteExperiencia } from "@/lib/actions/candidatos"
import type { Tables } from "@/lib/supabase/types"

type Exp = Tables<"experiencia_laboral">

// ── Estilos ───────────────────────────────────────────────────────────────────

const OLIVE     = "#2a4a18"
const OLIVE_BG  = "#eef5e8"
const INK       = "#0d1117"
const INK3      = "#8b949e"
const BORDER    = "#eaecef"
const BORDER_MD = "#d4d8de"

const inputStyle: React.CSSProperties = {
  width: "100%", border: `1px solid ${BORDER_MD}`, background: "#fff",
  color: INK, borderRadius: "0.5rem", padding: "0.4rem 0.6rem",
  fontSize: "13px", fontFamily: "inherit", outline: "none",
}
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "10.5px", fontWeight: 600,
  letterSpacing: "0.07em", textTransform: "uppercase", color: INK3, marginBottom: "0.3rem",
}

function Row({ children, cols = 2 }: { children: React.ReactNode; cols?: number }) {
  return <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: "0.65rem" }}>{children}</div>
}

function Field({ label, value, onChange, multiline, type = "text", placeholder }: {
  label: string; value: string; onChange: (v: string) => void
  multiline?: boolean; type?: string; placeholder?: string
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {multiline
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            rows={3} style={{ ...inputStyle, resize: "vertical", minHeight: 60 }} />
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
      }
    </div>
  )
}

function BoolSelect({ label, value, onChange }: {
  label: string; value: boolean | null; onChange: (v: boolean | null) => void
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <select
        value={value === true ? "si" : value === false ? "no" : ""}
        onChange={e => onChange(e.target.value === "si" ? true : e.target.value === "no" ? false : null)}
        style={inputStyle}
      >
        <option value="">Sin datos</option>
        <option value="si">Sí</option>
        <option value="no">No</option>
      </select>
    </div>
  )
}

// ── Formato fecha ─────────────────────────────────────────────────────────────

function fmtFecha(d: string | null) {
  if (!d) return "Actualidad"
  const [y, m] = d.split("-")
  return m && m !== "01" ? `${m}/${y}` : y ?? d
}

function periodoLabel(exp: Exp) {
  return `${fmtFecha(exp.desde)} – ${fmtFecha(exp.hasta)}`
}

// ── Formulario de edición de un trabajo ──────────────────────────────────────

type DraftExp = {
  empresa: string; nombre_propietario: string; rol: string
  desde: string; hasta: string; esActual: boolean
  ubicacion: string; dimension_establecimiento: string
  descripcion: string; personal_a_cargo: string
  en_blanco: boolean | null
  ingresos_actuales: string; beneficios: string; motivo_cambio_o_salida: string
}

function toDraft(exp: Partial<Exp>): DraftExp {
  return {
    empresa:                  exp.empresa ?? "",
    nombre_propietario:       exp.nombre_propietario ?? "",
    rol:                      exp.rol ?? "",
    desde:                    exp.desde ?? "",
    hasta:                    exp.hasta ?? "",
    esActual:                 exp.hasta == null,
    ubicacion:                exp.ubicacion ?? "",
    dimension_establecimiento: exp.dimension_establecimiento ?? "",
    descripcion:              exp.descripcion ?? "",
    personal_a_cargo:         exp.personal_a_cargo ?? "",
    en_blanco:                exp.en_blanco ?? null,
    ingresos_actuales:        exp.ingresos_actuales ?? "",
    beneficios:               exp.beneficios ?? "",
    motivo_cambio_o_salida:   exp.motivo_cambio_o_salida ?? "",
  }
}

function fromDraft(d: DraftExp): Partial<Exp> {
  // empresa y rol son NOT NULL en la DB — si están vacíos se omiten (undefined = no actualizar)
  // el resto son nullable — null limpia el valor en la DB
  return {
    empresa:                   d.empresa.trim() || undefined,
    rol:                       d.rol.trim() || undefined,
    nombre_propietario:        d.nombre_propietario.trim() || null,
    desde:                     d.desde.trim() || null,
    hasta:                     d.esActual ? null : (d.hasta.trim() || null),
    ubicacion:                 d.ubicacion.trim() || null,
    dimension_establecimiento: d.dimension_establecimiento.trim() || null,
    descripcion:               d.descripcion.trim() || null,
    personal_a_cargo:          d.personal_a_cargo.trim() || null,
    en_blanco:                 d.en_blanco,
    ingresos_actuales:         d.esActual ? (d.ingresos_actuales.trim() || null) : null,
    beneficios:                d.esActual ? (d.beneficios.trim() || null) : null,
    motivo_cambio_o_salida:    !d.esActual ? (d.motivo_cambio_o_salida.trim() || null) : null,
  }
}

function ExpForm({
  draft, onChange, onSave, onCancel, saving, isNew = false,
}: {
  draft: DraftExp
  onChange: (d: DraftExp) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
  isNew?: boolean
}) {
  function set<K extends keyof DraftExp>(key: K, val: DraftExp[K]) {
    onChange({ ...draft, [key]: val })
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", padding: "1rem", background: "#f8faf6", borderRadius: 10, border: `1px solid ${OLIVE_BG}` }}>
      <Row>
        <Field label="Cargo / Puesto" value={draft.rol} onChange={v => set("rol", v)} placeholder="Capataz general" />
        <BoolSelect label="Trabajo actual" value={draft.esActual ? true : false}
          onChange={v => set("esActual", v === true)} />
      </Row>
      <Row>
        <Field label="Establecimiento" value={draft.empresa} onChange={v => set("empresa", v)} placeholder="La Pampeana" />
        <Field label="Propietario" value={draft.nombre_propietario} onChange={v => set("nombre_propietario", v)} placeholder="Juan Pérez" />
      </Row>
      <Row>
        <Field label="Desde (AAAA-MM)" value={draft.desde} onChange={v => set("desde", v)} placeholder="2019-03" />
        {!draft.esActual && (
          <Field label="Hasta (AAAA-MM)" value={draft.hasta} onChange={v => set("hasta", v)} placeholder="2023-12" />
        )}
      </Row>
      <Row>
        <Field label="Ubicación" value={draft.ubicacion} onChange={v => set("ubicacion", v)} placeholder="Córdoba" />
        <Field label="Dimensión / Hectáreas" value={draft.dimension_establecimiento} onChange={v => set("dimension_establecimiento", v)} placeholder="5.000 ha" />
      </Row>
      <Row>
        <Field label="Personal a cargo" value={draft.personal_a_cargo} onChange={v => set("personal_a_cargo", v)} placeholder="3 personas" />
        <BoolSelect label="En blanco" value={draft.en_blanco} onChange={v => set("en_blanco", v)} />
      </Row>
      <Field label="Tareas realizadas" value={draft.descripcion} onChange={v => set("descripcion", v)} multiline placeholder="Descripción de las tareas..." />
      {draft.esActual ? (
        <Row>
          <Field label="Ingresos actuales" value={draft.ingresos_actuales} onChange={v => set("ingresos_actuales", v)} placeholder="$500.000" />
          <Field label="Beneficios" value={draft.beneficios} onChange={v => set("beneficios", v)} placeholder="Vivienda, combustible..." />
        </Row>
      ) : (
        <Field label="Motivo de salida" value={draft.motivo_cambio_o_salida} onChange={v => set("motivo_cambio_o_salida", v)} placeholder="Búsqueda de mejor oportunidad..." />
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", paddingTop: "0.25rem" }}>
        <button type="button" onClick={onCancel} disabled={saving}
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "0.4rem 0.85rem", fontSize: 12, fontWeight: 500, color: INK3, background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 8, cursor: "pointer" }}>
          <X style={{ width: 12, height: 12 }} /> Cancelar
        </button>
        <button type="button" onClick={onSave} disabled={saving}
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "0.4rem 0.85rem", fontSize: 12, fontWeight: 600, color: "#fff", background: OLIVE, border: "none", borderRadius: 8, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
          <Check style={{ width: 12, height: 12 }} />
          {saving ? "Guardando…" : isNew ? "Agregar" : "Guardar"}
        </button>
      </div>
    </div>
  )
}

// ── Card de un trabajo (lectura) ──────────────────────────────────────────────

function ExpCard({
  exp, candidatoId, onDelete,
}: {
  exp: Exp; candidatoId: string; onDelete: () => void
}) {
  const [editing, setEditing]   = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [draft, setDraft]       = useState<DraftExp>(() => toDraft(exp))
  const [saving, startSave]     = useTransition()
  const [deleting, startDel]    = useTransition()

  function handleSave() {
    startSave(async () => {
      await updateExperienciaFields(exp.id, candidatoId, fromDraft(draft) as Parameters<typeof updateExperienciaFields>[2])
      setEditing(false)
    })
  }

  function handleDelete() {
    if (!confirm("¿Eliminar este trabajo del historial?")) return
    startDel(async () => {
      await deleteExperiencia(exp.id, candidatoId)
      onDelete()
    })
  }

  const esActual = exp.hasta == null

  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, overflow: "hidden", background: "#fff" }}>
      {/* Header siempre visible */}
      <div style={{ padding: "0.75rem 1rem", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {esActual && (
              <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: OLIVE, background: OLIVE_BG, padding: "2px 8px", borderRadius: 20 }}>
                Actual
              </span>
            )}
            <span style={{ fontSize: 14, fontWeight: 700, color: INK }}>
              {exp.rol ?? "Sin cargo"}
            </span>
          </div>
          <div style={{ fontSize: 12.5, color: INK3, marginTop: 2 }}>
            {exp.empresa ?? "Sin establecimiento"}
            {exp.ubicacion ? ` · ${exp.ubicacion}` : ""}
          </div>
          <div style={{ fontSize: 11, color: INK3, marginTop: 1 }}>{periodoLabel(exp)}</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <button type="button" onClick={() => { setEditing(true); setExpanded(true) }}
            style={{ padding: "4px 8px", fontSize: 11, fontWeight: 600, color: OLIVE, background: OLIVE_BG, border: `1px solid rgba(42,74,24,0.2)`, borderRadius: 7, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
            <Pencil style={{ width: 11, height: 11 }} /> Editar
          </button>
          <button type="button" onClick={handleDelete} disabled={deleting}
            style={{ padding: "4px 7px", color: "#dc2626", background: "transparent", border: `1px solid #fca5a5`, borderRadius: 7, cursor: "pointer", display: "flex", alignItems: "center" }}>
            <Trash2 style={{ width: 11, height: 11 }} />
          </button>
          <button type="button" onClick={() => setExpanded(v => !v)}
            style={{ padding: "4px 6px", color: INK3, background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 7, cursor: "pointer", display: "flex", alignItems: "center" }}>
            {expanded ? <ChevronUp style={{ width: 12, height: 12 }} /> : <ChevronDown style={{ width: 12, height: 12 }} />}
          </button>
        </div>
      </div>

      {/* Detalle colapsable */}
      {expanded && !editing && (
        <div style={{ padding: "0.5rem 1rem 0.875rem", borderTop: `1px solid ${BORDER}`, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "0.6rem 1.5rem" }}>
          {[
            { label: "Propietario",    val: exp.nombre_propietario },
            { label: "Hectáreas",      val: exp.dimension_establecimiento },
            { label: "Personal",       val: exp.personal_a_cargo },
            { label: "En blanco",      val: exp.en_blanco === true ? "Sí" : exp.en_blanco === false ? "No" : null },
            { label: "Ingresos",       val: exp.ingresos_actuales },
            { label: "Beneficios",     val: exp.beneficios },
            { label: "Motivo salida",  val: exp.motivo_cambio_o_salida },
          ].filter(f => f.val).map(f => (
            <div key={f.label}>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: INK3 }}>{f.label}</div>
              <div style={{ fontSize: 12.5, color: INK, marginTop: 1 }}>{f.val}</div>
            </div>
          ))}
          {exp.descripcion && (
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: INK3, marginBottom: 3 }}>Tareas</div>
              <p style={{ fontSize: 12.5, color: INK3, lineHeight: 1.6, margin: 0 }}>{exp.descripcion}</p>
            </div>
          )}
        </div>
      )}

      {/* Form de edición */}
      {editing && (
        <div style={{ padding: "0.5rem 0.75rem 0.75rem", borderTop: `1px solid ${BORDER}` }}>
          <ExpForm
            draft={draft}
            onChange={setDraft}
            onSave={handleSave}
            onCancel={() => { setEditing(false); setDraft(toDraft(exp)) }}
            saving={saving}
          />
        </div>
      )}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export function ExperienciaEditablePanel({
  candidatoId,
  initialExperiencia,
}: {
  candidatoId: string
  initialExperiencia: Exp[]
}) {
  const [experiencia, setExperiencia] = useState(initialExperiencia)
  const [addingNew, setAddingNew]     = useState(false)
  const [newDraft, setNewDraft]       = useState<DraftExp>(() => toDraft({}))
  const [saving, startSave]           = useTransition()

  function handleAddSave() {
    startSave(async () => {
      const fields = fromDraft(newDraft) as Parameters<typeof addExperiencia>[1]
      const result = await addExperiencia(candidatoId, { ...fields, orden: experiencia.length } as Parameters<typeof addExperiencia>[1])
      if (result.success) {
        setAddingNew(false)
        setNewDraft(toDraft({}))
      }
    })
  }

  return (
    <div className="rounded-2xl border p-6" style={{ background: "#fff", borderColor: BORDER, boxShadow: "0 2px 8px rgba(13,17,23,0.05)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: INK }}>Trayectoria laboral</h2>
        {!addingNew && (
          <button type="button" onClick={() => { setAddingNew(true); setNewDraft(toDraft({})) }}
            style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: OLIVE, background: OLIVE_BG, border: `1px solid rgba(42,74,24,0.2)`, borderRadius: 8, padding: "5px 12px", cursor: "pointer" }}>
            <Plus style={{ width: 13, height: 13 }} /> Agregar trabajo
          </button>
        )}
      </div>

      {experiencia.length === 0 && !addingNew && (
        <div style={{ textAlign: "center", padding: "2rem 0", color: INK3, fontSize: 13 }}>
          Sin experiencia laboral registrada
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {experiencia.map((exp) => (
          <ExpCard
            key={exp.id}
            exp={exp}
            candidatoId={candidatoId}
            onDelete={() => setExperiencia(prev => prev.filter(e => e.id !== exp.id))}
          />
        ))}
      </div>

      {addingNew && (
        <div style={{ marginTop: experiencia.length > 0 ? "0.75rem" : 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: OLIVE, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
            Nuevo trabajo
          </div>
          <ExpForm
            draft={newDraft}
            onChange={setNewDraft}
            onSave={handleAddSave}
            onCancel={() => setAddingNew(false)}
            saving={saving}
            isNew
          />
        </div>
      )}
    </div>
  )
}
