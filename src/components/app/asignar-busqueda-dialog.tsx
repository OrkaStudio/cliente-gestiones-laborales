"use client"

import { useState, useTransition, useMemo } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Search, MapPin, Clock, CheckCircle2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { createGestion } from "@/lib/actions/gestiones"

const INK = "#0d1117"
const INK2 = "#3d4451"
const INK3 = "#8b949e"
const SURFACE = "#ffffff"
const BORDER = "#eaecef"
const BORDER_MD = "#d4d8de"
const OLIVE = "#2a4a18"
const OLIVE_BG = "#eef5e8"
const OLIVE_LIGHT = "#3d6b24"

type Busqueda = {
  id: string
  puesto: string
  cliente: string
  ubicacion: string | null
  fecha_apertura: string
  estado: string
}

interface Props {
  candidatoId: string
  candidatoNombre: string
  busquedas: Busqueda[]
  gestionesExistentes: string[]  // busqueda_ids ya asignados
}

function calcDaysOpen(fecha: string) {
  return Math.floor((Date.now() - new Date(fecha).getTime()) / 86_400_000)
}

export function AsignarBusquedaDialog({
  candidatoId,
  candidatoNombre,
  busquedas,
  gestionesExistentes,
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const filtered = useMemo(() => {
    if (!query.trim()) return busquedas
    const q = query.toLowerCase()
    return busquedas.filter(
      (b) =>
        b.puesto.toLowerCase().includes(q) ||
        b.cliente.toLowerCase().includes(q) ||
        (b.ubicacion ?? "").toLowerCase().includes(q),
    )
  }, [busquedas, query])

  function handleOpen() {
    setOpen(true)
    setQuery("")
    setSelected(null)
  }

  function handleConfirm() {
    if (!selected) return
    startTransition(async () => {
      const result = await createGestion({
        candidato_id: candidatoId,
        busqueda_id: selected,
      })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Candidato asignado a la búsqueda")
      router.refresh()
      setOpen(false)
    })
  }

  return (
    <>
      <button
        onClick={handleOpen}
        style={{
          padding: "0.5rem 1rem",
          fontSize: "14px",
          fontWeight: 600,
          color: "#ffffff",
          background: OLIVE,
          border: "none",
          cursor: "pointer",
          borderRadius: "0.375rem",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = OLIVE_LIGHT)}
        onMouseLeave={(e) => (e.currentTarget.style.background = OLIVE)}
      >
        Asignar a búsqueda
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="p-0 gap-0 overflow-hidden"
          style={{
            maxWidth: "480px",
            width: "calc(100vw - 2rem)",
            borderRadius: "1rem",
            background: SURFACE,
          }}
        >
          {/* Header */}
          <DialogHeader
            style={{
              padding: "1.25rem 1.5rem 1rem",
              borderBottom: `1px solid ${BORDER}`,
            }}
          >
            <DialogTitle
              style={{
                fontFamily: "var(--font-fraunces), serif",
                fontSize: "18px",
                fontVariationSettings: '"opsz" 144, "SOFT" 100',
                letterSpacing: "-0.02em",
                color: INK,
                fontWeight: 400,
              }}
            >
              Asignar a búsqueda
            </DialogTitle>
            <p style={{ fontSize: "12.5px", color: INK3, marginTop: "0.25rem" }}>
              <span style={{ color: INK2, fontWeight: 500 }}>{candidatoNombre}</span>
              {" "}pasará a Preseleccionado en la búsqueda elegida
            </p>
          </DialogHeader>

          {/* Search */}
          <div style={{ padding: "0.875rem 1.5rem", borderBottom: `1px solid ${BORDER}` }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                border: `1px solid ${BORDER_MD}`,
                borderRadius: "0.5rem",
                padding: "0.5rem 0.75rem",
                background: "#f9fafb",
              }}
            >
              <Search style={{ width: 14, height: 14, color: INK3, flexShrink: 0 }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filtrar por puesto o cliente..."
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: "13.5px",
                  color: INK,
                  fontFamily: "inherit",
                }}
                autoFocus
              />
            </div>
          </div>

          {/* List */}
          <div style={{ maxHeight: "320px", overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "2rem 1.5rem", textAlign: "center", color: INK3, fontSize: "13px" }}>
                No hay búsquedas activas
              </div>
            ) : (
              filtered.map((b) => {
                const yaAsignado = gestionesExistentes.includes(b.id)
                const isSelected = selected === b.id
                const days = calcDaysOpen(b.fecha_apertura)

                return (
                  <button
                    key={b.id}
                    disabled={yaAsignado}
                    onClick={() => !yaAsignado && setSelected(isSelected ? null : b.id)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.875rem",
                      padding: "0.875rem 1.5rem",
                      background: isSelected ? OLIVE_BG : yaAsignado ? "#f9fafb" : SURFACE,
                      cursor: yaAsignado ? "not-allowed" : "pointer",
                      textAlign: "left",
                      border: "none",
                      borderBottom: `1px solid ${BORDER}`,
                      opacity: yaAsignado ? 0.55 : 1,
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) => {
                      if (!yaAsignado && !isSelected) e.currentTarget.style.background = "#f9fafb"
                    }}
                    onMouseLeave={(e) => {
                      if (!yaAsignado && !isSelected) e.currentTarget.style.background = SURFACE
                    }}
                  >
                    {/* Radio indicator */}
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        border: `2px solid ${isSelected ? OLIVE : BORDER_MD}`,
                        background: isSelected ? OLIVE : "transparent",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.15s",
                      }}
                    >
                      {isSelected && (
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />
                      )}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "13.5px", fontWeight: 500, color: INK, lineHeight: 1.3 }}>
                        {b.puesto}
                      </div>
                      <div style={{ fontSize: "12px", color: INK3, marginTop: "0.125rem" }}>
                        {b.cliente}
                        {b.ubicacion ? ` · ${b.ubicacion}` : ""}
                      </div>
                    </div>

                    {/* Meta */}
                    <div style={{ flexShrink: 0, textAlign: "right" }}>
                      {yaAsignado ? (
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            color: "#1a7f37",
                            background: "#dafbe1",
                            padding: "0.2rem 0.5rem",
                            borderRadius: "999px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem",
                          }}
                        >
                          <CheckCircle2 style={{ width: 10, height: 10 }} />
                          Ya asignado
                        </span>
                      ) : (
                        <span style={{ fontSize: "11px", color: INK3, fontVariantNumeric: "tabular-nums" }}>
                          {days}d abierta
                        </span>
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "1rem 1.5rem",
              borderTop: `1px solid ${BORDER}`,
              background: "#f9fafb",
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.75rem",
              alignItems: "center",
            }}
          >
            <button
              onClick={() => setOpen(false)}
              style={{
                padding: "0.5rem 1rem",
                fontSize: "13.5px",
                color: INK3,
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selected || pending}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.375rem",
                padding: "0.5rem 1.25rem",
                fontSize: "13.5px",
                fontWeight: 600,
                color: "#ffffff",
                background: !selected || pending ? "#8b949e" : OLIVE,
                border: "none",
                borderRadius: "0.75rem",
                cursor: !selected || pending ? "not-allowed" : "pointer",
                transition: "background 0.15s",
              }}
            >
              {pending && <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />}
              Asignar
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
