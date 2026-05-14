"use client"

import { useState, useTransition, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { createBusqueda, updateBusqueda } from "@/lib/actions/busquedas"
import type { Tables } from "@/lib/supabase/types"

type Busqueda = Tables<"busquedas">

const INK    = "#0d1117"
const INK3   = "#8b949e"
const SURFACE = "#ffffff"
const BORDER  = "#eaecef"
const BORDER_MD = "#d4d8de"
const OLIVE   = "#2a4a18"
const OLIVE_BG = "#eef5e8"

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: `1px solid ${BORDER_MD}`,
  background: SURFACE,
  color: INK,
  borderRadius: "0.5rem",
  padding: "0.5rem 0.75rem",
  fontSize: "13.5px",
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
        placeholder={placeholder} style={inputStyle}
        onFocus={(e) => { e.currentTarget.style.borderColor = OLIVE; e.currentTarget.style.boxShadow = `0 0 0 3px ${OLIVE_BG}` }}
        onBlur={(e)  => { e.currentTarget.style.borderColor = BORDER_MD; e.currentTarget.style.boxShadow = "none" }}
      />
    </div>
  )
}

function TextArea({
  label, name, defaultValue, rows = 3, placeholder,
}: {
  label: string; name: string; defaultValue?: string; rows?: number; placeholder?: string
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <textarea
        name={name} defaultValue={defaultValue ?? ""} rows={rows} placeholder={placeholder}
        style={{ ...inputStyle, resize: "none" }}
        onFocus={(e) => { e.currentTarget.style.borderColor = OLIVE; e.currentTarget.style.boxShadow = `0 0 0 3px ${OLIVE_BG}` }}
        onBlur={(e)  => { e.currentTarget.style.borderColor = BORDER_MD; e.currentTarget.style.boxShadow = "none" }}
      />
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{
        fontSize: "10px", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase",
        color: INK3, borderBottom: `1px solid ${BORDER}`, paddingBottom: "0.5rem", marginBottom: "1.25rem",
      }}>
        {label}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>{children}</div>
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>{children}</div>
}

export function BusquedaFormPage({ busqueda }: { busqueda?: Busqueda }) {
  const [pending, startTransition] = useTransition()
  const [error, setError]          = useState<string | null>(null)
  const router = useRouter()
  const isEdit = !!busqueda

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const data = {
      puesto:         fd.get("puesto") as string,
      cliente:        fd.get("cliente") as string,
      estado:         fd.get("estado") as "activa" | "pausada" | "cerrada",
      ubicacion:      fd.get("ubicacion") as string,
      rango_salarial: fd.get("rango_salarial") as string,
      descripcion:    fd.get("descripcion") as string,
      requisitos:     fd.get("requisitos") as string,
      fecha_apertura: fd.get("fecha_apertura") as string,
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

  return (
    <div style={{ minHeight: "100vh", background: "#f6f8fa", display: "flex", flexDirection: "column" }}>

      {/* Top bar */}
      <div style={{
        background: SURFACE, borderBottom: `1px solid ${BORDER}`,
        padding: "0 2.5rem", height: "3.5rem",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <Link
          href={isEdit ? `/busquedas/${busqueda.id}` : "/busquedas"}
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
            href={isEdit ? `/busquedas/${busqueda.id}` : "/busquedas"}
            style={{
              padding: "0.4rem 1rem", fontSize: "13.5px",
              color: INK3, background: "transparent", border: "none",
              cursor: "pointer", textDecoration: "none", borderRadius: "0.375rem",
              transition: "color 0.15s",
            }}
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

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "3rem 2.5rem" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>

          {/* Page title */}
          <div style={{ marginBottom: "2.5rem" }}>
            <p style={{
              fontSize: "10.5px", fontWeight: 600, letterSpacing: "0.15em",
              textTransform: "uppercase", color: INK3, marginBottom: "0.5rem",
            }}>
              {isEdit ? "Editar búsqueda" : "Nueva búsqueda"}
            </p>
            <h1 style={{
              fontFamily: "var(--font-fraunces), serif",
              fontSize: "2rem", fontWeight: 400,
              fontVariationSettings: '"opsz" 144, "SOFT" 100',
              letterSpacing: "-0.02em", color: INK, lineHeight: 1.1,
            }}>
              {isEdit ? busqueda.puesto : "Crear posición"}
            </h1>
            {isEdit && (
              <p style={{ fontSize: "13px", color: INK3, marginTop: "0.375rem" }}>{busqueda.cliente}</p>
            )}
          </div>

          {/* Form */}
          <form
            id="busqueda-form"
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}
          >
            <div style={{
              background: SURFACE, border: `1px solid ${BORDER}`,
              borderRadius: "1rem", padding: "2rem",
              display: "flex", flexDirection: "column", gap: "2rem",
              boxShadow: "0 2px 8px rgba(13,17,23,0.05)",
            }}>
              <Section label="Identificación">
                <Field label="Puesto" name="puesto" defaultValue={busqueda?.puesto} required placeholder="Capataz de campo" />
                <Field label="Cliente / Empleador" name="cliente" defaultValue={busqueda?.cliente} required placeholder="Estancia La Esperanza" />
                <div>
                  <label style={labelStyle}>Estado</label>
                  <select
                    name="estado"
                    defaultValue={busqueda?.estado ?? "activa"}
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = OLIVE; e.currentTarget.style.boxShadow = `0 0 0 3px ${OLIVE_BG}` }}
                    onBlur={(e)  => { e.currentTarget.style.borderColor = BORDER_MD; e.currentTarget.style.boxShadow = "none" }}
                  >
                    <option value="activa">Activa</option>
                    <option value="pausada">Pausada</option>
                  </select>
                </div>
              </Section>

              <Section label="Detalles">
                <Row>
                  <Field label="Ubicación" name="ubicacion" defaultValue={busqueda?.ubicacion ?? ""} placeholder="Santa Rosa, LP" />
                  <Field label="Rango salarial" name="rango_salarial" defaultValue={busqueda?.rango_salarial ?? ""} placeholder="$300.000 – $500.000" />
                </Row>
                <Field
                  label="Fecha de apertura" name="fecha_apertura" type="date"
                  defaultValue={busqueda?.fecha_apertura ?? new Date().toISOString().split("T")[0]}
                />
              </Section>

              <Section label="Brief">
                <TextArea
                  label="Descripción del puesto" name="descripcion"
                  defaultValue={busqueda?.descripcion ?? ""} rows={4}
                  placeholder="Descripción de la posición, perfil buscado..."
                />
              </Section>

              <Section label="Requisitos">
                <TextArea
                  label="Un requisito por línea" name="requisitos"
                  defaultValue={busqueda?.requisitos?.join("\n") ?? ""} rows={6}
                  placeholder={"Manejo de hacienda\nLicencia de conducir\nDisponibilidad para residir en campo"}
                />
              </Section>
            </div>

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
        </div>
      </div>
    </div>
  )
}
