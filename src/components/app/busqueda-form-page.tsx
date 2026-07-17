"use client"

import { useState, useTransition, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, Loader2, Trash2, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { createBusqueda, updateBusqueda, deleteBusqueda } from "@/lib/actions/busquedas"
import type { Tables } from "@/lib/supabase/types"

type Busqueda = Tables<"busquedas">

const INK      = "#0d1117"
const INK3     = "#8b949e"
const SURFACE  = "#ffffff"
const BORDER   = "#eaecef"
const BORDER_MD = "#d4d8de"
const OLIVE    = "#2a4a18"
const OLIVE_BG = "#eef5e8"

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: `1px solid ${BORDER_MD}`,
  background: SURFACE,
  color: INK,
  borderRadius: "0.5rem",
  padding: "0.625rem 0.875rem",
  fontSize: "14px",
  fontFamily: "inherit",
  outline: "none",
  transition: "border-color 0.15s, box-shadow 0.15s",
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: INK3,
  marginBottom: "0.375rem",
}

const focusHandlers = {
  onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = OLIVE
    e.currentTarget.style.boxShadow = `0 0 0 3px ${OLIVE_BG}`
  },
  onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = BORDER_MD
    e.currentTarget.style.boxShadow = "none"
  },
}

function Field({
  label, name, defaultValue, required, type = "text", placeholder,
}: {
  label: string; name: string; defaultValue?: string
  required?: boolean; type?: string; placeholder?: string
}) {
  return (
    <div>
      <label style={labelStyle}>
        {label}
        {required && <span style={{ color: OLIVE, marginLeft: 2 }}>*</span>}
      </label>
      <input
        name={name} type={type} defaultValue={defaultValue ?? ""} required={required}
        placeholder={placeholder} style={inputStyle} {...focusHandlers}
      />
    </div>
  )
}

function NumberField({
  label, name, defaultValue, placeholder, min, max,
}: {
  label: string; name: string; defaultValue?: number | null
  placeholder?: string; min?: number; max?: number
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        name={name} type="number" min={min} max={max}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder} style={inputStyle} {...focusHandlers}
      />
    </div>
  )
}

function SelectField({
  label, name, defaultValue, options,
}: {
  label: string; name: string; defaultValue?: string | null
  options: { value: string; label: string }[]
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <select name={name} defaultValue={defaultValue ?? ""} style={inputStyle} {...focusHandlers}>
        <option value="">— Sin especificar —</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

function Toggle({
  label, name, defaultChecked, hint,
}: {
  label: string; name: string; defaultChecked?: boolean | null; hint?: string
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
      <div>
        <span style={{ ...labelStyle, display: "inline", marginBottom: 0 }}>{label}</span>
        {hint && <p style={{ fontSize: "11px", color: INK3, marginTop: "0.125rem" }}>{hint}</p>}
      </div>
      <label style={{ position: "relative", display: "inline-flex", alignItems: "center", cursor: "pointer", flexShrink: 0 }}>
        <input type="checkbox" name={name} defaultChecked={defaultChecked ?? false} style={{ display: "none" }}
          onChange={(e) => {
            const track = e.currentTarget.nextElementSibling as HTMLElement
            if (track) {
              track.style.background = e.currentTarget.checked ? OLIVE : BORDER_MD
              const thumb = track.firstElementChild as HTMLElement
              if (thumb) thumb.style.transform = e.currentTarget.checked ? "translateX(20px)" : "translateX(2px)"
            }
          }}
          ref={(el) => {
            if (el) {
              const track = el.nextElementSibling as HTMLElement
              if (track) {
                track.style.background = el.checked ? OLIVE : BORDER_MD
                const thumb = track.firstElementChild as HTMLElement
                if (thumb) thumb.style.transform = el.checked ? "translateX(20px)" : "translateX(2px)"
              }
            }
          }}
        />
        <div style={{
          width: "44px", height: "24px", borderRadius: "100px",
          background: BORDER_MD, transition: "background 0.2s", position: "relative",
        }}>
          <div style={{
            position: "absolute", top: "2px", width: "20px", height: "20px",
            borderRadius: "50%", background: "white",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            transition: "transform 0.2s",
            transform: "translateX(2px)",
          }} />
        </div>
      </label>
    </div>
  )
}

function TextArea({
  label, name, defaultValue, rows = 4, placeholder, hint,
}: {
  label: string; name: string; defaultValue?: string
  rows?: number; placeholder?: string; hint?: string
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <label style={labelStyle}>{label}</label>
      {hint && <p style={{ fontSize: "12px", color: INK3, marginBottom: "0.5rem", marginTop: "-0.125rem" }}>{hint}</p>}
      <textarea
        name={name} defaultValue={defaultValue ?? ""} rows={rows} placeholder={placeholder}
        style={{ ...inputStyle, resize: "none", flex: 1 }} {...focusHandlers}
      />
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em",
      textTransform: "uppercase", color: INK3,
      borderBottom: `1px solid ${BORDER}`,
      paddingBottom: "0.625rem", marginBottom: "1.25rem",
    }}>
      {children}
    </div>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: SURFACE, border: `1px solid ${BORDER}`,
      borderRadius: "1rem", padding: "1.75rem",
      boxShadow: "0 2px 8px rgba(13,17,23,0.05)",
      ...style,
    }}>
      {children}
    </div>
  )
}

const IDIOMA_OPTIONS = [
  { value: "Básico",     label: "Básico" },
  { value: "Intermedio", label: "Intermedio" },
  { value: "Avanzado",   label: "Avanzado" },
]

const EDUCACION_OPTIONS = [
  { value: "Primario completo",       label: "Primario completo" },
  { value: "Secundario completo",     label: "Secundario completo" },
  { value: "Terciario / Técnico",     label: "Terciario / Técnico" },
  { value: "Universitario completo",  label: "Universitario completo" },
  { value: "Posgrado",                label: "Posgrado" },
]

export function BusquedaFormPage({ busqueda }: { busqueda?: Busqueda }) {
  const [pending, startTransition] = useTransition()
  const [deleting, startDeleteTransition] = useTransition()
  const [error, setError]          = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const router = useRouter()
  const isEdit = !!busqueda

  function handleDelete() {
    if (!busqueda) return
    startDeleteTransition(async () => {
      setError(null)
      const result = await deleteBusqueda(busqueda.id)
      if (!result.success) {
        setError(result.error)
        setShowDeleteConfirm(false)
        return
      }
      toast.success("Búsqueda eliminada")
      router.push("/busquedas")
    })
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const data = {
      puesto:               fd.get("puesto") as string,
      cliente:              fd.get("cliente") as string,
      estado:               fd.get("estado") as "activa" | "pausada" | "cerrada",
      ubicacion:            fd.get("ubicacion") as string,
      reporte_directo:      fd.get("reporte_directo") as string,
      rango_salarial:       fd.get("rango_salarial") as string,
      fecha_apertura:       fd.get("fecha_apertura") as string,
      descripcion:          fd.get("descripcion") as string,
      actitudes:            fd.get("actitudes") as string,
      puestos_similares:    fd.get("puestos_similares") as string,
      personal_a_cargo_min: fd.get("personal_a_cargo_min") as string,
      idioma_ingles:        fd.get("idioma_ingles") as string,
      requisitos:           fd.get("requisitos") as string,
      edad_minima:          fd.get("edad_minima") as string,
      edad_maxima:          fd.get("edad_maxima") as string,
      nivel_educacion:      fd.get("nivel_educacion") as string,
      disponibilidad_viaje: fd.get("disponibilidad_viaje") as string,
      movilidad_requerida:  fd.get("movilidad_requerida") as string,
      estado_civil:         fd.get("estado_civil") as string,
    }

    startTransition(async () => {
      setError(null)
      const result = isEdit
        ? await updateBusqueda(busqueda.id, data)
        : await createBusqueda(data)

      if (!result.success) { setError(result.error); return }

      toast.success(isEdit ? "Búsqueda actualizada" : "Búsqueda creada")
      router.push(isEdit ? `/busquedas/${busqueda.id}` : `/busquedas/${result.id}`)
    })
  }

  const backHref = isEdit ? `/busquedas/${busqueda.id}` : "/busquedas"

  return (
    <div style={{ minHeight: "100vh", background: "#f6f8fa", display: "flex", flexDirection: "column" }}>

      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <div style={{
        background: SURFACE, borderBottom: `1px solid ${BORDER}`,
        padding: "0 2.5rem", height: "3.5rem",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0, position: "sticky", top: 0, zIndex: 10,
      }}>
        <Link
          href={backHref}
          style={{
            display: "inline-flex", alignItems: "center", gap: "0.375rem",
            fontSize: "13px", fontWeight: 500, color: INK3, textDecoration: "none",
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = INK)}
          onMouseLeave={(e) => (e.currentTarget.style.color = INK3)}
        >
          <ArrowLeft style={{ width: 14, height: 14 }} />
          {isEdit ? busqueda.puesto : "Búsquedas"}
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Link
            href={backHref}
            style={{
              padding: "0.4rem 1rem", fontSize: "13.5px",
              color: INK3, background: "transparent", border: "none",
              cursor: "pointer", textDecoration: "none", borderRadius: "0.375rem",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = INK)}
            onMouseLeave={(e) => (e.currentTarget.style.color = INK3)}
          >
            Cancelar
          </Link>
          <button
            form="busqueda-form" type="submit" disabled={pending}
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.375rem",
              padding: "0.4rem 1.25rem", fontSize: "13.5px", fontWeight: 600,
              color: "#ffffff", background: pending ? "#5a8a40" : OLIVE,
              border: "none", borderRadius: "0.75rem",
              cursor: pending ? "not-allowed" : "pointer",
              opacity: pending ? 0.8 : 1, transition: "background 0.15s",
            }}
          >
            {pending && <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />}
            {isEdit ? "Guardar cambios" : "Crear búsqueda"}
          </button>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "2.5rem 2.5rem 4rem" }}>

        {/* Page title */}
        <div style={{ marginBottom: "2rem" }}>
          <p style={{
            fontSize: "10.5px", fontWeight: 600, letterSpacing: "0.15em",
            textTransform: "uppercase", color: INK3, marginBottom: "0.375rem",
          }}>
            {isEdit ? "Editar búsqueda" : "Nueva búsqueda"}
          </p>
          <h1 style={{
            fontFamily: "var(--font-fraunces), serif",
            fontSize: "clamp(1.75rem, 3vw, 2.25rem)", fontWeight: 400,
            fontVariationSettings: '"opsz" 144, "SOFT" 100',
            letterSpacing: "-0.02em", color: INK, lineHeight: 1.1,
          }}>
            {isEdit ? busqueda.puesto : "Crear posición"}
          </h1>
          {isEdit && (
            <p style={{ fontSize: "13px", color: INK3, marginTop: "0.375rem" }}>{busqueda.cliente}</p>
          )}
        </div>

        <form
          id="busqueda-form"
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
        >
          {/* ── 1. Descripción del puesto ─────────────────────────── */}
          <Card>
            <SectionLabel>Descripción del puesto</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <Field label="Nombre del puesto" name="puesto" defaultValue={busqueda?.puesto} required placeholder="Capataz de campo" />
              <Field label="Cliente / Empleador" name="cliente" defaultValue={busqueda?.cliente} required placeholder="Estancia La Esperanza" />
              <Field label="Lugar / Área" name="ubicacion" defaultValue={busqueda?.ubicacion ?? ""} placeholder="Santa Rosa, LP" />
              <Field label="Reporte directo a" name="reporte_directo" defaultValue={busqueda?.reporte_directo ?? ""} placeholder="Gerente de campo" />
              <div>
                <label style={labelStyle}>Estado</label>
                <select
                  name="estado"
                  defaultValue={busqueda?.estado ?? "activa"}
                  style={inputStyle} {...focusHandlers}
                >
                  <option value="activa">Activa</option>
                  <option value="pausada">Pausada</option>
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <Field label="Rango salarial" name="rango_salarial" defaultValue={busqueda?.rango_salarial ?? ""} placeholder="$300k – $500k" />
                <Field
                  label="Fecha apertura" name="fecha_apertura" type="date"
                  defaultValue={busqueda?.fecha_apertura ?? new Date().toISOString().split("T")[0]}
                />
              </div>
            </div>
          </Card>

          {/* ── 2. Descripción de tareas ──────────────────────────── */}
          <Card>
            <SectionLabel>Descripción de tareas</SectionLabel>
            <TextArea
              label="Principales responsabilidades y detalle de tareas" name="descripcion"
              defaultValue={busqueda?.descripcion ?? ""} rows={5}
              placeholder="Describir las principales responsabilidades, tareas diarias y contexto del establecimiento..."
            />
          </Card>

          {/* ── 3. Actitud laboral ──────────��─────────────────────── */}
          <Card>
            <SectionLabel>Actitud laboral</SectionLabel>
            <TextArea
              label="Actitudes destacadas requeridas" name="actitudes"
              defaultValue={busqueda?.actitudes?.join("\n") ?? ""} rows={4}
              placeholder={"Proactivo y resolutivo\nBuena comunicación con el equipo\nOrientado a resultados"}
              hint="Una actitud por línea"
            />
          </Card>

          {/* ── 4. Experiencia requerida ──────────────────────────── */}
          <Card>
            <SectionLabel>Experiencia requerida</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <Field
                label="Puestos similares" name="puestos_similares"
                defaultValue={busqueda?.puestos_similares ?? ""}
                placeholder="Mayordomo, encargado de campo"
              />
              <NumberField
                label="Gente a cargo (mínimo)" name="personal_a_cargo_min"
                defaultValue={busqueda?.personal_a_cargo_min} placeholder="0" min={0}
              />
              <SelectField
                label="Idioma inglés" name="idioma_ingles"
                defaultValue={busqueda?.idioma_ingles}
                options={IDIOMA_OPTIONS}
              />
              <div style={{ gridColumn: "1 / -1" }}>
                <TextArea
                  label="Otros requisitos" name="requisitos"
                  defaultValue={busqueda?.requisitos?.join("\n") ?? ""} rows={4}
                  placeholder={"Manejo de hacienda\nLicencia de conducir\nDisponibilidad para residir en campo"}
                  hint="Un requisito por línea"
                />
              </div>
            </div>
          </Card>

          {/* ── 5. Requerimientos formales ────────────────────────── */}
          <Card>
            <SectionLabel>Requerimientos formales</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0.75rem" }}>
                <NumberField label="Edad mínima" name="edad_minima" defaultValue={busqueda?.edad_minima} placeholder="25" min={18} max={99} />
                <NumberField label="Edad máxima" name="edad_maxima" defaultValue={busqueda?.edad_maxima} placeholder="50" min={18} max={99} />
                <SelectField
                  label="Nivel de educación" name="nivel_educacion"
                  defaultValue={busqueda?.nivel_educacion}
                  options={EDUCACION_OPTIONS}
                />
                <Field
                  label="Estado civil" name="estado_civil"
                  defaultValue={busqueda?.estado_civil ?? ""}
                  placeholder="Indistinto"
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", paddingTop: "0.5rem", borderTop: `1px solid ${BORDER}` }}>
                <Toggle
                  label="Disposición a viajar"
                  name="disponibilidad_viaje"
                  defaultChecked={busqueda?.disponibilidad_viaje ?? false}
                />
                <Toggle
                  label="Movilidad propia"
                  name="movilidad_requerida"
                  defaultChecked={busqueda?.movilidad_requerida ?? false}
                />
              </div>
            </div>
          </Card>

          {/* Error — full width */}
          {error && (
            <div style={{
              fontSize: "13px", color: "#cf222e",
              background: "#ffebe9", border: "1px solid #f1aeb5",
              borderRadius: "0.5rem", padding: "0.625rem 0.875rem",
            }}>
              {error}
            </div>
          )}
        </form>

        {/* ── Zona de peligro (solo en edición) ─────────────────────── */}
        {isEdit && (
          <Card style={{ marginTop: "1.25rem", borderColor: "#f1aeb5" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
              <div>
                <p style={{ fontSize: "13.5px", fontWeight: 600, color: INK, marginBottom: "0.25rem" }}>
                  Eliminar búsqueda
                </p>
                <p style={{ fontSize: "12.5px", color: INK3, maxWidth: "38rem" }}>
                  Borra esta búsqueda y todas sus gestiones (candidatos en pipeline) de forma permanente.
                  Los candidatos siguen en la base; solo se elimina esta búsqueda.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "0.375rem",
                  padding: "0.4rem 1rem", fontSize: "13.5px", fontWeight: 600,
                  color: "#cf222e", background: "#ffebe9", border: "1px solid #f1aeb5",
                  borderRadius: "0.5rem", cursor: "pointer", flexShrink: 0,
                }}
              >
                <Trash2 style={{ width: 14, height: 14 }} />
                Eliminar búsqueda
              </button>
            </div>
          </Card>
        )}
      </div>

      {/* ── Modal de confirmación de borrado ──────────────────────────── */}
      {showDeleteConfirm && busqueda && (
        <div
          onClick={() => !deleting && setShowDeleteConfirm(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            background: "rgba(13,17,23,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "1.5rem",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: SURFACE, borderRadius: "1rem", padding: "1.75rem",
              maxWidth: "26rem", width: "100%",
              boxShadow: "0 12px 40px rgba(13,17,23,0.25)",
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: "50%", background: "#ffebe9",
              display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem",
            }}>
              <AlertTriangle style={{ width: 20, height: 20, color: "#cf222e" }} />
            </div>
            <h2 style={{
              fontFamily: "var(--font-fraunces), serif", fontSize: "1.375rem",
              fontWeight: 400, color: INK, marginBottom: "0.5rem",
            }}>
              ¿Eliminar esta búsqueda?
            </h2>
            <p style={{ fontSize: "13.5px", color: INK3, lineHeight: 1.5, marginBottom: "1.5rem" }}>
              Se va a borrar <strong style={{ color: INK }}>{busqueda.puesto}</strong> ({busqueda.cliente})
              y todas sus gestiones de forma permanente. Esta acción no se puede deshacer.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                style={{
                  padding: "0.45rem 1.1rem", fontSize: "13.5px", fontWeight: 500,
                  color: INK3, background: "transparent", border: `1px solid ${BORDER_MD}`,
                  borderRadius: "0.5rem", cursor: deleting ? "not-allowed" : "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "0.375rem",
                  padding: "0.45rem 1.25rem", fontSize: "13.5px", fontWeight: 600,
                  color: "#ffffff", background: "#cf222e", border: "none",
                  borderRadius: "0.5rem", cursor: deleting ? "not-allowed" : "pointer",
                  opacity: deleting ? 0.8 : 1,
                }}
              >
                {deleting && <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />}
                {deleting ? "Eliminando…" : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
