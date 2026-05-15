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
      title={`Marcar como ${isActivo ? "inactivo" : "activo"}`}
      style={{
        display:     "inline-flex",
        alignItems:  "center",
        gap:         8,
        padding:     "0.45rem 0.875rem",
        border:      `1.5px solid ${isActivo ? "rgba(42,74,24,0.4)" : "#d0d7de"}`,
        borderRadius: "0.75rem",
        background:  "transparent",
        cursor:      isPending ? "wait" : "pointer",
        opacity:     isPending ? 0.6 : 1,
        transition:  "all 0.15s",
      }}
    >
      {/* Switch track */}
      <div
        style={{
          position:   "relative",
          width:      32,
          height:     18,
          borderRadius: 9,
          background: isActivo ? "#2a4a18" : "#d0d7de",
          flexShrink: 0,
          transition: "background 0.2s",
        }}
      >
        <div
          style={{
            position:     "absolute",
            top:          2,
            left:         isActivo ? 14 : 2,
            width:        14,
            height:       14,
            borderRadius: "50%",
            background:   "#fff",
            boxShadow:    "0 1px 3px rgba(0,0,0,0.2)",
            transition:   "left 0.2s",
          }}
        />
      </div>
      <span
        style={{
          fontSize:   13,
          fontWeight: 600,
          color:      isActivo ? "#2a4a18" : "#57606a",
          whiteSpace: "nowrap",
        }}
      >
        {isActivo ? "Activo" : "Inactivo"}
      </span>
    </button>
  )
}
