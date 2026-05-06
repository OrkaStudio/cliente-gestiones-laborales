"use client"

import { useState, useTransition } from "react"
import { Pencil, Check, X, Download, FileText } from "lucide-react"
import { updateCVProcesado } from "@/lib/actions/candidatos"
import { parseSections, assembleSections, type CvSection } from "@/lib/cv/utils"

// ─── helpers ──────────────────────────────────────────────────────────────────

function autoResize(el: HTMLTextAreaElement) {
  el.style.height = "auto"
  el.style.height = `${el.scrollHeight}px`
}

// ─── component ────────────────────────────────────────────────────────────────

export function CVProcesadoEditor({
  candidatoId,
  initialTexto,
}: {
  candidatoId: string
  initialTexto: string | null
}) {
  const [sections,   setSections]   = useState<CvSection[]>(() => parseSections(initialTexto ?? ""))
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [draft,      setDraft]      = useState("")
  const [savedIdx,   setSavedIdx]   = useState<number | null>(null)
  const [isPending,  start]         = useTransition()

  const hasCv      = sections.length > 0
  const isEditing  = editingIdx !== null

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
      setTimeout(() => setSavedIdx(null), 2000)
    })
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background:  "#ffffff",
        border:      "1px solid var(--gl-border)",
        boxShadow:   "0 2px 12px rgba(13,17,23,0.06)",
      }}
    >

      {/* ── Barra superior ──────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between gap-4 px-6 py-4"
        style={{
          background:   "var(--gl-olive)",
          borderBottom: "none",
        }}
      >
        {/* Marca */}
        <div className="flex items-center gap-3">
          <div
            className="h-7 w-7 rounded-lg grid place-items-center shrink-0"
            style={{ background: "rgba(255,255,255,0.15)" }}
          >
            <FileText className="h-3.5 w-3.5" style={{ color: "#fff" }} />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-[0.18em] uppercase" style={{ color: "#fff" }}>
              CV Procesado GL
            </div>
            <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.6)" }}>
              {hasCv ? `${sections.length} secciones · Generado por IA` : "Sin CV procesado"}
            </div>
          </div>
        </div>

        {/* Acción principal */}
        {hasCv && (
          <a
            href={`/api/cv/${candidatoId}/pdf`}
            download
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[12px] font-semibold
                       transition-all hover:opacity-90 shrink-0"
            style={{
              background: "#fff",
              color:      "var(--gl-olive)",
            }}
          >
            <Download className="h-3.5 w-3.5" />
            Descargar PDF
          </a>
        )}
      </div>

      {/* ── Cuerpo: secciones ───────────────────────────────────────── */}
      {hasCv ? (
        <div>
          {sections.map((sec, idx) => {
            const isThisEditing = editingIdx === idx
            const wasSaved      = savedIdx === idx

            return (
              <div
                key={idx}
                className="group"
                style={{ borderTop: idx === 0 ? "none" : "1px solid var(--gl-border)" }}
              >
                {/* Cabecera de sección */}
                <div
                  className="flex items-center justify-between px-6 pt-5 pb-3"
                >
                  <div className="flex items-center gap-2.5">
                    {/* Dot indicador */}
                    <div
                      className="h-1.5 w-1.5 rounded-full shrink-0"
                      style={{ background: isThisEditing ? "var(--gl-amber)" : "var(--gl-olive)" }}
                    />
                    <span
                      className="text-[9.5px] font-bold uppercase tracking-[0.22em]"
                      style={{ color: isThisEditing ? "var(--gl-amber)" : "var(--gl-olive)" }}
                    >
                      {sec.title}
                    </span>
                    {wasSaved && (
                      <span
                        className="flex items-center gap-1 text-[10px] font-semibold"
                        style={{ color: "var(--gl-green)" }}
                      >
                        <Check className="h-3 w-3" />
                        Guardado
                      </span>
                    )}
                  </div>

                  {/* Controles */}
                  <div className="flex items-center gap-1.5">
                    {isThisEditing ? (
                      <>
                        <button
                          onClick={cancelEdit}
                          disabled={isPending}
                          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px]
                                     font-medium transition-colors disabled:opacity-50"
                          style={{ background: "var(--gl-gray-bg)", color: "var(--gl-gray)" }}
                        >
                          <X className="h-3 w-3" />
                          Cancelar
                        </button>
                        <button
                          onClick={() => saveSection(idx)}
                          disabled={isPending}
                          className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-[11px]
                                     font-semibold transition-colors disabled:opacity-50"
                          style={{ background: "var(--gl-olive)", color: "#fff" }}
                        >
                          <Check className="h-3 w-3" />
                          {isPending ? "Guardando…" : "Guardar"}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => startEdit(idx)}
                        disabled={isEditing}
                        className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px]
                                   font-medium transition-all disabled:opacity-30
                                   opacity-0 group-hover:opacity-100"
                        style={{ background: "var(--gl-gray-bg)", color: "var(--gl-ink-2)" }}
                      >
                        <Pencil className="h-3 w-3" />
                        Editar
                      </button>
                    )}
                  </div>
                </div>

                {/* Divider */}
                <div className="mx-6" style={{ height: 1, background: "var(--gl-border)" }} />

                {/* Contenido */}
                <div className="px-6 pb-5 pt-4">
                  {isThisEditing ? (
                    <textarea
                      value={draft}
                      autoFocus
                      onChange={(e) => {
                        setDraft(e.target.value)
                        autoResize(e.target)
                      }}
                      onFocus={(e) => autoResize(e.target)}
                      className="w-full resize-none focus:outline-none rounded-xl px-4 py-3"
                      style={{
                        fontFamily:  "var(--font-geist-mono), ui-monospace, monospace",
                        fontSize:    12.5,
                        lineHeight:  1.75,
                        color:       "var(--gl-ink)",
                        background:  "#f6f8fa",
                        border:      "1.5px solid var(--gl-olive)",
                        minHeight:   80,
                        overflow:    "hidden",
                      }}
                    />
                  ) : (
                    <pre
                      className="whitespace-pre-wrap"
                      style={{
                        fontFamily: "inherit",
                        fontSize:   13.5,
                        lineHeight: 1.8,
                        color:      "var(--gl-ink-2)",
                        margin:     0,
                      }}
                    >
                      {sec.content}
                    </pre>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (

        /* Empty state */
        <div className="flex flex-col items-center justify-center py-20 px-6 gap-4 text-center">
          <div
            className="h-14 w-14 rounded-2xl grid place-items-center"
            style={{ background: "var(--gl-olive-bg)" }}
          >
            <FileText className="h-6 w-6" style={{ color: "var(--gl-olive)" }} />
          </div>
          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: "var(--gl-ink)" }}>
              Sin CV procesado
            </p>
            <p className="text-xs leading-relaxed max-w-xs" style={{ color: "var(--gl-ink-3)" }}>
              Se genera automáticamente cuando llega un CV por Gmail.
              También podés cargarlo manualmente.
            </p>
          </div>
        </div>

      )}
    </div>
  )
}
