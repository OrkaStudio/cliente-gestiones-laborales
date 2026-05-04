"use client"

import { useState, useTransition, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Loader2, X } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { createBusqueda, updateBusqueda } from "@/lib/actions/busquedas"
import type { Tables } from "@/lib/supabase/types"

type Busqueda = Tables<"busquedas">

const INK = "#0d1117"
const INK3 = "#8b949e"
const SURFACE = "#ffffff"
const BORDER = "#eaecef"
const BORDER_MD = "#d4d8de"
const OLIVE = "#2a4a18"
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
  label,
  name,
  defaultValue,
  required,
  type = "text",
  placeholder,
}: {
  label: string
  name: string
  defaultValue?: string
  required?: boolean
  type?: string
  placeholder?: string
}) {
  return (
    <div>
      <label style={labelStyle}>
        {label}
        {required && <span style={{ color: OLIVE, marginLeft: 2 }}>*</span>}
      </label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        required={required}
        placeholder={placeholder}
        style={inputStyle}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = OLIVE
          e.currentTarget.style.boxShadow = `0 0 0 3px ${OLIVE_BG}`
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = BORDER_MD
          e.currentTarget.style.boxShadow = "none"
        }}
      />
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontSize: "10px",
          fontWeight: 600,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: INK3,
          borderBottom: `1px solid ${BORDER}`,
          paddingBottom: "0.5rem",
          marginBottom: "1rem",
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
        {children}
      </div>
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>{children}</div>
}

export function BusquedaSheet({ busqueda }: { busqueda?: Busqueda }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const isEdit = !!busqueda

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const data = {
      puesto: fd.get("puesto") as string,
      cliente: fd.get("cliente") as string,
      estado: fd.get("estado") as "activa" | "pausada" | "cerrada",
      ubicacion: fd.get("ubicacion") as string,
      rango_salarial: fd.get("rango_salarial") as string,
      descripcion: fd.get("descripcion") as string,
      requisitos: fd.get("requisitos") as string,
      fecha_apertura: fd.get("fecha_apertura") as string,
    }

    startTransition(async () => {
      setError(null)
      const result = isEdit
        ? await updateBusqueda(busqueda.id, data)
        : await createBusqueda(data)

      if (!result.success) {
        setError(result.error)
        return
      }

      toast.success(isEdit ? "Búsqueda actualizada" : "Búsqueda creada")
      router.refresh()
      setOpen(false)
    })
  }

  return (
    <>
      {isEdit ? (
        <button
          onClick={() => setOpen(true)}
          style={{
            padding: "0.5rem 1rem",
            fontSize: "14px",
            border: `1px solid ${BORDER_MD}`,
            color: INK3,
            background: "transparent",
            cursor: "pointer",
            transition: "color 0.15s, border-color 0.15s",
            borderRadius: "0.375rem",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = INK
            e.currentTarget.style.borderColor = INK
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = INK3
            e.currentTarget.style.borderColor = BORDER_MD
          }}
        >
          Editar
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            padding: "0.5rem 1rem",
            fontSize: "13.5px",
            fontWeight: 600,
            color: "#ffffff",
            background: OLIVE,
            border: "none",
            borderRadius: "0.75rem",
            cursor: "pointer",
            transition: "transform 0.15s, box-shadow 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-1px)"
            e.currentTarget.style.boxShadow = "0 4px 14px rgba(42,74,24,0.3)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)"
            e.currentTarget.style.boxShadow = "none"
          }}
        >
          <Plus style={{ width: 14, height: 14 }} />
          Nueva búsqueda
        </button>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          showCloseButton={false}
          className="p-0 flex flex-col gap-0"
          style={{
            width: "min(100vw, 520px)",
            maxWidth: "520px",
            background: "#f9fafb",
          }}
        >
          {/* Header */}
          <SheetHeader
            style={{
              background: SURFACE,
              borderBottom: `1px solid ${BORDER}`,
              padding: "1.25rem 1.5rem",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <SheetTitle
                  style={{
                    fontFamily: "var(--font-fraunces), serif",
                    fontSize: "20px",
                    fontVariationSettings: '"opsz" 144, "SOFT" 100',
                    letterSpacing: "-0.02em",
                    color: INK,
                    fontWeight: 400,
                  }}
                >
                  {isEdit ? busqueda.puesto : "Nueva búsqueda"}
                </SheetTitle>
                {isEdit && (
                  <p style={{ fontSize: "12px", color: INK3, marginTop: "0.125rem" }}>
                    {busqueda.cliente}
                  </p>
                )}
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{
                  padding: "0.25rem",
                  color: INK3,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  borderRadius: "0.375rem",
                  marginTop: "2px",
                }}
              >
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>
          </SheetHeader>

          {/* Scrollable form */}
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
          >
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "1.5rem",
                display: "flex",
                flexDirection: "column",
                gap: "1.75rem",
              }}
            >
              <Section label="Identificación">
                <Field label="Puesto" name="puesto" defaultValue={busqueda?.puesto} required placeholder="Capataz de campo" />
                <Field label="Cliente / Empleador" name="cliente" defaultValue={busqueda?.cliente} required placeholder="Estancia La Esperanza" />
                <div>
                  <label style={labelStyle}>Estado</label>
                  <select
                    name="estado"
                    defaultValue={busqueda?.estado ?? "activa"}
                    style={inputStyle}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = OLIVE
                      e.currentTarget.style.boxShadow = `0 0 0 3px ${OLIVE_BG}`
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = BORDER_MD
                      e.currentTarget.style.boxShadow = "none"
                    }}
                  >
                    <option value="activa">Activa</option>
                    <option value="pausada">Pausada</option>
                    <option value="cerrada">Cerrada</option>
                  </select>
                </div>
              </Section>

              <Section label="Detalles">
                <Row>
                  <Field label="Ubicación" name="ubicacion" defaultValue={busqueda?.ubicacion ?? ""} placeholder="Santa Rosa, LP" />
                  <Field label="Rango salarial" name="rango_salarial" defaultValue={busqueda?.rango_salarial ?? ""} placeholder="$300.000 – $500.000" />
                </Row>
                <Field
                  label="Fecha de apertura"
                  name="fecha_apertura"
                  type="date"
                  defaultValue={busqueda?.fecha_apertura ?? new Date().toISOString().split("T")[0]}
                />
              </Section>

              <Section label="Brief">
                <div>
                  <label style={labelStyle}>Descripción del puesto</label>
                  <textarea
                    name="descripcion"
                    defaultValue={busqueda?.descripcion ?? ""}
                    rows={3}
                    placeholder="Descripción de la posición, perfil buscado..."
                    style={{ ...inputStyle, resize: "none" }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = OLIVE
                      e.currentTarget.style.boxShadow = `0 0 0 3px ${OLIVE_BG}`
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = BORDER_MD
                      e.currentTarget.style.boxShadow = "none"
                    }}
                  />
                </div>
              </Section>

              <Section label="Requisitos">
                <div>
                  <label style={labelStyle}>Un requisito por línea</label>
                  <textarea
                    name="requisitos"
                    defaultValue={busqueda?.requisitos?.join("\n") ?? ""}
                    rows={5}
                    placeholder={"Manejo de hacienda\nLicencia de conducir\nDisponibilidad para residir en campo"}
                    style={{ ...inputStyle, resize: "none" }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = OLIVE
                      e.currentTarget.style.boxShadow = `0 0 0 3px ${OLIVE_BG}`
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = BORDER_MD
                      e.currentTarget.style.boxShadow = "none"
                    }}
                  />
                </div>
              </Section>

              {error && (
                <div
                  style={{
                    fontSize: "13px",
                    color: "#cf222e",
                    background: "#ffebe9",
                    border: "1px solid #f1aeb5",
                    borderRadius: "0.5rem",
                    padding: "0.625rem 0.875rem",
                  }}
                >
                  {error}
                </div>
              )}
            </div>

            {/* Sticky footer */}
            <div
              style={{
                flexShrink: 0,
                background: SURFACE,
                borderTop: `1px solid ${BORDER}`,
                padding: "1rem 1.5rem",
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.75rem",
                alignItems: "center",
              }}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  padding: "0.5rem 1rem",
                  fontSize: "13.5px",
                  color: INK3,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = INK)}
                onMouseLeave={(e) => (e.currentTarget.style.color = INK3)}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pending}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.375rem",
                  padding: "0.5rem 1.25rem",
                  fontSize: "13.5px",
                  fontWeight: 600,
                  color: "#ffffff",
                  background: pending ? "#5a8a40" : OLIVE,
                  border: "none",
                  borderRadius: "0.75rem",
                  cursor: pending ? "not-allowed" : "pointer",
                  opacity: pending ? 0.8 : 1,
                  transition: "background 0.15s",
                }}
              >
                {pending && <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />}
                {isEdit ? "Guardar cambios" : "Crear búsqueda"}
              </button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </>
  )
}
