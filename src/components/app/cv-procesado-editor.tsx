"use client"

import { useState, useTransition } from "react"
import { Pencil, Check, X, Download, FileText } from "lucide-react"
import { updateCVProcesado } from "@/lib/actions/candidatos"
import { parseSections, assembleSections, type CvSection } from "@/lib/cv/utils"

function autoResize(el: HTMLTextAreaElement) {
  el.style.height = "auto"
  el.style.height = `${el.scrollHeight}px`
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Props {
  candidatoId: string
  nombre:      string
  apellido:    string
  initialTexto: string | null
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function CVProcesadoEditor({ candidatoId, nombre, apellido, initialTexto }: Props) {
  const [sections,   setSections]   = useState<CvSection[]>(() => parseSections(initialTexto ?? ""))
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [draft,      setDraft]      = useState("")
  const [savedIdx,   setSavedIdx]   = useState<number | null>(null)
  const [isPending,  start]         = useTransition()

  const hasCv     = sections.length > 0
  const isEditing = editingIdx !== null

  function startEdit(idx: number) {
    setEditingIdx(idx)
    setDraft(sections[idx].content)
  }

  function cancelEdit() {
    setEditingIdx(null)
    setDraft("")
  }

  function saveSection(idx: number) {
    const updated  = sections.map((s, i) => i === idx ? { ...s, content: draft } : s)
    const fullText = assembleSections(updated)
    start(async () => {
      await updateCVProcesado(candidatoId, fullText)
      setSections(updated)
      setEditingIdx(null)
      setDraft("")
      setSavedIdx(idx)
      setTimeout(() => setSavedIdx(null), 2200)
    })
  }

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (!hasCv) {
    return (
      <div
        className="rounded-2xl border flex flex-col items-center justify-center py-20 gap-4 text-center"
        style={{ background: "#fff", borderColor: "var(--gl-border)" }}
      >
        <div className="h-14 w-14 rounded-2xl grid place-items-center" style={{ background: "var(--gl-olive-bg)" }}>
          <FileText className="h-6 w-6" style={{ color: "var(--gl-olive)" }} />
        </div>
        <div>
          <p className="text-sm font-semibold mb-1" style={{ color: "var(--gl-ink)" }}>Sin CV procesado</p>
          <p className="text-xs leading-relaxed max-w-xs" style={{ color: "var(--gl-ink-3)" }}>
            Se genera automáticamente al recibir el CV por Gmail.
          </p>
        </div>
      </div>
    )
  }

  // ── Documento ───────────────────────────────────────────────────────────────
  return (
    <div>

      {/* ── Toolbar flotante encima del documento ─────────────────────────── */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px]" style={{ color: "var(--gl-ink-3)" }}>
          {isEditing
            ? "Editando una sección — guardá los cambios antes de continuar"
            : "Hacé hover sobre una sección para editarla"}
        </span>
        <a
          href={`/api/cv/${candidatoId}/pdf`}
          download
          className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-semibold
                     transition-all hover:opacity-90"
          style={{ background: "var(--gl-olive)", color: "#fff", boxShadow: "0 2px 8px rgba(42,74,24,0.25)" }}
        >
          <Download className="h-4 w-4" />
          Descargar PDF
        </a>
      </div>

      {/* ── Documento — replica visual del PDF ────────────────────────────── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "#fff",
          boxShadow:  "0 4px 32px rgba(13,17,23,0.10), 0 1px 4px rgba(13,17,23,0.06)",
          border:     "1px solid var(--gl-border)",
        }}
      >

        {/* Header oliva — idéntico al PDF ──────────────────────────────── */}
        <div
          className="flex items-start justify-between px-10 py-7"
          style={{ background: "var(--gl-olive)" }}
        >
          <div>
            <div
              className="font-bold tracking-[0.12em] uppercase"
              style={{ color: "#fff", fontSize: 15 }}
            >
              Gestiones Laborales
            </div>
            <div
              className="mt-1.5 uppercase tracking-[0.18em]"
              style={{ color: "rgba(255,255,255,0.55)", fontSize: 7.5 }}
            >
              Consultora RRHH Agropecuario
            </div>
          </div>
          <div className="text-right">
            <div
              className="uppercase tracking-[0.2em]"
              style={{ color: "rgba(255,255,255,0.55)", fontSize: 7.5, marginBottom: 4 }}
            >
              Currículum Vitae
            </div>
            <div
              className="font-bold"
              style={{ color: "#fff", fontSize: 15 }}
            >
              {nombre} {apellido}
            </div>
          </div>
        </div>

        {/* Barra acento */}
        <div style={{ height: 3, background: "var(--gl-olive-light)", opacity: 0.35 }} />

        {/* Secciones ───────────────────────────────────────────────────── */}
        <div style={{ background: "#fff" }}>
          {sections.map((sec, idx) => {
            const active    = editingIdx === idx
            const wasSaved  = savedIdx === idx

            return (
              <div
                key={idx}
                className="group relative"
                style={{
                  borderBottom: idx < sections.length - 1 ? "1px solid var(--gl-border)" : "none",
                  padding:      "24px 40px",
                  background:   active ? "#fafffe" : "#fff",
                  transition:   "background 0.15s",
                }}
              >
                {/* Cabecera de sección */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="font-bold uppercase tracking-[0.2em]"
                      style={{
                        color:    active ? "var(--gl-amber)" : "var(--gl-olive)",
                        fontSize: 9,
                      }}
                    >
                      {sec.title}
                    </span>
                    {wasSaved && (
                      <span
                        className="flex items-center gap-1 font-semibold"
                        style={{ color: "var(--gl-green)", fontSize: 10 }}
                      >
                        <Check className="h-3 w-3" /> Guardado
                      </span>
                    )}
                  </div>

                  {/* Controles */}
                  {active ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={cancelEdit}
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px]
                                   font-medium transition-colors disabled:opacity-50"
                        style={{ background: "var(--gl-gray-bg)", color: "var(--gl-gray)" }}
                      >
                        <X className="h-3 w-3" />
                        Cancelar
                      </button>
                      <button
                        onClick={() => saveSection(idx)}
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px]
                                   font-semibold transition-colors disabled:opacity-50"
                        style={{ background: "var(--gl-olive)", color: "#fff" }}
                      >
                        <Check className="h-3 w-3" />
                        {isPending ? "Guardando…" : "Guardar"}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEdit(idx)}
                      disabled={isEditing}
                      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px]
                                 font-medium transition-all disabled:opacity-20
                                 opacity-0 group-hover:opacity-100"
                      style={{ background: "var(--gl-olive-bg)", color: "var(--gl-olive)" }}
                    >
                      <Pencil className="h-3 w-3" />
                      Editar
                    </button>
                  )}
                </div>

                {/* Línea divisora fina */}
                <div
                  style={{
                    height:        1,
                    background:    active ? "var(--gl-olive)" : "var(--gl-border)",
                    opacity:       active ? 0.4 : 1,
                    marginBottom:  12,
                    transition:    "background 0.15s",
                  }}
                />

                {/* Contenido */}
                {active ? (
                  <textarea
                    value={draft}
                    autoFocus
                    onChange={(e) => { setDraft(e.target.value); autoResize(e.target) }}
                    onFocus={(e) => autoResize(e.target)}
                    className="w-full resize-none focus:outline-none rounded-xl px-4 py-3"
                    style={{
                      fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
                      fontSize:   12.5,
                      lineHeight: 1.75,
                      color:      "var(--gl-ink)",
                      background: "#f6f8fa",
                      border:     "1.5px solid var(--gl-olive)",
                      minHeight:  72,
                      overflow:   "hidden",
                    }}
                  />
                ) : (
                  <pre
                    className="whitespace-pre-wrap"
                    style={{
                      fontFamily: "inherit",
                      fontSize:   13.5,
                      lineHeight: 1.85,
                      color:      "var(--gl-ink-2)",
                      margin:     0,
                    }}
                  >
                    {sec.content}
                  </pre>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer del documento — idéntico al PDF */}
        <div
          className="flex items-center justify-between px-10 py-3.5"
          style={{ borderTop: "1px solid var(--gl-border)" }}
        >
          <div className="flex items-center gap-2">
            <span
              className="font-bold uppercase tracking-[0.1em]"
              style={{ color: "var(--gl-olive)", fontSize: 7.5 }}
            >
              Gestiones Laborales
            </span>
            <span style={{ color: "var(--gl-border)", fontSize: 9 }}>·</span>
            <span style={{ color: "var(--gl-ink-3)", fontSize: 7.5 }}>
              Documento confidencial
            </span>
          </div>
          <span style={{ color: "var(--gl-ink-3)", fontSize: 7.5 }}>
            {new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })}
          </span>
        </div>

      </div>
    </div>
  )
}
