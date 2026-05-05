"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import { Check, ChevronDown } from "lucide-react"
import { updateGestionEstado } from "@/lib/actions/gestiones"

const PIPELINE = [
  { key: "preseleccionado",    label: "Preseleccionado", bg: "#f0f3ff", color: "#3451b2" },
  { key: "entrevista_orka",    label: "Entrevista Orka", bg: "#ddf4ff", color: "#0550ae" },
  { key: "presentado_cliente", label: "Presentado",      bg: "#eddeff", color: "#6e40c9" },
  { key: "entrevista_cliente", label: "2ª Entrevista",   bg: "#fff8c5", color: "#9a6700" },
  { key: "ofertado",           label: "Ofertado",        bg: "#ffd8eb", color: "#99286e" },
  { key: "contratado",         label: "Contratado",      bg: "#dafbe1", color: "#1a7f37" },
] as const

const DESCARTADO = { key: "descartado", label: "Descartado", bg: "#ffebe9", color: "#cf222e" } as const

const ALL_STAGES = [...PIPELINE, DESCARTADO]

function stageStyle(key: string) {
  return ALL_STAGES.find((s) => s.key === key) ?? { key, label: key, bg: "var(--gl-gray-bg)", color: "var(--gl-gray)" }
}

export function GestionEstadoSelect({
  gestionId,
  candidatoId,
  busquedaId,
  estado,
}: {
  gestionId: string
  candidatoId: string
  busquedaId: string
  estado: string
}) {
  const [open, setOpen]       = useState(false)
  const [current, setCurrent] = useState(estado)
  const [isPending, start]    = useTransition()
  const ref                   = useRef<HTMLDivElement>(null)
  const badge                 = stageStyle(current)

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener("mousedown", onOutside)
    return () => document.removeEventListener("mousedown", onOutside)
  }, [open])

  function select(next: string) {
    setOpen(false)
    if (next === current) return
    setCurrent(next)
    start(async () => {
      await updateGestionEstado(gestionId, next, { busquedaId, candidatoId })
    })
  }

  return (
    <div ref={ref} className="relative inline-block" style={{ opacity: isPending ? 0.55 : 1, transition: "opacity 0.15s" }}>

      {/* Trigger — badge pill */}
      <button
        type="button"
        onClick={() => !isPending && setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-md text-[10.5px] font-semibold whitespace-nowrap"
        style={{
          background: badge.bg,
          color:      badge.color,
          padding:    "3px 6px 3px 8px",
          border:     "none",
          cursor:     isPending ? "default" : "pointer",
          textDecoration: current === "descartado" ? "line-through" : "none",
        }}
      >
        {stageStyle(current).label}
        <ChevronDown style={{ width: 10, height: 10, opacity: 0.65, flexShrink: 0 }} />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 z-50 rounded-xl overflow-hidden"
          style={{
            top:       "calc(100% + 4px)",
            minWidth:  "11rem",
            background: "#ffffff",
            border:    "1px solid var(--gl-border)",
            boxShadow: "0 8px 24px -4px rgba(13,17,23,0.12), 0 2px 8px -2px rgba(13,17,23,0.06)",
          }}
        >
          {/* Pipeline stages */}
          <div className="p-1.5 space-y-0.5">
            {PIPELINE.map((s) => (
              <DropdownItem
                key={s.key}
                stage={s}
                active={current === s.key}
                onSelect={select}
              />
            ))}
          </div>

          {/* Separator + Descartado */}
          <div style={{ height: 1, background: "var(--gl-border)", margin: "0 8px" }} />
          <div className="p-1.5">
            <DropdownItem stage={DESCARTADO} active={current === "descartado"} onSelect={select} />
          </div>
        </div>
      )}
    </div>
  )
}

function DropdownItem({
  stage,
  active,
  onSelect,
}: {
  stage: { key: string; label: string; bg: string; color: string }
  active: boolean
  onSelect: (key: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(stage.key)}
      className="w-full flex items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-left"
      style={{
        background: active ? stage.bg : "transparent",
        transition: "background 0.1s",
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--gl-bg)" }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"   }}
    >
      <span className="flex items-center gap-2">
        <span
          className="inline-block rounded-full shrink-0"
          style={{ width: 8, height: 8, background: stage.color }}
        />
        <span
          className="text-[12px] font-medium"
          style={{
            color:          active ? stage.color : "var(--gl-ink-2)",
            textDecoration: stage.key === "descartado" ? "line-through" : "none",
          }}
        >
          {stage.label}
        </span>
      </span>
      {active && (
        <Check style={{ width: 12, height: 12, color: stage.color, flexShrink: 0 }} />
      )}
    </button>
  )
}
