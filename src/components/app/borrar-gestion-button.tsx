"use client"

import { useTransition } from "react"
import { X } from "lucide-react"
import { eliminarGestion } from "@/lib/actions/gestiones"

export function BorrarGestionButton({
  gestionId,
  busquedaId,
  candidatoId,
  nombre,
}: {
  gestionId: string
  busquedaId: string
  candidatoId: string
  nombre: string
}) {
  const [isPending, start] = useTransition()

  function onClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const ok = window.confirm(
      `¿Quitar a ${nombre} de esta búsqueda?\n\nSe borra de la lista (no es lo mismo que "Descartado"). El candidato sigue en la base y podés volver a sumarlo.`
    )
    if (!ok) return
    start(async () => {
      await eliminarGestion(gestionId, { busquedaId, candidatoId })
    })
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      title="Quitar de la búsqueda"
      aria-label={`Quitar a ${nombre} de la búsqueda`}
      className="grid place-items-center rounded-md shrink-0 transition-colors"
      style={{
        width: 24,
        height: 24,
        background: "transparent",
        border: "1px solid var(--gl-border)",
        color: "var(--gl-ink-3)",
        opacity: isPending ? 0.4 : 0.55,
        cursor: isPending ? "default" : "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "#cf222e"
        e.currentTarget.style.borderColor = "#cf222e"
        e.currentTarget.style.opacity = "1"
        e.currentTarget.style.background = "var(--gl-red-bg)"
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "var(--gl-ink-3)"
        e.currentTarget.style.borderColor = "var(--gl-border)"
        e.currentTarget.style.opacity = "0.55"
        e.currentTarget.style.background = "transparent"
      }}
    >
      <X style={{ width: 13, height: 13 }} />
    </button>
  )
}
