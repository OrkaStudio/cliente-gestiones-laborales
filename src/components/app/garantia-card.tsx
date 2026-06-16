"use client"

import { useState } from "react"
import Link from "next/link"
import { Users, MapPin, Shield, AlertTriangle } from "lucide-react"
import { GarantiaDialog } from "@/components/app/garantia-dialog"


type Pal = { bg: string; color: string }

export function GarantiaCard({
  busqueda,
  pal,
  count,
  restantes,
  vencida,
}: {
  busqueda: {
    id: string
    puesto: string
    cliente: string
    ubicacion: string | null
    rango_salarial: string | null
    notas_cierre: string | null
  }
  pal: Pal
  count: number
  restantes: number | null
  vencida: boolean
}) {
  const [dialogOpen, setDialogOpen] = useState(false)

  const countdownBg    = vencida ? "#ffebe9" : "#dafbe1"
  const countdownColor = vencida ? "#cf222e" : "#1a7f37"
  const CountdownIcon  = vencida ? AlertTriangle : Shield

  return (
    <>
      <div
        className="gl-card flex flex-col p-5"
        style={{
          position: "relative",
          border: vencida ? "1.5px solid #f1aeb5" : "1px solid var(--gl-border)",
          background: "#ffffff",
          borderRadius: "0.875rem",
          boxShadow: vencida ? "0 0 0 3px #ffebe920" : "0 2px 8px rgba(13,17,23,0.05)",
        }}
      >
        {/* Cover link — hace toda la card clickeable */}
        <Link
          href={`/busquedas/${busqueda.id}`}
          style={{ position: "absolute", inset: 0, zIndex: 1, borderRadius: "0.875rem" }}
          aria-label={`Ver búsqueda ${busqueda.puesto}`}
        />

        {/* Top */}
        <div className="flex items-start gap-3.5 mb-4">
          <div
            className="h-11 w-11 rounded-xl grid place-items-center text-sm font-bold shrink-0"
            style={{ background: pal.bg, color: pal.color }}
          >
            {(busqueda.cliente?.trim() || busqueda.puesto)[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div
              className="text-[14px] font-bold leading-tight"
              style={{ color: "var(--gl-ink)" }}
            >
              {busqueda.cliente?.trim() || busqueda.puesto}
            </div>
            {busqueda.cliente?.trim() && (
              <div className="text-[12.5px] mt-0.5 truncate" style={{ color: "var(--gl-ink-3)" }}>
                {busqueda.puesto}
              </div>
            )}
            {busqueda.ubicacion && (
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3 shrink-0" style={{ color: "var(--gl-ink-3)" }} />
                <span className="text-[11.5px] truncate" style={{ color: "var(--gl-ink-3)" }}>
                  {busqueda.ubicacion}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Countdown badge */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg mb-4"
          style={{ background: countdownBg }}
        >
          <CountdownIcon style={{ width: 13, height: 13, color: countdownColor, flexShrink: 0 }} />
          <span className="text-[11.5px] font-semibold" style={{ color: countdownColor }}>
            {vencida
              ? "Garantía vencida — requiere resolución"
              : restantes !== null
                ? `${restantes} día${restantes !== 1 ? "s" : ""} de garantía restantes`
                : "En período de garantía"}
          </span>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between gap-2 pt-3 mt-auto"
          style={{ borderTop: "1px solid var(--gl-border)" }}
        >
          <div
            className="flex items-center gap-1.5 text-[12px]"
            style={{ color: count > 0 ? "var(--gl-olive)" : "var(--gl-ink-3)" }}
          >
            <Users className="h-3 w-3 shrink-0" />
            <span>{count === 0 ? "Sin candidatos" : `${count} candidato${count !== 1 ? "s" : ""}`}</span>
          </div>

          <button
            onClick={() => setDialogOpen(true)}
            style={{
              position:     "relative",
              zIndex:       2,
              fontSize:     "12px",
              fontWeight:   600,
              padding:      "0.375rem 0.75rem",
              borderRadius: "0.5rem",
              border:       vencida ? "1.5px solid #cf222e" : "1px solid var(--gl-border)",
              color:        vencida ? "#cf222e" : "var(--gl-ink-3)",
              background:   vencida ? "#ffebe9" : "transparent",
              cursor:       "pointer",
              transition:   "all 0.15s",
              whiteSpace:   "nowrap",
            }}
          >
            Resolver garantía
          </button>
        </div>
      </div>

      <GarantiaDialog
        busquedaId={busqueda.id}
        puesto={busqueda.puesto}
        cliente={busqueda.cliente}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </>
  )
}
