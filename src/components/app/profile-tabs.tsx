"use client"

import { useState } from "react"
import { RespuestasPanel } from "./respuestas-panel"

interface Props {
  candidatoId:       string
  preguntas:         string[]
  initialRespuestas: { pregunta: string; respuesta: string }[] | null
  children:          React.ReactNode  // contenido del tab Perfil
}

const OLIVE    = "#2a4a18"
const OLIVE_BG = "#eef5e8"
const INK      = "#0d1117"
const INK3     = "#8b949e"
const BORDER   = "#eaecef"

const TABS = [
  { key: "perfil",     label: "Perfil" },
  { key: "respuestas", label: "Preguntas y Respuestas" },
] as const

type TabKey = typeof TABS[number]["key"]

export function ProfileTabs({ candidatoId, preguntas, initialRespuestas, children }: Props) {
  const [active, setActive] = useState<TabKey>("perfil")

  return (
    <div>
      {/* Tab nav */}
      <div
        style={{
          display:      "flex",
          gap:          0,
          borderBottom: `1px solid ${BORDER}`,
          marginBottom: "1.25rem",
        }}
      >
        {TABS.map((tab) => {
          const isActive = active === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActive(tab.key)}
              style={{
                padding:       "0.625rem 1.125rem",
                fontSize:      "13.5px",
                fontWeight:    isActive ? 700 : 500,
                color:         isActive ? OLIVE : INK3,
                background:    "transparent",
                border:        "none",
                borderBottom:  isActive ? `2px solid ${OLIVE}` : "2px solid transparent",
                cursor:        "pointer",
                transition:    "color 0.15s, border-color 0.15s",
                marginBottom:  -1,
                whiteSpace:    "nowrap",
              }}
            >
              {tab.label}
              {tab.key === "respuestas" && preguntas.length > 0 && (
                <span
                  style={{
                    marginLeft:   "0.375rem",
                    fontSize:     "10px",
                    fontWeight:   700,
                    padding:      "1px 5px",
                    borderRadius: "9999px",
                    background:   isActive ? OLIVE_BG : BORDER,
                    color:        isActive ? OLIVE : INK3,
                  }}
                >
                  {preguntas.length}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {active === "perfil" && children}

      {active === "respuestas" && (
        <RespuestasPanel
          candidatoId={candidatoId}
          preguntas={preguntas}
          initialRespuestas={initialRespuestas}
        />
      )}
    </div>
  )
}
