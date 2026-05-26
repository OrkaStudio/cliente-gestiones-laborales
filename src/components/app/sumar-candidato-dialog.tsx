"use client"

import { useState, useTransition, useMemo } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Search, CheckCircle2 } from "lucide-react"
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

type Candidato = {
  id: string
  nombre: string
  apellido: string
  ultimo_puesto: string | null
  ubicacion: string | null
  estado: string
}

interface Props {
  busquedaId: string
  busquedaPuesto: string
  candidatos: Candidato[]
  gestionesExistentes: string[]  // candidato_ids ya en esta búsqueda
}

export function SumarCandidatoDialog({
  busquedaId,
  busquedaPuesto,
  candidatos,
  gestionesExistentes,
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<string[]>([])
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const filtered = useMemo(() => {
    if (!query.trim()) return candidatos
    const q = query.toLowerCase()
    return candidatos.filter(
      (c) =>
        (c.nombre ?? "").toLowerCase().includes(q) ||
        (c.apellido ?? "").toLowerCase().includes(q) ||
        (c.ultimo_puesto ?? "").toLowerCase().includes(q) ||
        (c.ubicacion ?? "").toLowerCase().includes(q),
    )
  }, [candidatos, query])

  function handleOpen() {
    setOpen(true)
    setQuery("")
    setSelected([])
  }

  function toggleSelect(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  function handleConfirm() {
    if (selected.length === 0) return
    startTransition(async () => {
      const results = await Promise.all(
        selected.map((candidato_id) =>
          createGestion({ candidato_id, busqueda_id: busquedaId }),
        ),
      )
      const errors = results.filter((r) => !r.success)
      if (errors.length > 0) {
        toast.error(`${errors.length} candidato${errors.length !== 1 ? "s" : ""} no se pudieron sumar`)
      } else {
        toast.success(
          selected.length === 1
            ? "Candidato sumado a la búsqueda"
            : `${selected.length} candidatos sumados a la búsqueda`,
        )
      }
      router.refresh()
      setOpen(false)
    })
  }

  const AVATAR_COLORS = [
    { bg: "#dafbe1", color: "#1a7f37" },
    { bg: "#ddf4ff", color: "#0550ae" },
    { bg: "#ffd8eb", color: "#99286e" },
    { bg: "#fff8c5", color: "#7d4e00" },
    { bg: "#eddeff", color: "#6e40c9" },
  ]

  const btnLabel =
    selected.length === 0
      ? "Sumar"
      : selected.length === 1
        ? "Sumar 1 candidato"
        : `Sumar ${selected.length} candidatos`

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
        Sumar candidato
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
              Sumar candidatos
            </DialogTitle>
            <p style={{ fontSize: "12.5px", color: INK3, marginTop: "0.25rem" }}>
              Seleccioná uno o más. Pasarán a{" "}
              <span style={{ color: INK2, fontWeight: 500 }}>Preseleccionado</span>
              {" "}en{" "}
              <span style={{ color: INK2, fontWeight: 500 }}>{busquedaPuesto}</span>
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
                placeholder="Buscar por nombre o puesto..."
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
                No hay candidatos activos
              </div>
            ) : (
              filtered.map((c, i) => {
                const yaAsignado = gestionesExistentes.includes(c.id)
                const isSelected = selected.includes(c.id)
                const pal = AVATAR_COLORS[i % AVATAR_COLORS.length]
                const initials = `${(c.nombre ?? "?")[0]}${(c.apellido ?? "?")[0]}`

                return (
                  <button
                    key={c.id}
                    disabled={yaAsignado}
                    onClick={() => !yaAsignado && toggleSelect(c.id)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.875rem",
                      padding: "0.75rem 1.5rem",
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
                    {/* Avatar */}
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: pal.bg,
                        color: pal.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12px",
                        fontWeight: 700,
                        flexShrink: 0,
                        outline: isSelected ? `2px solid ${OLIVE}` : "none",
                        outlineOffset: "2px",
                        transition: "outline 0.15s",
                      }}
                    >
                      {initials}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "13.5px", fontWeight: 500, color: INK, lineHeight: 1.3 }}>
                        {c.nombre} {c.apellido}
                      </div>
                      {c.ultimo_puesto && (
                        <div style={{ fontSize: "12px", color: INK3, marginTop: "0.125rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {c.ultimo_puesto}
                          {c.ubicacion ? ` · ${c.ubicacion}` : ""}
                        </div>
                      )}
                    </div>

                    {/* Badge */}
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
                          flexShrink: 0,
                        }}
                      >
                        <CheckCircle2 style={{ width: 10, height: 10 }} />
                        En gestión
                      </span>
                    ) : isSelected ? (
                      <span
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          background: OLIVE,
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <CheckCircle2 style={{ width: 11, height: 11, color: "#fff" }} />
                      </span>
                    ) : null}
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
              disabled={selected.length === 0 || pending}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.375rem",
                padding: "0.5rem 1.25rem",
                fontSize: "13.5px",
                fontWeight: 600,
                color: "#ffffff",
                background: selected.length === 0 || pending ? "#8b949e" : OLIVE,
                border: "none",
                borderRadius: "0.75rem",
                cursor: selected.length === 0 || pending ? "not-allowed" : "pointer",
                transition: "background 0.15s",
              }}
            >
              {pending && <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />}
              {btnLabel}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
