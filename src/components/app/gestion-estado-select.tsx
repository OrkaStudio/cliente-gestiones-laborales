"use client"

import { useTransition, useState } from "react"
import { ChevronDown } from "lucide-react"
import { updateGestionEstado } from "@/lib/actions/gestiones"

const STAGES = [
  { key: "preseleccionado",    label: "Preseleccionado"  },
  { key: "entrevista_orka",    label: "Entrevista Orka"  },
  { key: "presentado_cliente", label: "Presentado"        },
  { key: "entrevista_cliente", label: "2ª Entrevista"     },
  { key: "ofertado",           label: "Ofertado"          },
  { key: "contratado",         label: "Contratado"        },
  { key: "descartado",         label: "Descartado"        },
]

function badgeStyle(estado: string): { bg: string; color: string } {
  if (estado === "contratado") return { bg: "#dafbe1",          color: "#1a7f37"         }
  if (estado === "descartado") return { bg: "var(--gl-gray-bg)", color: "var(--gl-gray)"  }
  return                               { bg: "var(--gl-olive-bg)", color: "var(--gl-olive)" }
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
  const [isPending, startTransition] = useTransition()
  const [current, setCurrent] = useState(estado)
  const badge = badgeStyle(current)

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value
    setCurrent(next)
    startTransition(async () => {
      await updateGestionEstado(gestionId, next, { busquedaId, candidatoId })
    })
  }

  return (
    <div
      className="relative inline-flex items-center"
      style={{ opacity: isPending ? 0.5 : 1, transition: "opacity 0.15s" }}
    >
      <select
        value={current}
        onChange={handleChange}
        disabled={isPending}
        className="appearance-none cursor-pointer text-[10.5px] font-semibold rounded-md"
        style={{
          background:  badge.bg,
          color:       badge.color,
          border:      "none",
          outline:     "none",
          padding:     "3px 22px 3px 8px",
          lineHeight:  "1.4",
          fontFamily:  "inherit",
          textDecoration: current === "descartado" ? "line-through" : "none",
        }}
      >
        {STAGES.map((s) => (
          <option key={s.key} value={s.key}>{s.label}</option>
        ))}
      </select>
      <ChevronDown
        className="absolute pointer-events-none"
        style={{
          right:   5,
          width:   10,
          height:  10,
          color:   badge.color,
          opacity: isPending ? 0.3 : 0.65,
        }}
      />
    </div>
  )
}
