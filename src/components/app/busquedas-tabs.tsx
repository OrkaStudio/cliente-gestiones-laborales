"use client"

import { useState } from "react"
import { Shield, Archive, List } from "lucide-react"

const OLIVE = "#2a4a18"
const OLIVE_BG = "#eef5e8"
const INK3 = "#8b949e"
const BORDER = "#eaecef"

type Tab = "activas" | "garantia" | "archivadas"

export function BusquedasTabs({
  garantiasVencidas,
  garantiaCount,
  archivadaCount,
  activasPanel,
  garantiaPanel,
  archivadaPanel,
}: {
  garantiasVencidas: number
  garantiaCount: number
  archivadaCount: number
  activasPanel: React.ReactNode
  garantiaPanel: React.ReactNode
  archivadaPanel: React.ReactNode
}) {
  const [tab, setTab] = useState<Tab>("activas")

  const tabs: { key: Tab; label: string; icon: typeof List; count?: number; urgent?: boolean }[] = [
    { key: "activas",    label: "Activas",    icon: List },
    { key: "garantia",   label: "Garantía",   icon: Shield,  count: garantiaCount,  urgent: garantiasVencidas > 0 },
    { key: "archivadas", label: "Archivadas", icon: Archive, count: archivadaCount },
  ]

  return (
    <div>
      {/* Tab bar */}
      <div
        className="flex items-center gap-1 mb-6"
        style={{ borderBottom: `1px solid ${BORDER}` }}
      >
        {tabs.map((t) => {
          const Icon    = t.icon
          const active  = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                display:        "inline-flex",
                alignItems:     "center",
                gap:            "0.4rem",
                padding:        "0.625rem 0.875rem",
                fontSize:       "13px",
                fontWeight:     active ? 600 : 450,
                color:          active ? OLIVE : INK3,
                background:     "transparent",
                border:         "none",
                borderBottom:   active ? `2px solid ${OLIVE}` : "2px solid transparent",
                marginBottom:   "-1px",
                cursor:         "pointer",
                transition:     "color 0.15s",
                whiteSpace:     "nowrap",
              }}
            >
              <Icon style={{ width: 13, height: 13 }} />
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span
                  style={{
                    fontSize:     "10.5px",
                    fontWeight:   700,
                    padding:      "1px 6px",
                    borderRadius: "99px",
                    background:   t.urgent ? "#ffebe9" : (active ? OLIVE_BG : "#f6f8fa"),
                    color:        t.urgent ? "#cf222e" : (active ? OLIVE : INK3),
                    minWidth:     "18px",
                    textAlign:    "center",
                  }}
                >
                  {t.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Panel */}
      {tab === "activas"    && activasPanel}
      {tab === "garantia"   && garantiaPanel}
      {tab === "archivadas" && archivadaPanel}
    </div>
  )
}
