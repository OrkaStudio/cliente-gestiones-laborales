"use client"

import { useState, useTransition } from "react"
import { Pencil, X, Download, Check, FileText } from "lucide-react"
import { updateCVProcesado } from "@/lib/actions/candidatos"
import { parseSections } from "@/lib/cv/utils"

const CARD = {
  background:  "#ffffff",
  borderColor: "var(--gl-border)",
  boxShadow:   "0 2px 8px rgba(13,17,23,0.05)",
} as const

export function CVProcesadoEditor({
  candidatoId,
  initialTexto,
}: {
  candidatoId: string
  initialTexto: string | null
}) {
  const [texto,     setTexto]     = useState(initialTexto ?? "")
  const [draft,     setDraft]     = useState(initialTexto ?? "")
  const [editing,   setEditing]   = useState(false)
  const [isPending, start]        = useTransition()
  const [saved,     setSaved]     = useState(false)

  const hasCv    = texto.trim().length > 0
  const sections = parseSections(texto)

  function startEdit() {
    setDraft(texto)
    setEditing(true)
  }

  function cancelEdit() {
    setDraft(texto)
    setEditing(false)
  }

  function handleSave() {
    start(async () => {
      await updateCVProcesado(candidatoId, draft)
      setTexto(draft)
      setEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    })
  }

  return (
    <div className="rounded-2xl border overflow-hidden" style={CARD}>

      {/* ── Barra superior ─────────────────────────────── */}
      <div
        className="flex items-center justify-between gap-4 px-6 py-3.5"
        style={{ borderBottom: "1px solid var(--gl-border)", background: "var(--gl-surface)" }}
      >
        {/* Izquierda: título */}
        <div className="flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full shrink-0"
            style={{ background: "var(--gl-olive)" }}
          />
          <span
            className="text-[10px] font-bold uppercase tracking-[0.2em]"
            style={{ color: "var(--gl-olive)" }}
          >
            CV Procesado GL
          </span>
          {saved && (
            <span
              className="flex items-center gap-1 text-[10px] font-medium"
              style={{ color: "var(--gl-green)" }}
            >
              <Check className="h-3 w-3" />
              Guardado
            </span>
          )}
        </div>

        {/* Derecha: acciones */}
        <div className="flex items-center gap-2">
          {hasCv && (
            <a
              href={`/api/cv/${candidatoId}/pdf`}
              download
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold
                         transition-colors"
              style={{
                background:  "var(--gl-olive-bg)",
                color:       "var(--gl-olive)",
                border:      "1px solid transparent",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.border = "1px solid var(--gl-olive)" }}
              onMouseLeave={(e) => { e.currentTarget.style.border = "1px solid transparent" }}
            >
              <Download className="h-3 w-3" />
              Descargar PDF
            </a>
          )}

          {editing ? (
            <>
              <button
                onClick={cancelEdit}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold
                           transition-colors disabled:opacity-40"
                style={{ background: "var(--gl-gray-bg)", color: "var(--gl-gray)" }}
              >
                <X className="h-3 w-3" />
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold
                           transition-colors disabled:opacity-40"
                style={{ background: "var(--gl-olive)", color: "#ffffff" }}
              >
                {isPending ? "Guardando…" : "Guardar"}
              </button>
            </>
          ) : (
            <button
              onClick={startEdit}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold
                         transition-colors"
              style={{ background: "var(--gl-gray-bg)", color: "var(--gl-ink-2)" }}
            >
              <Pencil className="h-3 w-3" />
              {hasCv ? "Editar" : "Cargar"}
            </button>
          )}
        </div>
      </div>

      {/* ── Cuerpo ─────────────────────────────────────── */}
      {editing ? (

        /* Modo edición — textarea raw */
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={28}
          autoFocus
          placeholder="Pegá o escribí el CV procesado en el formato GL (secciones en MAYÚSCULAS seguidas de ─────)."
          className="w-full resize-y focus:outline-none px-8 py-6"
          style={{
            fontFamily:  "var(--font-geist-mono), ui-monospace, monospace",
            fontSize:    13,
            lineHeight:  1.7,
            color:       "var(--gl-ink-2)",
            background:  "#fafbfc",
            border:      "none",
            borderTop:   "none",
          }}
        />

      ) : hasCv ? (

        /* Modo vista — documento formateado */
        <div className="px-8 py-7 space-y-7">
          {sections.length > 0 ? sections.map((sec, i) => (
            <div key={i}>
              {/* Título de sección */}
              <div
                className="text-[9px] font-bold uppercase tracking-[0.22em] mb-2"
                style={{ color: "var(--gl-olive)" }}
              >
                {sec.title}
              </div>
              {/* Línea divisora */}
              <div
                className="mb-3"
                style={{ height: 1, background: "var(--gl-border)" }}
              />
              {/* Contenido */}
              <pre
                className="text-[13px] leading-relaxed whitespace-pre-wrap"
                style={{
                  fontFamily: "inherit",
                  color:      "var(--gl-ink-2)",
                  margin:     0,
                }}
              >
                {sec.content}
              </pre>
            </div>
          )) : (
            /* Fallback: no se parsearon secciones, mostrar texto plano */
            <pre
              className="text-[13px] leading-relaxed whitespace-pre-wrap"
              style={{ fontFamily: "inherit", color: "var(--gl-ink-2)", margin: 0 }}
            >
              {texto}
            </pre>
          )}
        </div>

      ) : (

        /* Sin CV todavía */
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div
            className="h-12 w-12 rounded-2xl grid place-items-center"
            style={{ background: "var(--gl-olive-bg)" }}
          >
            <FileText className="h-5 w-5" style={{ color: "var(--gl-olive)" }} />
          </div>
          <p className="text-sm font-medium" style={{ color: "var(--gl-ink)" }}>
            Sin CV procesado
          </p>
          <p className="text-xs max-w-xs" style={{ color: "var(--gl-ink-3)" }}>
            Se generará automáticamente cuando llegue el CV por Gmail.
            También podés cargarlo manualmente.
          </p>
        </div>

      )}
    </div>
  )
}
