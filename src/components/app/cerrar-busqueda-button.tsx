"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { X, Loader2, CheckCircle, AlertCircle } from "lucide-react"
import { cerrarBusqueda } from "@/lib/actions/busquedas"

const INK      = "#0d1117"
const INK3     = "#8b949e"
const BORDER   = "#eaecef"
const BORDER_MD = "#d4d8de"
const OLIVE    = "#2a4a18"
const OLIVE_BG = "#eef5e8"

type Candidato = { id: string; nombre: string; apellido: string; ultimo_puesto: string | null }
type Gestion   = { id: string; candidatos: Candidato | null }

export function CerrarBusquedaButton({
  busquedaId,
  puesto,
  cliente,
  gestiones,
  hayContratado,
}: {
  busquedaId:    string
  puesto:        string
  cliente:       string
  gestiones:     Gestion[]
  hayContratado: boolean
}) {
  const [open, setOpen]           = useState(false)
  const [seleccionado, setSelec]  = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const candidatosElegibles = gestiones
    .filter((g) => g.candidatos && g.candidatos.nombre)
    .map((g) => ({ gestionId: g.id, candidato: g.candidatos! }))

  function handleCerrar() {
    if (!hayContratado && !seleccionado) return
    startTransition(async () => {
      const res = await cerrarBusqueda(
        busquedaId,
        hayContratado ? undefined : seleccionado ?? undefined,
      )
      if (!res.success) {
        toast.error("No se pudo cerrar la búsqueda")
        return
      }
      toast.success("Búsqueda cerrada · Garantía iniciada")
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          padding:      "0.5rem 1.125rem",
          fontSize:     "13.5px",
          fontWeight:   600,
          color:        "#fff",
          background:   "#cf222e",
          border:       "none",
          borderRadius: "0.75rem",
          cursor:       "pointer",
          whiteSpace:   "nowrap",
        }}
      >
        Cerrar búsqueda
      </button>

      {open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} onClick={() => !pending && setOpen(false)} />
          <div style={{
            position: "relative", background: "#fff", borderRadius: "1rem",
            width: "min(100%, 480px)", boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            display: "flex", flexDirection: "column", overflow: "hidden",
          }}>
            {/* Header */}
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: INK }}>Cerrar búsqueda</div>
                <div style={{ fontSize: 12.5, color: INK3, marginTop: 2 }}>{puesto} · {cliente}</div>
              </div>
              <button onClick={() => !pending && setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: INK3 }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            {/* Cuerpo */}
            <div style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              {hayContratado ? (
                <div style={{ display: "flex", gap: 10, padding: "0.875rem 1rem", borderRadius: "0.75rem", background: "#f0fdf4", border: "1.5px solid #bbf7d0" }}>
                  <CheckCircle style={{ width: 18, height: 18, color: "#16a34a", flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: "#15803d" }}>Hay un candidato contratado</div>
                    <div style={{ fontSize: 12, color: "#166534", marginTop: 2 }}>
                      La búsqueda se cerrará e iniciará el período de garantía de 90 días.
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", gap: 10, padding: "0.875rem 1rem", borderRadius: "0.75rem", background: "#fff8f1", border: "1.5px solid #fed7aa" }}>
                    <AlertCircle style={{ width: 18, height: 18, color: "#c2410c", flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: "#c2410c" }}>Ningún candidato está marcado como contratado</div>
                      <div style={{ fontSize: 12, color: "#9a3412", marginTop: 2 }}>
                        Seleccioná quién quedó en el puesto para cerrar la búsqueda. Se marcará como contratado y su perfil pasará a inactivo.
                      </div>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: INK3, marginBottom: 8 }}>
                      ¿Quién quedó en el puesto?
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {candidatosElegibles.map(({ gestionId, candidato }) => {
                        const sel = seleccionado === gestionId
                        return (
                          <button
                            key={gestionId}
                            onClick={() => setSelec(sel ? null : gestionId)}
                            style={{
                              display:      "flex",
                              alignItems:   "center",
                              gap:          10,
                              padding:      "0.75rem 1rem",
                              borderRadius: "0.75rem",
                              border:       sel ? `2px solid ${OLIVE}` : `2px solid ${BORDER}`,
                              background:   sel ? OLIVE_BG : "#fff",
                              cursor:       "pointer",
                              textAlign:    "left",
                              transition:   "all 0.15s",
                            }}
                          >
                            <div style={{
                              width: 32, height: 32, borderRadius: "50%",
                              background: sel ? OLIVE : "#f6f8fa",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              flexShrink: 0, fontSize: 12, fontWeight: 700,
                              color: sel ? "#fff" : INK3,
                            }}>
                              {candidato.nombre[0]}{candidato.apellido[0]}
                            </div>
                            <div>
                              <div style={{ fontSize: 13.5, fontWeight: 600, color: sel ? OLIVE : INK }}>
                                {candidato.nombre} {candidato.apellido}
                              </div>
                              {candidato.ultimo_puesto && (
                                <div style={{ fontSize: 11.5, color: INK3, marginTop: 1 }}>
                                  {candidato.ultimo_puesto}
                                </div>
                              )}
                            </div>
                          </button>
                        )
                      })}
                      {candidatosElegibles.length === 0 && (
                        <div style={{ fontSize: 13, color: INK3, textAlign: "center", padding: "1rem 0" }}>
                          No hay candidatos activos en esta búsqueda.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: "1rem 1.5rem", borderTop: `1px solid ${BORDER}`, display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                onClick={() => setOpen(false)}
                disabled={pending}
                style={{ padding: "0.5rem 1rem", fontSize: 13.5, color: INK3, background: "transparent", border: "none", cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                onClick={handleCerrar}
                disabled={pending || (!hayContratado && !seleccionado)}
                style={{
                  display:      "inline-flex",
                  alignItems:   "center",
                  gap:          "0.375rem",
                  padding:      "0.5rem 1.25rem",
                  fontSize:     13.5,
                  fontWeight:   600,
                  color:        "#fff",
                  background:   (pending || (!hayContratado && !seleccionado)) ? "#d4d8de" : "#cf222e",
                  border:       "none",
                  borderRadius: "0.75rem",
                  cursor:       (pending || (!hayContratado && !seleccionado)) ? "not-allowed" : "pointer",
                  transition:   "background 0.15s",
                }}
              >
                {pending && <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />}
                {hayContratado ? "Confirmar cierre" : "Cerrar y marcar contratado"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
