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
        display:      "inline-flex",
        alignItems:   "center",
        gap:          "0.3rem",
        padding:      "2px 10px",
        fontSize:     "11px",
        fontWeight:   600,
        color:        isActivo ? "#1a7f37" : "#57606a",
        background:   isActivo ? "#dafbe1" : "#f6f8fa",
        border:       "none",
        borderRadius: "9999px",
        cursor:       isPending ? "wait" : "pointer",
        whiteSpace:   "nowrap",
        transition:   "all 0.15s",
        opacity:      isPending ? 0.5 : 1,
      }}
    >
      <span
        style={{
          width:        6,
          height:       6,
          borderRadius: "50%",
          background:   isActivo ? "#1a7f37" : "#8b949e",
          flexShrink:   0,
        }}
      />
      {isActivo ? "Activo" : "Inactivo"}
    </button>
  )
}
