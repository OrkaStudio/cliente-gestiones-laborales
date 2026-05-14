"use client"

import { useState, useTransition, useEffect, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Loader2, X } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { createCandidato, updateCandidato } from "@/lib/actions/candidatos"
import type { Tables } from "@/lib/supabase/types"

type Candidato = Tables<"candidatos">

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
  hint,
}: {
  label: string
  name: string
  defaultValue?: string
  required?: boolean
  type?: string
  placeholder?: string
  hint?: string
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
      {hint && (
        <p style={{ fontSize: "11px", color: INK3, marginTop: "0.25rem" }}>{hint}</p>
      )}
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

export function CandidatoSheet({ candidato }: { candidato?: Candidato }) {
  const [open,        setOpen]        = useState(false)
  const [pending,     startTransition] = useTransition()
  const [error,       setError]       = useState<string | null>(null)
  const [dirty,       setDirty]       = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const router = useRouter()
  const isEdit = !!candidato

  // Intercept browser back button when the sheet is open with unsaved changes
  useEffect(() => {
    if (!open || !dirty) return
    window.history.pushState(null, "", window.location.href)
    function handlePopState() {
      window.history.pushState(null, "", window.location.href)
      setShowConfirm(true)
    }
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [open, dirty])

  function tryClose() {
    if (dirty) { setShowConfirm(true) } else { doClose() }
  }

  function doClose() {
    setOpen(false)
    setDirty(false)
    setShowConfirm(false)
    setError(null)
  }

  function handleOpenChange(val: boolean) {
    if (!val) tryClose()
    else { setOpen(true); setDirty(false); setShowConfirm(false) }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const data = {
      nombre: fd.get("nombre") as string,
      apellido: fd.get("apellido") as string,
      email: fd.get("email") as string,
      telefono: fd.get("telefono") as string,
      ultimo_puesto: fd.get("ultimo_puesto") as string,
      disponibilidad: fd.get("disponibilidad") as string,
      pretension_salarial: fd.get("pretension_salarial") as string,
      fecha_nacimiento: fd.get("fecha_nacimiento") as string,
      ubicacion: fd.get("ubicacion") as string,
      educacion: fd.get("educacion") as string,
      idiomas: fd.get("idiomas") as string,
      notas_recruiter: fd.get("notas_recruiter") as string,
      estado: fd.get("estado") as "activo" | "inactivo",
    }

    startTransition(async () => {
      setError(null)
      const result = isEdit
        ? await updateCandidato(candidato.id, data)
        : await createCandidato(data)

      if (!result.success) {
        setError(result.error)
        return
      }

      toast.success(isEdit ? "Candidato actualizado" : "Candidato creado")
      router.refresh()
      doClose()
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
          Nuevo candidato
        </button>
      )}

      <Sheet open={open} onOpenChange={handleOpenChange}>
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
                  {isEdit
                    ? `${candidato.nombre} ${candidato.apellido}`
                    : "Nuevo candidato"}
                </SheetTitle>
                {isEdit && (
                  <p style={{ fontSize: "12px", color: INK3, marginTop: "0.125rem" }}>
                    Editando perfil
                  </p>
                )}
              </div>
              <button
                onClick={tryClose}
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

          {/* Dirty-state confirmation bar */}
          {showConfirm && (
            <div
              style={{
                background: "#fffbeb",
                borderBottom: "1px solid #fcd34d",
                padding: "0.75rem 1.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1rem",
                flexShrink: 0,
                fontSize: "13px",
                color: "#92400e",
              }}
            >
              <span>Tenés cambios sin guardar. ¿Salir igual?</span>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  style={{
                    padding: "0.25rem 0.75rem",
                    fontSize: "12.5px",
                    border: "1px solid #fcd34d",
                    background: "transparent",
                    color: "#92400e",
                    borderRadius: "0.375rem",
                    cursor: "pointer",
                  }}
                >
                  Seguir editando
                </button>
                <button
                  type="button"
                  onClick={doClose}
                  style={{
                    padding: "0.25rem 0.75rem",
                    fontSize: "12.5px",
                    border: "none",
                    background: "#92400e",
                    color: "#fff",
                    borderRadius: "0.375rem",
                    cursor: "pointer",
                  }}
                >
                  Salir sin guardar
                </button>
              </div>
            </div>
          )}

          {/* Scrollable form body */}
          <form
            onSubmit={handleSubmit}
            onChange={() => setDirty(true)}
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
                <Row>
                  <Field label="Nombre" name="nombre" defaultValue={candidato?.nombre} required placeholder="Juan" />
                  <Field label="Apellido" name="apellido" defaultValue={candidato?.apellido} required placeholder="Pérez" />
                </Row>
                <Row>
                  <Field label="Email" name="email" type="email" defaultValue={candidato?.email ?? ""} placeholder="juan@mail.com" />
                  <Field label="Teléfono" name="telefono" defaultValue={candidato?.telefono ?? ""} placeholder="221 555-1234" />
                </Row>
              </Section>

              <Section label="Rol profesional">
                <Field label="Último puesto" name="ultimo_puesto" defaultValue={candidato?.ultimo_puesto ?? ""} placeholder="Capataz de campo" />
                <Row>
                  <Field label="Disponibilidad" name="disponibilidad" defaultValue={candidato?.disponibilidad ?? ""} placeholder="Inmediata" />
                  <Field label="Pretensión salarial" name="pretension_salarial" defaultValue={candidato?.pretension_salarial ?? ""} placeholder="$500.000" />
                </Row>
              </Section>

              <Section label="Datos personales">
                <Row>
                  <Field label="Fecha de nacimiento" name="fecha_nacimiento" type="date" defaultValue={candidato?.fecha_nacimiento ?? ""} />
                  <Field label="Ubicación" name="ubicacion" defaultValue={candidato?.ubicacion ?? ""} placeholder="Santa Rosa, LP" />
                </Row>
                <Field label="Educación" name="educacion" defaultValue={candidato?.educacion ?? ""} placeholder="Técnico agropecuario" />
                <Field
                  label="Idiomas"
                  name="idiomas"
                  defaultValue={candidato?.idiomas?.join(", ") ?? ""}
                  placeholder="Español, Inglés"
                  hint="Separar con comas"
                />
              </Section>

              <Section label="Notas">
                <div>
                  <label style={labelStyle}>Estado</label>
                  <select
                    name="estado"
                    defaultValue={candidato?.estado ?? "activo"}
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
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Notas del recruiter</label>
                  <textarea
                    name="notas_recruiter"
                    defaultValue={candidato?.notas_recruiter ?? ""}
                    rows={4}
                    placeholder="Observaciones del proceso de selección..."
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
                onClick={tryClose}
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
                {isEdit ? "Guardar cambios" : "Crear candidato"}
              </button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </>
  )
}
