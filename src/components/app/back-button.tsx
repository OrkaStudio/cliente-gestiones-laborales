"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

export function BackButton() {
  const router = useRouter()
  return (
    <button
      onClick={() => router.back()}
      className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
      style={{ color: "var(--gl-ink-3)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--gl-ink)")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--gl-ink-3)")}
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Volver
    </button>
  )
}
