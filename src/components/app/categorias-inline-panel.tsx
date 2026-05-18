"use client"

import { useState, useTransition } from "react"
import { CATEGORIAS_GL } from "@/lib/cv/categorias"
import { updateCandidatoFields } from "@/lib/actions/candidatos"

const OLIVE       = "#2a4a18"
const OLIVE_BG    = "#f0f4eb"
const BORDER      = "#eaecef"
const INK3        = "#8b949e"

export function CategoriasInlinePanel({
  candidatoId,
  initialCategorias,
}: {
  candidatoId:       string
  initialCategorias: string[]
}) {
  const [selected, setSelected]   = useState<Set<string>>(new Set(initialCategorias))
  const [saved, setSaved]         = useState<Set<string>>(new Set(initialCategorias))
  const [pending, startTransition] = useTransition()
  const [error, setError]         = useState<string | null>(null)

  const dirty = [...selected].some(c => !saved.has(c)) || [...saved].some(c => !selected.has(c))

  function toggle(cat: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
    setError(null)
  }

  function guardar() {
    startTransition(async () => {
      const result = await updateCandidatoFields(candidatoId, { categorias: [...selected] })
      if (result.success) {
        setSaved(new Set(selected))
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <div style={{
      background:   "#fff",
      border:       `1px solid ${BORDER}`,
      borderRadius: 12,
      padding:      "16px 20px",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: OLIVE }}>
            Categorías a aplicar
          </div>
          {selected.size === 0 && (
            <div style={{ fontSize: 12, color: INK3, marginTop: 2 }}>
              Sin categorías asignadas
            </div>
          )}
        </div>

        {dirty && (
          <button
            onClick={guardar}
            disabled={pending}
            style={{
              padding:       "6px 14px",
              fontSize:      12,
              fontWeight:    600,
              color:         "#fff",
              background:    OLIVE,
              border:        "none",
              borderRadius:  8,
              cursor:        pending ? "default" : "pointer",
              opacity:       pending ? 0.7 : 1,
            }}
          >
            {pending ? "Guardando…" : "Guardar"}
          </button>
        )}
      </div>

      {/* Chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {CATEGORIAS_GL.map(cat => {
          const active = selected.has(cat)
          return (
            <button
              key={cat}
              onClick={() => toggle(cat)}
              style={{
                padding:      "4px 10px",
                fontSize:     12,
                fontWeight:   active ? 600 : 400,
                color:        active ? OLIVE : INK3,
                background:   active ? OLIVE_BG : "#f6f8f9",
                border:       `1.5px solid ${active ? OLIVE : BORDER}`,
                borderRadius: 20,
                cursor:       "pointer",
                transition:   "all 0.1s",
              }}
            >
              {cat}
            </button>
          )
        })}
      </div>

      {error && (
        <div style={{ marginTop: 8, fontSize: 12, color: "#c0392b" }}>{error}</div>
      )}
    </div>
  )
}
