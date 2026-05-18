"use client"

import { useState, useTransition } from "react"
import { Pencil, Save, X, CheckCircle } from "lucide-react"
import { updateCandidatoFields } from "@/lib/actions/candidatos"

interface Props {
  candidatoId: string
  notas: string | null
}

const CARD = {
  background:  "#ffffff",
  borderColor: "var(--gl-border)",
  boxShadow:   "0 2px 8px rgba(13,17,23,0.05)",
} as const

export function NotasRecruiterInline({ candidatoId, notas: initial }: Props) {
  const [notas,     setNotas]     = useState(initial ?? "")
  const [editing,   setEditing]   = useState(false)
  const [draft,     setDraft]     = useState("")
  const [saveOk,    setSaveOk]    = useState(false)
  const [isPending, startTrans]   = useTransition()

  function openEdit() {
    setDraft(notas)
    setEditing(true)
  }

  function cancel() {
    setEditing(false)
    setDraft("")
  }

  function save() {
    const value = draft.trim() || null
    setNotas(draft.trim())
    setEditing(false)
    startTrans(async () => {
      await updateCandidatoFields(candidatoId, { notas_recruiter: value })
      setSaveOk(true)
      setTimeout(() => setSaveOk(false), 2000)
    })
  }

  return (
    <div className="rounded-2xl border p-6" style={CARD}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[15px] font-bold" style={{ color: "var(--gl-ink)" }}>
          Notas internas
        </h2>
        {!editing && (
          <button
            type="button"
            onClick={openEdit}
            className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-opacity hover:opacity-70"
            style={{ background: "var(--gl-surface)", border: "1px solid var(--gl-border)", color: "var(--gl-ink-3)" }}
          >
            <Pencil className="h-3 w-3" />
            Editar
          </button>
        )}
        {saveOk && (
          <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: "#1a7f37" }}>
            <CheckCircle className="h-3 w-3" />
            Guardado
          </span>
        )}
      </div>

      {editing ? (
        <div className="flex flex-col gap-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={5}
            autoFocus
            placeholder="Notas internas del recruiter..."
            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
            style={{
              background:  "var(--gl-surface)",
              border:      "1.5px solid var(--gl-olive)",
              color:       "var(--gl-ink)",
              fontFamily:  "inherit",
              lineHeight:  1.6,
              resize:      "vertical",
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") cancel()
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) save()
            }}
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={cancel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium"
              style={{ background: "var(--gl-surface)", border: "1px solid var(--gl-border)", color: "var(--gl-ink-3)" }}
            >
              <X className="h-3 w-3" />
              Cancelar
            </button>
            <button
              type="button"
              onClick={save}
              disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold"
              style={{
                background: "var(--gl-olive)",
                color:      "#fff",
                border:     "none",
                opacity:    isPending ? 0.7 : 1,
              }}
            >
              <Save className="h-3 w-3" />
              {isPending ? "Guardando…" : "Guardar"}
            </button>
          </div>
          <p className="text-[10.5px]" style={{ color: "var(--gl-ink-3)" }}>
            Ctrl+Enter para guardar · Escape para cancelar
          </p>
        </div>
      ) : notas ? (
        <p
          className="text-sm leading-relaxed pl-4 cursor-text"
          style={{ color: "var(--gl-ink-3)", borderLeft: "3px solid var(--gl-olive)" }}
          onClick={openEdit}
        >
          {notas}
        </p>
      ) : (
        <button
          type="button"
          onClick={openEdit}
          className="text-sm"
          style={{ color: "var(--gl-ink-3)", background: "none", border: "none", cursor: "text", padding: 0 }}
        >
          Sin notas — clic para agregar
        </button>
      )}
    </div>
  )
}
