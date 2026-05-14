"use client"

import { useState, useTransition, useRef, useCallback } from "react"
import { toast } from "sonner"
import { Plus, Trash2 } from "lucide-react"
import {
  updateCandidatoFields,
  updateExperienciaFields,
  addExperiencia,
  deleteExperiencia,
} from "@/lib/actions/candidatos"
import type { Tables } from "@/lib/supabase/types"

type Candidato    = Tables<"candidatos">
type Experiencia  = Tables<"experiencia_laboral">
type Referencia   = { nombre: string; contacto: string; relacion: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPeriodo(desde: string, hasta: string | null): string {
  const fmt = (d: string) => {
    const [y, m] = d.split("-")
    return m && m !== "01" ? `${m}/${y}` : y
  }
  return `${fmt(desde)} — ${hasta ? fmt(hasta) : "Actualidad"}`
}

function calcEdad(fechaNac: string): number | null {
  const b = new Date(fechaNac)
  if (isNaN(b.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - b.getFullYear()
  if (today.getMonth() - b.getMonth() < 0 || (today.getMonth() - b.getMonth() === 0 && today.getDate() < b.getDate())) age--
  return age
}

// ─── Estilos compartidos ──────────────────────────────────────────────────────

const OLIVE   = "#2a4a18"
const INK     = "#0d1117"
const INK2    = "#3d4451"
const INK3    = "#8b949e"
const BORDER  = "#eaecef"

// ─── InlineField — el campo editable ─────────────────────────────────────────

interface InlineFieldProps {
  value:      string | null | undefined
  onSave:     (val: string) => Promise<void>
  multiline?: boolean
  placeholder?: string
  style?:     React.CSSProperties
  emptyText?: string
  disabled?:  boolean
}

function InlineField({ value, onSave, multiline, placeholder, style, emptyText = "—", disabled }: InlineFieldProps) {
  const [editing, setEditing]   = useState(false)
  const [local,   setLocal]     = useState("")
  const [saving,  startSave]    = useTransition()
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null)

  const display = value?.trim() || emptyText

  function startEdit() {
    if (disabled) return
    setLocal(value ?? "")
    setEditing(true)
    setTimeout(() => ref.current?.focus(), 0)
  }

  function commit() {
    const trimmed = local.trim()
    if (trimmed === (value ?? "").trim()) { setEditing(false); return }
    startSave(async () => {
      await onSave(trimmed)
      setEditing(false)
    })
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !multiline) { e.preventDefault(); commit() }
    if (e.key === "Escape") { setEditing(false) }
  }

  const baseStyle: React.CSSProperties = {
    fontFamily: "inherit",
    fontSize:   "inherit",
    color:      "inherit",
    lineHeight: "inherit",
    fontWeight: "inherit",
    background: "transparent",
    border:     "none",
    outline:    "none",
    padding:    0,
    margin:     0,
    width:      "100%",
    resize:     "none",
    ...style,
  }

  const editingStyle: React.CSSProperties = {
    ...baseStyle,
    background:   "rgba(42,74,24,0.04)",
    borderBottom: `1.5px solid ${OLIVE}`,
    borderRadius:  "2px 2px 0 0",
    padding:       "1px 3px",
  }

  if (editing) {
    const El = multiline ? "textarea" : "input"
    return (
      <El
        ref={ref as React.RefObject<HTMLTextAreaElement & HTMLInputElement>}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        rows={multiline ? 3 : undefined}
        style={multiline ? { ...editingStyle, minHeight: 60 } : editingStyle}
        disabled={saving}
      />
    )
  }

  return (
    <span
      onClick={startEdit}
      title={disabled ? undefined : "Clic para editar"}
      style={{
        cursor:       disabled ? "default" : "text",
        opacity:      saving ? 0.5 : 1,
        color:        value?.trim() ? "inherit" : INK3,
        borderBottom: disabled ? "none" : `1px dashed transparent`,
        transition:   "border-color 0.15s",
        ...style,
      }}
      onMouseEnter={(e) => { if (!disabled) (e.currentTarget as HTMLElement).style.borderBottomColor = BORDER }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderBottomColor = "transparent" }}
    >
      {display}
    </span>
  )
}

// ─── CV Section wrapper ───────────────────────────────────────────────────────

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

// ─── KV row ───────────────────────────────────────────────────────────────────

function KVRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 8, marginBottom: 5, alignItems: "baseline" }}>
      <span style={{ fontSize: 11.5, color: INK3, fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 12.5, color: INK2 }}>{children}</span>
    </div>
  )
}

// ─── Sección DATOS PERSONALES ─────────────────────────────────────────────────

function DatosPersonales({ c, save }: { c: Candidato; save: (f: Partial<Candidato>) => Promise<void> }) {
  const edad = c.fecha_nacimiento ? calcEdad(c.fecha_nacimiento) : null

  return (
    <CVSection title="Datos Personales">
      <KVRow label="Nombre y Apellido">
        <span style={{ fontWeight: 700, color: INK }}>
          <InlineField value={c.nombre}   onSave={(v) => save({ nombre: v })}   style={{ fontWeight: 700, color: INK }} />
          {" "}
          <InlineField value={c.apellido} onSave={(v) => save({ apellido: v })} style={{ fontWeight: 700, color: INK }} />
        </span>
      </KVRow>
      {(c.fecha_nacimiento || true) && (
        <KVRow label="Fecha de nac.">
          <InlineField
            value={c.fecha_nacimiento ?? ""}
            onSave={(v) => save({ fecha_nacimiento: v || null })}
            placeholder="YYYY-MM-DD"
          />
          {edad != null && <span style={{ color: INK3, fontSize: 11, marginLeft: 6 }}>({edad} años)</span>}
        </KVRow>
      )}
      <KVRow label="DNI">
        <InlineField value={c.dni} onSave={(v) => save({ dni: v || null })} placeholder="Sin datos" />
      </KVRow>
      <KVRow label="Domicilio">
        <InlineField
          value={c.domicilio_completo || c.ubicacion}
          onSave={(v) => save({ domicilio_completo: v || null, ubicacion: v || null })}
          placeholder="Sin datos"
        />
      </KVRow>
      <KVRow label="Teléfono">
        <InlineField value={c.telefono} onSave={(v) => save({ telefono: v || null })} placeholder="Sin datos" />
      </KVRow>
      <KVRow label="Email">
        <InlineField value={c.email} onSave={(v) => save({ email: v || null })} placeholder="Sin datos" />
      </KVRow>
      <KVRow label="Estado civil">
        <InlineField value={c.estado_civil} onSave={(v) => save({ estado_civil: v || null })} placeholder="Sin datos" />
      </KVRow>
      <KVRow label="Hijos">
        <InlineField value={c.hijos} onSave={(v) => save({ hijos: v || null })} placeholder="Sin datos" />
      </KVRow>
      <KVRow label="Estudios">
        <InlineField value={c.educacion} onSave={(v) => save({ educacion: v || null })} placeholder="Sin datos" />
      </KVRow>
      <KVRow label="Vehículo propio">
        <BoolField value={c.vehiculo_propio} onSave={(v) => save({ vehiculo_propio: v })} />
      </KVRow>
      <KVRow label="Licencia conducir">
        <BoolField value={c.licencia_conducir} onSave={(v) => save({ licencia_conducir: v })} />
      </KVRow>
      {(c.muebles_propios || true) && (
        <KVRow label="Muebles propios">
          <InlineField value={c.muebles_propios} onSave={(v) => save({ muebles_propios: v || null })} placeholder="Sin datos" />
        </KVRow>
      )}
      {(c.animales || true) && (
        <KVRow label="Animales">
          <InlineField value={c.animales} onSave={(v) => save({ animales: v || null })} placeholder="Sin datos" />
        </KVRow>
      )}
    </CVSection>
  )
}

// ─── Bool field ───────────────────────────────────────────────────────────────

function BoolField({ value, onSave }: { value: boolean | null; onSave: (v: boolean | null) => Promise<void> }) {
  const [saving, startSave] = useTransition()
  const label = value === true ? "Sí" : value === false ? "No" : "—"
  const cycle = () => {
    const next = value === null ? true : value === true ? false : null
    startSave(() => onSave(next))
  }
  return (
    <span
      onClick={cycle}
      title="Clic para cambiar"
      style={{
        cursor:        "pointer",
        fontSize:      12.5,
        color:         value === true ? OLIVE : value === false ? "#cf222e" : INK3,
        fontWeight:    value !== null ? 600 : 400,
        opacity:       saving ? 0.5 : 1,
        borderBottom:  "1px dashed transparent",
        transition:    "border-color 0.15s",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderBottomColor = BORDER }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderBottomColor = "transparent" }}
    >
      {label}
    </span>
  )
}

// ─── Sección EXPERIENCIA LABORAL ──────────────────────────────────────────────

function ExperienciaSection({
  experiencia,
  candidatoId,
}: {
  experiencia: Experiencia[]
  candidatoId: string
}) {
  const [adding, startAdd] = useTransition()

  async function saveExp(expId: string, fields: Partial<Experiencia>) {
    const result = await updateExperienciaFields(expId, candidatoId, fields)
    if (!result.success) toast.error(result.error)
  }

  async function handleAdd() {
    startAdd(async () => {
      const result = await addExperiencia(candidatoId, {
        empresa: "Nueva empresa",
        rol:     "Cargo",
        desde:   `${new Date().getFullYear()}-01-01`,
        hasta:   null,
        orden:   experiencia.length,
      })
      if (!result.success) toast.error(result.error)
    })
  }

  async function handleDelete(expId: string) {
    const result = await deleteExperiencia(expId, candidatoId)
    if (!result.success) toast.error(result.error)
  }

  return (
    <CVSection title="Experiencia Laboral">
      {experiencia.map((exp) => (
        <ExpBlock key={exp.id} exp={exp} onSave={(f) => saveExp(exp.id, f)} onDelete={() => handleDelete(exp.id)} />
      ))}
      {experiencia.length === 0 && (
        <p style={{ fontSize: 12.5, color: INK3, fontStyle: "italic" }}>Sin experiencia cargada.</p>
      )}
      <button
        onClick={handleAdd}
        disabled={adding}
        style={{
          display:     "inline-flex",
          alignItems:  "center",
          gap:         4,
          marginTop:   8,
          fontSize:    11.5,
          color:       OLIVE,
          background:  "transparent",
          border:      `1px dashed ${OLIVE}`,
          borderRadius: 6,
          padding:     "4px 10px",
          cursor:      "pointer",
          opacity:     adding ? 0.5 : 1,
        }}
      >
        <Plus style={{ width: 12, height: 12 }} /> Agregar empleo
      </button>
    </CVSection>
  )
}

function ExpBlock({ exp, onSave, onDelete }: { exp: Experiencia; onSave: (f: Partial<Experiencia>) => Promise<void>; onDelete: () => void }) {
  const [hovering, setHovering] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      style={{
        marginBottom:  16,
        paddingLeft:   10,
        borderLeft:    `2px solid ${hovering ? OLIVE : BORDER}`,
        transition:    "border-color 0.15s",
        position:      "relative",
      }}
    >
      {/* Período */}
      <div style={{ fontSize: 10.5, color: OLIVE, fontWeight: 700, letterSpacing: "0.05em", marginBottom: 3 }}>
        <InlineField
          value={formatPeriodo(exp.desde, exp.hasta)}
          onSave={() => Promise.resolve()}
          disabled
          style={{ fontSize: 10.5, color: OLIVE, fontWeight: 700 }}
        />
        <span style={{ marginLeft: 8, fontSize: 10, color: INK3 }}>
          {/* editar fechas por separado */}
          desde{" "}
          <InlineField value={exp.desde} onSave={(v) => onSave({ desde: v })} style={{ fontSize: 10, color: INK3 }} />
          {" — "}
          <InlineField value={exp.hasta ?? ""} onSave={(v) => onSave({ hasta: v || null })} placeholder="Actualidad" style={{ fontSize: 10, color: INK3 }} />
        </span>
      </div>

      {/* Cargo — Empresa */}
      <div style={{ fontSize: 14, fontWeight: 700, color: INK, marginBottom: 1 }}>
        <InlineField value={exp.rol}     onSave={(v) => onSave({ rol: v })}     style={{ fontWeight: 700, color: INK, fontSize: 14 }} />
        {" — "}
        <InlineField value={exp.empresa} onSave={(v) => onSave({ empresa: v })} style={{ fontWeight: 700, color: INK, fontSize: 14 }} />
      </div>

      {/* Propietario */}
      {(exp.nombre_propietario || hovering) && (
        <div style={{ fontSize: 11.5, color: INK3, marginBottom: 2 }}>
          <span style={{ fontWeight: 600 }}>Propietario: </span>
          <InlineField value={exp.nombre_propietario} onSave={(v) => onSave({ nombre_propietario: v || null })} placeholder="Sin datos" style={{ fontSize: 11.5, color: INK3 }} />
        </div>
      )}

      {/* Ubicación establecimiento */}
      {(exp.ubicacion || hovering) && (
        <div style={{ fontSize: 11.5, color: INK3, marginBottom: 2 }}>
          <span style={{ fontWeight: 600 }}>Ubicación: </span>
          <InlineField value={exp.ubicacion} onSave={(v) => onSave({ ubicacion: v || null })} placeholder="Sin datos" style={{ fontSize: 11.5, color: INK3 }} />
        </div>
      )}

      {/* Dimensión y personal */}
      <div style={{ display: "flex", gap: 16, marginBottom: 2 }}>
        {(exp.dimension_establecimiento || hovering) && (
          <div style={{ fontSize: 11.5, color: INK3 }}>
            <span style={{ fontWeight: 600 }}>Establecimiento: </span>
            <InlineField value={exp.dimension_establecimiento} onSave={(v) => onSave({ dimension_establecimiento: v || null })} placeholder="Sin datos" style={{ fontSize: 11.5, color: INK3 }} />
          </div>
        )}
        {(exp.personal_a_cargo || hovering) && (
          <div style={{ fontSize: 11.5, color: INK3 }}>
            <span style={{ fontWeight: 600 }}>Personal a cargo: </span>
            <InlineField value={exp.personal_a_cargo} onSave={(v) => onSave({ personal_a_cargo: v || null })} placeholder="Sin datos" style={{ fontSize: 11.5, color: INK3 }} />
          </div>
        )}
      </div>

      {/* En blanco */}
      {(exp.en_blanco !== null || hovering) && (
        <div style={{ fontSize: 11.5, color: INK3, marginBottom: 2 }}>
          <span style={{ fontWeight: 600 }}>En blanco: </span>
          <BoolField value={exp.en_blanco} onSave={(v) => onSave({ en_blanco: v })} />
        </div>
      )}

      {/* Descripción */}
      <div style={{ fontSize: 12.5, color: INK2, lineHeight: 1.7, marginTop: 5 }}>
        <InlineField
          value={exp.descripcion}
          onSave={(v) => onSave({ descripcion: v || null })}
          multiline
          placeholder="Describí las tareas del puesto..."
          style={{ fontSize: 12.5, color: INK2, lineHeight: 1.7 }}
        />
      </div>

      {/* Solo trabajo actual */}
      {exp.hasta === null && (
        <>
          {(exp.ingresos_actuales || hovering) && (
            <div style={{ fontSize: 11.5, color: INK3, marginTop: 4 }}>
              <span style={{ fontWeight: 600 }}>Ingresos actuales: </span>
              <InlineField value={exp.ingresos_actuales} onSave={(v) => onSave({ ingresos_actuales: v || null })} placeholder="Sin datos" style={{ fontSize: 11.5, color: INK3 }} />
            </div>
          )}
          {(exp.beneficios || hovering) && (
            <div style={{ fontSize: 11.5, color: INK3, marginTop: 2 }}>
              <span style={{ fontWeight: 600 }}>Beneficios: </span>
              <InlineField value={exp.beneficios} onSave={(v) => onSave({ beneficios: v || null })} placeholder="Sin datos" style={{ fontSize: 11.5, color: INK3 }} />
            </div>
          )}
        </>
      )}

      {/* Motivo de cambio */}
      {(exp.motivo_cambio_o_salida || hovering) && (
        <div style={{ fontSize: 11.5, color: INK3, marginTop: 2 }}>
          <span style={{ fontWeight: 600 }}>Motivo de {exp.hasta === null ? "cambio" : "salida"}: </span>
          <InlineField value={exp.motivo_cambio_o_salida} onSave={(v) => onSave({ motivo_cambio_o_salida: v || null })} placeholder="Sin datos" style={{ fontSize: 11.5, color: INK3 }} />
        </div>
      )}

      {/* Botón eliminar */}
      {hovering && (
        <button
          onClick={onDelete}
          style={{
            position:    "absolute",
            top:         0,
            right:       -28,
            padding:     4,
            color:       "#cf222e",
            background:  "transparent",
            border:      "none",
            cursor:      "pointer",
            borderRadius: 4,
          }}
          title="Eliminar empleo"
        >
          <Trash2 style={{ width: 13, height: 13 }} />
        </button>
      )}
    </div>
  )
}

// ─── Sección REFERENCIAS ──────────────────────────────────────────────────────

function ReferenciasSection({ c, save }: { c: Candidato; save: (f: Partial<Candidato>) => Promise<void> }) {
  const refs: Referencia[] = (c.referencias as Referencia[] | null) ?? []

  async function updateRef(idx: number, field: keyof Referencia, value: string) {
    const updated = refs.map((r, i) => i === idx ? { ...r, [field]: value } : r)
    await save({ referencias: updated as unknown as import("@/lib/supabase/types").Json })
  }

  async function addRef() {
    const updated = [...refs, { nombre: "Nombre Referencia", contacto: "", relacion: "" }]
    await save({ referencias: updated as unknown as import("@/lib/supabase/types").Json })
  }

  async function removeRef(idx: number) {
    const updated = refs.filter((_, i) => i !== idx)
    await save({ referencias: updated as unknown as import("@/lib/supabase/types").Json })
  }

  return (
    <CVSection title="Referencias">
      {refs.map((ref, i) => (
        <div key={i} style={{ marginBottom: 12, paddingLeft: 10, borderLeft: `2px solid ${BORDER}`, position: "relative" }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: INK, marginBottom: 2 }}>
            <InlineField value={ref.nombre}   onSave={(v) => updateRef(i, "nombre", v)}   style={{ fontWeight: 700, fontSize: 13, color: INK }} />
          </div>
          <div style={{ fontSize: 11.5, color: INK3 }}>
            <InlineField value={ref.contacto} onSave={(v) => updateRef(i, "contacto", v)} placeholder="Teléfono" style={{ fontSize: 11.5, color: INK3 }} />
          </div>
          <div style={{ fontSize: 11.5, color: INK3 }}>
            <InlineField value={ref.relacion} onSave={(v) => updateRef(i, "relacion", v)} placeholder="Relación laboral" style={{ fontSize: 11.5, color: INK3 }} />
          </div>
          <button
            onClick={() => removeRef(i)}
            style={{ position: "absolute", top: 0, right: -24, padding: 3, color: "#cf222e", background: "transparent", border: "none", cursor: "pointer" }}
          >
            <Trash2 style={{ width: 12, height: 12 }} />
          </button>
        </div>
      ))}
      {refs.length === 0 && (
        <p style={{ fontSize: 12.5, color: INK3, fontStyle: "italic" }}>Sin referencias cargadas.</p>
      )}
      <button
        onClick={addRef}
        style={{
          display: "inline-flex", alignItems: "center", gap: 4, marginTop: 6,
          fontSize: 11.5, color: OLIVE, background: "transparent",
          border: `1px dashed ${OLIVE}`, borderRadius: 6, padding: "4px 10px", cursor: "pointer",
        }}
      >
        <Plus style={{ width: 12, height: 12 }} /> Agregar referencia
      </button>
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
  const save = useCallback(async (fields: Partial<Candidato>) => {
    const result = await updateCandidatoFields(candidato.id, fields)
    if (!result.success) toast.error(result.error)
  }, [candidato.id])

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
      {/* Header documento */}
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

        <DatosPersonales c={candidato} save={save} />

        {/* Perfil Laboral */}
        <CVSection title="Perfil Laboral">
          <InlineField
            value={candidato.perfil_laboral}
            onSave={(v) => save({ perfil_laboral: v || null })}
            multiline
            placeholder="Resumí el perfil profesional del candidato..."
            style={{ fontSize: 12.5, color: INK2, lineHeight: 1.75 }}
          />
        </CVSection>

        <ExperienciaSection experiencia={experiencia} candidatoId={candidato.id} />

        {/* Formación */}
        <CVSection title="Formación">
          <InlineField
            value={candidato.educacion}
            onSave={(v) => save({ educacion: v || null })}
            multiline
            placeholder="Nivel educativo y título..."
            style={{ fontSize: 12.5, color: INK2 }}
          />
        </CVSection>

        {/* Conocimientos */}
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

        <ReferenciasSection c={candidato} save={save} />

        {/* Pretensión salarial y disponibilidad */}
        {(candidato.pretension_salarial || candidato.disponibilidad) && (
          <CVSection title="Condiciones">
            {candidato.pretension_salarial && (
              <KVRow label="Pretensión salarial">
                <InlineField value={candidato.pretension_salarial} onSave={(v) => save({ pretension_salarial: v || null })} style={{ fontSize: 12.5, color: INK2 }} />
              </KVRow>
            )}
            {candidato.disponibilidad && (
              <KVRow label="Disponibilidad">
                <InlineField value={candidato.disponibilidad} onSave={(v) => save({ disponibilidad: v || null })} style={{ fontSize: 12.5, color: INK2 }} />
              </KVRow>
            )}
          </CVSection>
        )}
      </div>

      {/* Footer */}
      <div style={{
        borderTop:     `1px solid ${BORDER}`,
        padding:       "8px 28px",
        display:       "flex",
        justifyContent: "space-between",
        alignItems:    "center",
      }}>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: OLIVE }}>
          Gestiones Laborales
        </span>
        <span style={{ fontSize: 9, color: INK3 }}>
          Hacé clic en cualquier campo para editarlo
        </span>
      </div>
    </div>
  )
}
