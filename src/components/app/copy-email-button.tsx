"use client"

import { useState } from "react"
import { Mail, Check } from "lucide-react"

export function CopyEmailButton({ email }: { email: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(email).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-3 px-3 py-3 rounded-xl w-full text-left"
      style={{
        background:  "var(--gl-surface)",
        border:      "1px solid var(--gl-border)",
        cursor:      "pointer",
        transition:  "background 0.15s, border-color 0.15s",
      }}
      onMouseEnter={(e) => {
        if (!copied) e.currentTarget.style.borderColor = "var(--gl-border-md)"
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--gl-border)"
      }}
    >
      <div
        className="h-8 w-8 rounded-lg grid place-items-center shrink-0 transition-colors"
        style={{ background: copied ? "#dafbe1" : "#ddf4ff" }}
      >
        {copied
          ? <Check className="h-3.5 w-3.5" style={{ color: "#1a7f37" }} />
          : <Mail className="h-3.5 w-3.5" style={{ color: "#0550ae" }} />
        }
      </div>
      <div className="min-w-0">
        <div
          className="text-[10.5px] font-semibold uppercase tracking-wide transition-colors"
          style={{ color: copied ? "var(--gl-green)" : "var(--gl-ink-3)" }}
        >
          {copied ? "Copiado" : "Email"}
        </div>
        <div className="text-sm truncate mt-0.5" style={{ color: "var(--gl-ink)" }}>
          {email}
        </div>
      </div>
    </button>
  )
}
