"use client"

import { useState, useTransition } from "react"
import { toggleEstadoCandidato } from "@/lib/actions/candidatos"

export function CandidatoEstadoToggle({
  candidatoId,
  estadoInicial,
}: {
  candidatoId: string
  estadoInicial: "activo" | "inactivo"
}) {
  const [estado, setEstado] = useState(estadoInicial)
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    const nuevo = estado === "activo" ? "inactivo" : "activo"
    setEstado(nuevo)
    startTransition(async () => {
      const res = await toggleEstadoCandidato(candidatoId, nuevo)
      if (!res.success) setEstado(estado)
    })
  }

  const isActivo = estado === "activo"

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      style={{
        display:      "inline-flex",
        alignItems:   "center",
        gap:          "0.375rem",
        padding:      "0.5rem 1rem",
        fontSize:     "13.5px",
        fontWeight:   600,
        color:        isActivo ? "#1a7f37" : "var(--gl-ink-3)",
        background:   isActivo ? "#dafbe1" : "#f6f8fa",
        border:       `1px solid ${isActivo ? "rgba(26,127,55,0.25)" : "var(--gl-border)"}`,
        borderRadius: "0.75rem",
        cursor:       isPending ? "wait" : "pointer",
        whiteSpace:   "nowrap",
        transition:   "all 0.15s",
        opacity:      isPending ? 0.6 : 1,
      }}
    >
      <span
        style={{
          width:        7,
          height:       7,
          borderRadius: "50%",
          background:   isActivo ? "#1a7f37" : "#8b949e",
          flexShrink:   0,
        }}
      />
      {isActivo ? "Activo" : "Inactivo"}
    </button>
  )
}
