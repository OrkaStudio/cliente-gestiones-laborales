"use client"

import { useState } from "react"
import { FileText, Download, X } from "lucide-react"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { CVProcesadoEditor } from "./cv-procesado-editor"

interface Props {
  candidatoId: string
  nombre:      string
  apellido:    string
  cvTexto:     string | null
}

export function CVSheet({ candidatoId, nombre, apellido, cvTexto }: Props) {
  const [open,    setOpen]    = useState(false)
  const [editing, setEditing] = useState(false)
  const hasCv = !!cvTexto?.trim()

  return (
    <>
      {/* ── Trigger ─────────────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(true)}
        style={{
          display:        "inline-flex",
          alignItems:     "center",
          gap:            "0.375rem",
          padding:        "0.5rem 1rem",
          fontSize:       "13.5px",
          fontWeight:     600,
          color:          hasCv ? "var(--gl-olive)" : "var(--gl-ink-3)",
          background:     hasCv ? "var(--gl-olive-bg)" : "transparent",
          border:         hasCv
            ? "1px solid rgba(42,74,24,0.25)"
            : "1px solid var(--gl-border-md)",
          borderRadius:   "0.75rem",
          cursor:         "pointer",
          transition:     "all 0.15s",
          whiteSpace:     "nowrap",
        }}
        onMouseEnter={(e) => {
          if (hasCv) {
            e.currentTarget.style.background = "#ddecd4"
            e.currentTarget.style.borderColor = "rgba(42,74,24,0.4)"
          } else {
            e.currentTarget.style.color = "var(--gl-ink)"
          }
        }}
        onMouseLeave={(e) => {
          if (hasCv) {
            e.currentTarget.style.background = "var(--gl-olive-bg)"
            e.currentTarget.style.borderColor = "rgba(42,74,24,0.25)"
          } else {
            e.currentTarget.style.color = "var(--gl-ink-3)"
          }
        }}
      >
        <FileText style={{ width: 14, height: 14 }} />
        Ver CV
      </button>

      {/* ── Sheet ───────────────────────────────────────────────────────────── */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          showCloseButton={false}
          className="p-0 flex flex-col gap-0"
          style={{
            width:      "min(100vw, 720px)",
            maxWidth:   "720px",
            background: "var(--gl-bg)",
          }}
        >
          {/* Header */}
          <div
            style={{
              background:   "#fff",
              borderBottom: "1px solid var(--gl-border)",
              padding:      "1.125rem 1.5rem",
              flexShrink:   0,
              display:      "flex",
              alignItems:   "center",
              justifyContent: "space-between",
              gap:          "1rem",
            }}
          >
            {/* Left: label + name + hint */}
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize:        10,
                  fontWeight:      700,
                  letterSpacing:   "0.14em",
                  textTransform:   "uppercase",
                  color:           "var(--gl-olive)",
                  marginBottom:    2,
                }}
              >
                CV Procesado
              </div>
              <div
                style={{
                  fontSize:      17,
                  fontWeight:    700,
                  color:         "var(--gl-ink)",
                  letterSpacing: "-0.01em",
                  lineHeight:    1.2,
                  overflow:      "hidden",
                  textOverflow:  "ellipsis",
                  whiteSpace:    "nowrap",
                }}
              >
                {nombre} {apellido}
              </div>
              <div
                style={{
                  fontSize:   11,
                  color:      "var(--gl-ink-3)",
                  marginTop:  3,
                  transition: "color 0.15s",
                }}
              >
                {editing
                  ? "Editando sección — guardá los cambios antes de continuar"
                  : "CV procesado — usá 'Editar CV' para modificar"}
              </div>
            </div>

            {/* Right: download + close */}
            <div
              style={{
                display:    "flex",
                alignItems: "center",
                gap:        "0.5rem",
                flexShrink: 0,
              }}
            >
              {hasCv && (
                <a
                  href={`/api/cv/${candidatoId}/pdf`}
                  download
                  style={{
                    display:        "inline-flex",
                    alignItems:     "center",
                    gap:            "0.375rem",
                    padding:        "0.5rem 1rem",
                    fontSize:       "13px",
                    fontWeight:     600,
                    color:          "#fff",
                    background:     "var(--gl-olive)",
                    borderRadius:   "0.625rem",
                    textDecoration: "none",
                    boxShadow:      "0 2px 8px rgba(42,74,24,0.2)",
                    transition:     "opacity 0.15s",
                    whiteSpace:     "nowrap",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  <Download style={{ width: 13, height: 13 }} />
                  Descargar PDF
                </a>
              )}

              <button
                onClick={() => setOpen(false)}
                style={{
                  display:      "flex",
                  alignItems:   "center",
                  justifyContent: "center",
                  width:        32,
                  height:       32,
                  padding:      0,
                  color:        "var(--gl-ink-3)",
                  background:   "transparent",
                  border:       "1px solid var(--gl-border)",
                  cursor:       "pointer",
                  borderRadius: "0.5rem",
                  transition:   "all 0.15s",
                  flexShrink:   0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--gl-ink)"
                  e.currentTarget.style.borderColor = "var(--gl-border-md)"
                  e.currentTarget.style.background = "var(--gl-bg)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--gl-ink-3)"
                  e.currentTarget.style.borderColor = "var(--gl-border)"
                  e.currentTarget.style.background = "transparent"
                }}
              >
                <X style={{ width: 15, height: 15 }} />
              </button>
            </div>
          </div>

          {/* Body — scrollable */}
          <div
            style={{
              flex:       1,
              overflowY:  "auto",
              padding:    "1.5rem",
            }}
          >
            <CVProcesadoEditor
              candidatoId={candidatoId}
              nombre={nombre}
              apellido={apellido}
              initialTexto={cvTexto}
              hideDownload
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
