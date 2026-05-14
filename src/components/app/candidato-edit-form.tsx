"use client"

import { useState, useTransition, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, Plus, Trash2, Loader2, Save, ChevronDown } from "lucide-react"
import { updateCandidatoFields, updateExperienciaFields, addExperiencia, deleteExperiencia } from "@/lib/actions/candidatos"
import type { Tables } from "@/lib/supabase/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

type Candidato   = Tables<"candidatos">
type Experiencia = Tables<"experiencia_laboral">
type Referencia  = { nombre: string; contacto: string; relacion: string }

// ─── Estilos base ─────────────────────────────────────────────────────────────

const OLIVE      = "#2a4a18"
const OLIVE_BG   = "#eef5e8"
const INK        = "#0d1117"
const INK3       = "#8b949e"
const BORDER     = "#eaecef"
const BORDER_MD  = "#d4d8de"
const SURFACE    = "#ffffff"

const inputStyle: React.CSSProperties = {
  width:        "100%",
  border:       `1px solid ${BORDER_MD}`,
  background:   SURFACE,
  color:        INK,
  borderRadius: "0.5rem",
  padding:      "0.5rem 0.75rem",
  fontSize:     "13.5px",
  fontFamily:   "inherit",
  outline:      "none",
  transition:   "border-color 0.15s, box-shadow 0.15s",
}

const labelStyle: React.CSSProperties = {
  display:       "block",
  fontSize:      "11px",
  fontWeight:    600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color:         INK3,
  marginBottom:  "0.375rem",
}

// ─── Componentes base ─────────────────────────────────────────────────────────

function Field({
  label, value, onChange, type = "text", placeholder, hint, multiline, required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  hint?: string
  multiline?: boolean
  required?: boolean
}) {
  const focusStyle = {
    borderColor: OLIVE,
    boxShadow:   `0 0 0 3px ${OLIVE_BG}`,
  }
  const blurStyle = {
    borderColor: BORDER_MD,
    boxShadow:   "none",
  }

  const sharedProps = {
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
    placeholder,
    required,
    style: inputStyle,
    onFocus:  (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => Object.assign(e.currentTarget.style, focusStyle),
    onBlur:   (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => Object.assign(e.currentTarget.style, blurStyle),
  }

  return (
    <div>
      <label style={labelStyle}>
        {label}
        {required && <span style={{ color: OLIVE, marginLeft: 2 }}>*</span>}
      </label>
      {multiline
        ? <textarea {...sharedProps} rows={3} style={{ ...inputStyle, resize: "vertical", minHeight: 80 }} />
        : <input   {...sharedProps} type={type} />
      }
      {hint && <p style={{ fontSize: 11, color: INK3, marginTop: 3 }}>{hint}</p>}
    </div>
  )
}

function BoolField({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean | null) => void }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <select
        value={value === true ? "si" : value === false ? "no" : ""}
        onChange={(e) => onChange(e.target.value === "si" ? true : e.target.value === "no" ? false : null)}
        style={inputStyle}
        onFocus={(e) => Object.assign(e.currentTarget.style, { borderColor: OLIVE, boxShadow: `0 0 0 3px ${OLIVE_BG}` })}
        onBlur={(e)  => Object.assign(e.currentTarget.style, { borderColor: BORDER_MD, boxShadow: "none" })}
      >
        <option value="">Sin datos</option>
        <option value="si">Sí</option>
        <option value="no">No</option>
      </select>
    </div>
  )
}

function Row({ children, cols = 2 }: { children: React.ReactNode; cols?: number }) {
  return <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: "0.75rem" }}>{children}</div>
}

function AccordionCard({
  title, summary, defaultOpen = true, headerRight, children,
}: {
  title: string
  summary?: string
  defaultOpen?: boolean
  headerRight?: React.ReactNode
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ background: SURFACE, border: `1px solid ${BORDER_MD}`, borderRadius: 14, boxShadow: "0 1px 4px rgba(13,17,23,0.04)", overflow: "hidden" }}>
      {/* Header */}
      <div
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0.875rem 1.25rem", cursor: "pointer", userSelect: "none",
          background: open ? SURFACE : "#f9fafb",
          borderBottom: open ? `1px solid ${BORDER}` : "none",
          transition: "background 0.15s",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: open ? OLIVE : INK3, transition: "color 0.15s", whiteSpace: "nowrap" }}>
            {title}
          </span>
          {!open && summary && (
            <span style={{ fontSize: 12.5, color: INK3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {summary}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginLeft: "0.75rem", flexShrink: 0 }}>
          {headerRight}
          <ChevronDown style={{ width: 15, height: 15, color: INK3, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
        </div>
      </div>
      {/* Body */}
      {open && (
        <div style={{ padding: "1.25rem 1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Sección experiencia ──────────────────────────────────────────────────────

function fmtDate(d: string | null): string {
  if (!d) return "actual"
  const [y, m] = d.split("-")
  return m && m !== "01" ? `${m}/${y}` : y
}

function ExpCard({
  exp,
  onChange,
  onDelete,
  defaultOpen = false,
}: {
  exp: Experiencia
  onChange: (fields: Partial<Experiencia>) => void
  onDelete: () => void
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  const title  = exp.rol || exp.empresa ? `${exp.rol || "Sin cargo"} — ${exp.empresa || "Sin empresa"}` : "Nuevo empleo"
  const period = `${fmtDate(exp.desde)} → ${fmtDate(exp.hasta)}`

  return (
    <div style={{ border: `1px solid ${BORDER_MD}`, borderRadius: 10, overflow: "hidden", background: "#f9fafb" }}>
      {/* Header */}
      <div
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0.75rem 1rem", cursor: "pointer", userSelect: "none",
          borderBottom: open ? `1px solid ${BORDER}` : "none",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {title}
          </div>
          <div style={{ fontSize: 11, color: INK3, marginTop: 1 }}>{period}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 8, flexShrink: 0 }}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            style={{ padding: 5, color: "#cf222e", background: "transparent", border: "none", cursor: "pointer", borderRadius: 5, display: "flex" }}
            title="Eliminar empleo"
          >
            <Trash2 style={{ width: 13, height: 13 }} />
          </button>
          <ChevronDown style={{ width: 14, height: 14, color: INK3, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
        </div>
      </div>

      {/* Body */}
      {open && (
        <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          <Row cols={4}>
            <Field label="Cargo / Rol" value={exp.rol} onChange={(v) => onChange({ rol: v })} required placeholder="Capataz de campo" />
            <Field label="Empresa / Establecimiento" value={exp.empresa} onChange={(v) => onChange({ empresa: v })} required placeholder="Estancia La Pampa" />
            <Field label="Desde" value={exp.desde ?? ""} onChange={(v) => onChange({ desde: v || null })} type="date" />
            <Field label="Hasta" value={exp.hasta ?? ""} onChange={(v) => onChange({ hasta: v || null })} type="date" hint="Vacío = trabajo actual" />
          </Row>
          <Row cols={4}>
            <Field label="Propietario" value={exp.nombre_propietario ?? ""} onChange={(v) => onChange({ nombre_propietario: v || null })} placeholder="Juan Pérez" />
            <Field label="Ubicación" value={exp.ubicacion ?? ""} onChange={(v) => onChange({ ubicacion: v || null })} placeholder="Trenque Lauquen, Bs As" />
            <Field label="Dimensión" value={exp.dimension_establecimiento ?? ""} onChange={(v) => onChange({ dimension_establecimiento: v || null })} placeholder="1.200 ha, 400 cabezas" />
            <Field label="Personal a cargo" value={exp.personal_a_cargo ?? ""} onChange={(v) => onChange({ personal_a_cargo: v || null })} placeholder="3 personas" />
          </Row>
          <Row cols={4}>
            <BoolField label="¿En blanco?" value={exp.en_blanco} onChange={(v) => onChange({ en_blanco: v })} />
            <Field label="Motivo de cambio / salida" value={exp.motivo_cambio_o_salida ?? ""} onChange={(v) => onChange({ motivo_cambio_o_salida: v || null })} placeholder="Búsqueda de nuevas oportunidades" />
            {exp.hasta === null && <>
              <Field label="Ingresos actuales" value={exp.ingresos_actuales ?? ""} onChange={(v) => onChange({ ingresos_actuales: v || null })} placeholder="$800.000" />
              <Field label="Beneficios" value={exp.beneficios ?? ""} onChange={(v) => onChange({ beneficios: v || null })} placeholder="Carne, vivienda, combustible" />
            </>}
          </Row>
          <Field label="Descripción de tareas" value={exp.descripcion ?? ""} onChange={(v) => onChange({ descripcion: v || null })} multiline placeholder="Conducción general del establecimiento..." />
        </div>
      )}
    </div>
  )
}

// ─── Sección referencias ──────────────────────────────────────────────────────

function RefCard({ ref, onChange, onDelete }: { ref: Referencia; onChange: (r: Referencia) => void; onDelete: () => void }) {
  const [open, setOpen] = useState(!ref.nombre)
  const label = ref.nombre || "Nueva referencia"

  return (
    <div style={{ border: `1px solid ${BORDER_MD}`, borderRadius: 10, overflow: "hidden", background: "#f9fafb" }}>
      <div
        onClick={() => setOpen((v) => !v)}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1rem", cursor: "pointer", userSelect: "none", borderBottom: open ? `1px solid ${BORDER}` : "none" }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
          {ref.relacion && !open && <div style={{ fontSize: 11, color: INK3, marginTop: 1 }}>{ref.relacion}</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 8, flexShrink: 0 }}>
          <button type="button" onClick={(e) => { e.stopPropagation(); onDelete() }} style={{ padding: 5, color: "#cf222e", background: "transparent", border: "none", cursor: "pointer", borderRadius: 5, display: "flex" }} title="Eliminar referencia">
            <Trash2 style={{ width: 13, height: 13 }} />
          </button>
          <ChevronDown style={{ width: 14, height: 14, color: INK3, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
        </div>
      </div>
      {open && (
        <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <Row>
            <Field label="Nombre" value={ref.nombre} onChange={(v) => onChange({ ...ref, nombre: v })} placeholder="Juan García" />
            <Field label="Contacto" value={ref.contacto} onChange={(v) => onChange({ ...ref, contacto: v })} placeholder="221 555-1234" />
          </Row>
          <Field label="Relación laboral" value={ref.relacion} onChange={(v) => onChange({ ...ref, relacion: v })} placeholder="Propietario, administrador..." />
        </div>
      )}
    </div>
  )
}

// ─── Categorías rurales ───────────────────────────────────────────────────────

const CATEGORIAS_GL = [
  // Gestión / Dirección
  "Administrador Rural", "Ingeniero Agrónomo", "Veterinario",
  "Contador/a Público/a Agro", "Asistente Administrativo/Contable Agro",
  // Encargados
  "Encargado General", "Encargado de Ganadería", "Encargado de Agricultura",
  "Encargado de Maquinarias", "Encargado Agrícola-Ganadero", "Encargado de Tambo",
  // Capataces
  "Capataz de Ganadería", "Capataz de Agricultura", "Capataz de Maquinarias",
  // Operarios
  "Tambero", "Inseminador", "Cabañero", "Tractorista",
  "Mecánico Tractorista", "Mixero", "Criancero o Guachero",
  // General
  "Peón General", "Puestero", "Caseros",
]

function ChipsField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string[]
  onChange: (v: string[]) => void
}) {
  function toggle(cat: string) {
    onChange(value.includes(cat) ? value.filter((c) => c !== cat) : [...value, cat])
  }

  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", marginTop: "0.25rem" }}>
        {CATEGORIAS_GL.map((cat) => {
          const selected = value.includes(cat)
          return (
            <button
              key={cat}
              type="button"
              onClick={() => toggle(cat)}
              style={{
                padding: "0.3rem 0.65rem",
                fontSize: "12px",
                fontWeight: selected ? 600 : 400,
                borderRadius: "99px",
                border: `1px solid ${selected ? OLIVE : BORDER_MD}`,
                background: selected ? OLIVE_BG : SURFACE,
                color: selected ? OLIVE : INK3,
                cursor: "pointer",
                transition: "all 0.12s",
                userSelect: "none",
              }}
            >
              {cat}
            </button>
          )
        })}
      </div>
      {value.length === 0 && (
        <p style={{ fontSize: 11, color: INK3, marginTop: 4 }}>Seleccioná las categorías que puede aplicar este candidato.</p>
      )}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function CandidatoEditForm({
  candidato: initial,
  experiencia: initialExp,
}: {
  candidato:   Candidato
  experiencia: Experiencia[]
}) {
  const router  = useRouter()
  const [saving, startSave] = useTransition()

  // ── Estado del formulario ──
  const [c, setC] = useState<Candidato>(initial)
  const [exps, setExps] = useState<Experiencia[]>(initialExp)
  const [deletedExpIds, setDeletedExpIds] = useState<string[]>([])
  const [newExps, setNewExps] = useState<Omit<Experiencia, "id" | "candidato_id" | "created_at">[]>([])
  const [dirty, setDirty] = useState(false)
  const [confirmState, setConfirmState] = useState<{ open: boolean; onConfirm: () => void }>({ open: false, onConfirm: () => {} })

  function askConfirm(onConfirm: () => void) {
    setConfirmState({ open: true, onConfirm })
  }

  const setField = useCallback(<K extends keyof Candidato>(key: K, val: Candidato[K]) => {
    setC((prev) => ({ ...prev, [key]: val }))
    setDirty(true)
  }, [])

  // ── Bloquear navegación con cambios sin guardar ──
  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = "" }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [dirty])

  useEffect(() => {
    if (!dirty) return
    window.history.pushState(null, "", window.location.href)
    function handlePopState() {
      window.history.pushState(null, "", window.location.href)
      askConfirm(() => { setDirty(false); router.back() })
    }
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [dirty, router])

  // ── Experiencia: editar existente ──
  function updateExp(id: string, fields: Partial<Experiencia>) {
    setExps((prev) => prev.map((e) => e.id === id ? { ...e, ...fields } : e))
    setDirty(true)
  }

  function removeExp(id: string) {
    setExps((prev) => prev.filter((e) => e.id !== id))
    setDeletedExpIds((prev) => [...prev, id])
    setDirty(true)
  }

  // ── Experiencia: nueva ──
  function addNewExp() {
    setNewExps((prev) => [...prev, {
      empresa: "", rol: "", desde: `${new Date().getFullYear()}-01-01`, hasta: null,
      descripcion: null, orden: exps.length + prev.length,
      nombre_propietario: null, ubicacion: null, dimension_establecimiento: null,
      personal_a_cargo: null, en_blanco: null, ingresos_actuales: null,
      beneficios: null, motivo_cambio_o_salida: null,
    }])
    setDirty(true)
  }

  function updateNewExp(idx: number, fields: Partial<Experiencia>) {
    setNewExps((prev) => prev.map((e, i) => i === idx ? { ...e, ...fields } : e))
  }

  function removeNewExp(idx: number) {
    setNewExps((prev) => prev.filter((_, i) => i !== idx))
  }

  // ── Referencias ──
  const refs: Referencia[] = (c.referencias as Referencia[] | null) ?? []

  function setRefs(next: Referencia[]) {
    setField("referencias", next.length > 0 ? (next as unknown as typeof c.referencias) : null)
  }

  // ── Guardar todo ──
  function handleSave() {
    startSave(async () => {
      const errors: string[] = []

      // 1. Actualizar candidato
      const result = await updateCandidatoFields(c.id, {
        nombre: c.nombre, apellido: c.apellido, email: c.email, telefono: c.telefono,
        fecha_nacimiento: c.fecha_nacimiento, ubicacion: c.ubicacion,
        domicilio_completo: c.domicilio_completo, lugar_nacimiento: c.lugar_nacimiento,
        dni: c.dni, estado_civil: c.estado_civil, hijos: c.hijos,
        vehiculo_propio: c.vehiculo_propio, licencia_conducir: c.licencia_conducir,
        muebles_propios: c.muebles_propios, animales: c.animales,
        educacion: c.educacion, perfil_laboral: c.perfil_laboral,
        pretension_salarial: c.pretension_salarial, disponibilidad: c.disponibilidad,
        movilidad: c.movilidad, tipos_ganaderia: c.tipos_ganaderia,
        idiomas: c.idiomas, ultimo_puesto: c.ultimo_puesto,
        referencias: c.referencias, notas_recruiter: c.notas_recruiter,
        estado: c.estado, categorias: c.categorias ?? [],
      })
      if (!result.success) errors.push(result.error)

      // 2. Actualizar experiencias existentes
      await Promise.all(
        exps.map((exp) =>
          updateExperienciaFields(exp.id, c.id, {
            empresa: exp.empresa, rol: exp.rol, desde: exp.desde, hasta: exp.hasta,
            descripcion: exp.descripcion, nombre_propietario: exp.nombre_propietario,
            ubicacion: exp.ubicacion, dimension_establecimiento: exp.dimension_establecimiento,
            personal_a_cargo: exp.personal_a_cargo, en_blanco: exp.en_blanco,
            ingresos_actuales: exp.ingresos_actuales, beneficios: exp.beneficios,
            motivo_cambio_o_salida: exp.motivo_cambio_o_salida,
          }).then((r) => { if (!r.success) errors.push(r.error ?? "Error exp") })
        )
      )

      // 3. Eliminar experiencias borradas
      await Promise.all(
        deletedExpIds.map((id) =>
          deleteExperiencia(id, c.id)
            .then((r) => { if (!r.success) errors.push(r.error ?? "Error delete exp") })
        )
      )

      // 4. Agregar nuevas experiencias
      await Promise.all(
        newExps.map((exp) =>
          addExperiencia(c.id, exp)
            .then((r) => { if (!r.success) errors.push(r.error ?? "Error add exp") })
        )
      )

      if (errors.length > 0) {
        toast.error(`Error guardando: ${errors[0]}`)
        return
      }

      toast.success("Perfil guardado")
      setDirty(false)
      router.push(`/candidatos/${c.id}`)
      router.refresh()
    })
  }

  function handleCancel() {
    if (dirty) { askConfirm(() => router.push(`/candidatos/${c.id}`)); return }
    router.push(`/candidatos/${c.id}`)
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", background: "var(--gl-bg)" }}>

      {/* Top bar sticky */}
      <div style={{
        position:       "sticky", top: 0, zIndex: 30,
        background:     SURFACE, borderBottom: `1px solid ${BORDER}`,
        boxShadow:      "0 2px 12px rgba(13,17,23,0.06)",
        padding:        "0.875rem 2rem",
        display:        "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button
            type="button"
            onClick={handleCancel}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: INK3, background: "transparent", border: "none", cursor: "pointer", padding: "4px 0" }}
          >
            <ArrowLeft style={{ width: 14, height: 14 }} />
            Cancelar
          </button>
          <div style={{ width: 1, height: 18, background: BORDER }} />
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: OLIVE, lineHeight: 1 }}>Editando perfil</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: INK, marginTop: 2 }}>{c.nombre} {c.apellido}</div>
          </div>
        </div>

        {dirty && (
          <span style={{ fontSize: 12, color: INK3, fontStyle: "italic" }}>Cambios sin guardar</span>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "0.5rem 1.25rem", fontSize: 13.5, fontWeight: 600,
            color: "#fff", background: saving ? "#5a8a40" : OLIVE,
            border: "none", borderRadius: 10, cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.8 : 1, boxShadow: "0 2px 8px rgba(42,74,24,0.25)",
          }}
        >
          {saving
            ? <><Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> Guardando…</>
            : <><Save style={{ width: 14, height: 14 }} /> Guardar</>
          }
        </button>
      </div>

      {/* Contenido */}
      <div style={{ padding: "1.75rem 2rem 6rem", display: "flex", flexDirection: "column", gap: "1rem" }}>

        {/* Identificación */}
        <AccordionCard title="Identificación" summary={`${c.nombre} ${c.apellido}${c.telefono ? " · " + c.telefono : ""}`}>
          <Row cols={4}>
            <Field label="Nombre" value={c.nombre} onChange={(v) => setField("nombre", v)} required />
            <Field label="Apellido" value={c.apellido} onChange={(v) => setField("apellido", v)} required />
            <Field label="Fecha de nacimiento" value={c.fecha_nacimiento ?? ""} onChange={(v) => setField("fecha_nacimiento", v || null)} type="date" />
            <Field label="DNI" value={c.dni ?? ""} onChange={(v) => setField("dni", v || null)} placeholder="Sin puntos" />
          </Row>
          <Row cols={4}>
            <Field label="Estado civil" value={c.estado_civil ?? ""} onChange={(v) => setField("estado_civil", v || null)} placeholder="Soltero, casado..." />
            <Field label="Hijos" value={c.hijos ?? ""} onChange={(v) => setField("hijos", v || null)} placeholder="2 hijos, 5 y 8 años" />
            <Field label="Lugar de nacimiento" value={c.lugar_nacimiento ?? ""} onChange={(v) => setField("lugar_nacimiento", v || null)} placeholder="Ciudad y provincia" />
            <Field label="Domicilio completo" value={c.domicilio_completo ?? ""} onChange={(v) => setField("domicilio_completo", v || null)} placeholder="Calle, número, localidad" />
          </Row>
          <Row cols={4}>
            <Field label="Teléfono" value={c.telefono ?? ""} onChange={(v) => setField("telefono", v || null)} placeholder="221 555-1234" />
            <Field label="Email" value={c.email ?? ""} onChange={(v) => setField("email", v || null)} type="email" placeholder="juan@mail.com" />
            <BoolField label="Vehículo propio" value={c.vehiculo_propio} onChange={(v) => setField("vehiculo_propio", v)} />
            <BoolField label="Licencia de conducir" value={c.licencia_conducir} onChange={(v) => setField("licencia_conducir", v)} />
          </Row>
          <Row>
            <Field label="Muebles propios" value={c.muebles_propios ?? ""} onChange={(v) => setField("muebles_propios", v || null)} placeholder="Mesa, sillas, camas..." />
            <Field label="Animales" value={c.animales ?? ""} onChange={(v) => setField("animales", v || null)} placeholder="Perro, gato..." />
          </Row>
        </AccordionCard>

        {/* Perfil profesional */}
        <AccordionCard title="Perfil Profesional" summary={`${c.ultimo_puesto ?? ""}${c.estado ? " · " + c.estado : ""}`}>
          <Row cols={4}>
            <Field label="Último puesto" value={c.ultimo_puesto ?? ""} onChange={(v) => setField("ultimo_puesto", v || null)} placeholder="Capataz de campo" />
            <div>
              <label style={labelStyle}>Estado</label>
              <select
                value={c.estado ?? "activo"}
                onChange={(e) => setField("estado", e.target.value as "activo" | "inactivo")}
                style={inputStyle}
                onFocus={(e) => Object.assign(e.currentTarget.style, { borderColor: OLIVE, boxShadow: `0 0 0 3px ${OLIVE_BG}` })}
                onBlur={(e)  => Object.assign(e.currentTarget.style, { borderColor: BORDER_MD, boxShadow: "none" })}
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
            <Field label="Disponibilidad" value={c.disponibilidad ?? ""} onChange={(v) => setField("disponibilidad", v || null)} placeholder="Inmediata" />
            <Field label="Pretensión salarial" value={c.pretension_salarial ?? ""} onChange={(v) => setField("pretension_salarial", v || null)} placeholder="$800.000" />
          </Row>
          <Row>
            <BoolField label="Acepta movilidad / vivir en campo" value={c.movilidad} onChange={(v) => setField("movilidad", v)} />
            <Field label="Educación / Formación" value={c.educacion ?? ""} onChange={(v) => setField("educacion", v || null)} placeholder="Técnico agropecuario" />
          </Row>
          <Field
            label="Perfil laboral"
            value={c.perfil_laboral ?? ""}
            onChange={(v) => setField("perfil_laboral", v || null)}
            multiline
            placeholder="Resumí el perfil profesional del candidato..."
          />
          <Field
            label="Idiomas (separar con comas)"
            value={(c.idiomas ?? []).join(", ")}
            onChange={(v) => setField("idiomas", v ? v.split(",").map((s) => s.trim()).filter(Boolean) : [])}
            placeholder="Español, Inglés"
          />
          <Field
            label="Tipos de ganadería"
            value={(c.tipos_ganaderia ?? []).join(", ")}
            onChange={(v) => setField("tipos_ganaderia", v ? v.split(",").map((s) => s.trim()).filter(Boolean) : [])}
            placeholder="Bovina, tambo, mixto..."
          />
          <ChipsField
            label="Categorías que puede aplicar"
            value={c.categorias ?? []}
            onChange={(v) => setField("categorias", v)}
          />
        </AccordionCard>

        {/* Experiencia laboral */}
        <AccordionCard
          title="Experiencia Laboral"
          summary={`${exps.length + newExps.length} empleo${exps.length + newExps.length !== 1 ? "s" : ""}`}
          headerRight={
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); addNewExp() }}
              style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: OLIVE, background: OLIVE_BG, border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}
            >
              <Plus style={{ width: 12, height: 12 }} /> Agregar
            </button>
          }
        >
          {exps.length === 0 && newExps.length === 0 && (
            <p style={{ fontSize: 12.5, color: INK3, fontStyle: "italic", margin: 0 }}>Sin experiencia cargada.</p>
          )}
          {exps.map((exp) => (
            <ExpCard
              key={exp.id}
              exp={exp}
              onChange={(fields) => updateExp(exp.id, fields)}
              onDelete={() => removeExp(exp.id)}
            />
          ))}
          {newExps.map((exp, idx) => (
            <ExpCard
              key={`new-${idx}`}
              exp={{ ...exp, id: `new-${idx}`, candidato_id: c.id, created_at: "" } as Experiencia}
              onChange={(fields) => updateNewExp(idx, fields)}
              onDelete={() => removeNewExp(idx)}
              defaultOpen
            />
          ))}
        </AccordionCard>

        {/* Referencias */}
        <AccordionCard
          title="Referencias"
          summary={refs.length > 0 ? `${refs.length} referencia${refs.length !== 1 ? "s" : ""}` : "Sin referencias"}
          defaultOpen={refs.length > 0}
          headerRight={
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setRefs([...refs, { nombre: "", contacto: "", relacion: "" }]) }}
              style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: OLIVE, background: OLIVE_BG, border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}
            >
              <Plus style={{ width: 12, height: 12 }} /> Agregar
            </button>
          }
        >
          {refs.length === 0 && (
            <p style={{ fontSize: 12.5, color: INK3, fontStyle: "italic", margin: 0 }}>Sin referencias cargadas.</p>
          )}
          {refs.map((ref, i) => (
            <RefCard
              key={i}
              ref={ref}
              onChange={(r) => setRefs(refs.map((x, j) => j === i ? r : x))}
              onDelete={() => setRefs(refs.filter((_, j) => j !== i))}
            />
          ))}
        </AccordionCard>

        {/* Notas del recruiter */}
        <AccordionCard title="Notas Internas" summary={c.notas_recruiter ? c.notas_recruiter.slice(0, 60) + "…" : "Sin notas"} defaultOpen={false}>
          <Field
            label="Notas del recruiter"
            value={c.notas_recruiter ?? ""}
            onChange={(v) => setField("notas_recruiter", v || null)}
            multiline
            placeholder="Observaciones del proceso de selección..."
          />
        </AccordionCard>

      </div>

      {/* Confirmación al salir con cambios sin guardar */}
      <Dialog
        open={confirmState.open}
        onOpenChange={(open) => { if (!open) setConfirmState((s) => ({ ...s, open: false })) }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Cambios sin guardar</DialogTitle>
            <DialogDescription>
              Tenés cambios sin guardar en el perfil. Si salís ahora, se van a perder.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setConfirmState((s) => ({ ...s, open: false }))}
              style={{
                padding: "0.5rem 1rem", fontSize: 13.5, fontWeight: 500,
                color: INK3, background: "transparent", border: `1px solid ${BORDER_MD}`,
                borderRadius: 8, cursor: "pointer",
              }}
            >
              Seguir editando
            </button>
            <button
              onClick={() => { setConfirmState((s) => ({ ...s, open: false })); confirmState.onConfirm() }}
              style={{
                padding: "0.5rem 1rem", fontSize: 13.5, fontWeight: 600,
                color: "#fff", background: "#cf222e",
                border: "none", borderRadius: 8, cursor: "pointer",
              }}
            >
              Salir sin guardar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
