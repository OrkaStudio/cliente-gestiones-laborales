"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { FileText } from "lucide-react"

interface Props {
  nombre:       string
  apellido:     string
  avatarBg:     string
  avatarColor:  string
  ultimoPuesto: string | null
  candidatoId:  string
  hasCv:        boolean
}

export function CandidatoStickyBar({
  nombre, apellido, avatarBg, avatarColor, ultimoPuesto, candidatoId, hasCv,
}: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = document.getElementById("profile-header")
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      className="lg:left-[248px]"
      style={{
        position:     "fixed",
        top:          0,
        left:         0,
        right:        0,
        zIndex:       30,
        background:   "#fff",
        borderBottom: "1px solid var(--gl-border)",
        boxShadow:    "0 2px 12px rgba(13,17,23,0.07)",
        transform:    visible ? "translateY(0)" : "translateY(-100%)",
        transition:   "transform 0.2s ease",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <div className="flex items-center justify-between gap-4 px-10 py-3">
        <div className="flex items-center gap-3">
          <div
            className="h-8 w-8 rounded-full grid place-items-center text-[11px] font-bold shrink-0"
            style={{ background: avatarBg, color: avatarColor }}
          >
            {(nombre ?? "?")[0]}{(apellido ?? "?")[0]}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] font-bold" style={{ color: "var(--gl-ink)" }}>
              {nombre} {apellido}
            </span>
            {ultimoPuesto && (
              <>
                <span style={{ color: "var(--gl-border)" }}>·</span>
                <span className="text-sm" style={{ color: "var(--gl-ink-3)" }}>
                  {ultimoPuesto}
                </span>
              </>
            )}
          </div>
        </div>
        <Link
          href={`/candidatos/${candidatoId}/cv`}
          style={{
            display:        "inline-flex",
            alignItems:     "center",
            gap:            "0.375rem",
            padding:        "0.375rem 0.875rem",
            fontSize:       "12.5px",
            fontWeight:     600,
            color:          hasCv ? "var(--gl-olive)" : "var(--gl-ink-3)",
            background:     hasCv ? "var(--gl-olive-bg)" : "transparent",
            border:         hasCv ? "1px solid rgba(42,74,24,0.2)" : "1px solid var(--gl-border-md)",
            borderRadius:   "0.625rem",
            textDecoration: "none",
          }}
        >
          <FileText style={{ width: 13, height: 13 }} />
          Ver CV
        </Link>
      </div>
    </div>
  )
}
