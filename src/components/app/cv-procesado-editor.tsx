"use client"

import { useState, useRef, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Pencil, Check, X, Download, FileText, Save } from "lucide-react"
import { updateCVProcesado } from "@/lib/actions/candidatos"
import {
  parseSections, assembleSections,
  parseKV, parseJobs, parseBullets, parseRefs,
  type CvSection,
} from "@/lib/cv/utils"

function autoResize(el: HTMLTextAreaElement) {
  el.style.height = "auto"
  el.style.height = `${el.scrollHeight}px`
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  candidatoId:   string
  nombre:        string
  apellido:      string
  initialTexto:  string | null
  hideDownload?: boolean  // oculta solo el botón PDF (cuando el padre ya lo tiene)
}

// ─── Renderers vista ──────────────────────────────────────────────────────────

function KVContent({ content }: { content: string }) {
  const pairs = parseKV(content)
  return (
    <div className="space-y-2.5">
      {pairs.map(({ label, value }, i) => (
        <div key={i} className="grid items-baseline" style={{ gridTemplateColumns: "155px 1fr", columnGap: 16 }}>
          {label && <span style={{ fontSize: 12, color: "var(--gl-ink-3)", lineHeight: 1.5 }}>{label}</span>}
          <span style={{ fontSize: 13, color: "var(--gl-ink)", lineHeight: 1.5, gridColumn: label ? "auto" : "1 / -1" }}>{value}</span>
        </div>
      ))}
    </div>
  )
}

function ExperienceContent({ content }: { content: string }) {
  const jobs = parseJobs(content)
  if (!jobs.length) return <DefaultContent content={content} />
  return (
    <div className="space-y-5">
      {jobs.map((job, i) => (
        <div key={i} className="pl-3.5" style={{ borderLeft: "2px solid var(--gl-border)" }}>
          <div style={{ fontSize: 11, color: "var(--gl-olive)", fontWeight: 600, marginBottom: 3 }}>{job.periodo}</div>
          {job.titulo  && <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--gl-ink)", lineHeight: 1.35 }}>{job.titulo}</div>}
          {job.empresa && <div style={{ fontSize: 12.5, color: "var(--gl-ink-2)", marginTop: 2, marginBottom: 5 }}>{job.empresa}</div>}
          {job.desc    && <p style={{ fontSize: 12.5, color: "var(--gl-ink-3)", lineHeight: 1.7, margin: 0 }}>{job.desc}</p>}
        </div>
      ))}
    </div>
  )
}

function BulletContent({ content }: { content: string }) {
  const items = parseBullets(content)
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <span key={i} style={{ fontSize: 12, fontWeight: 500, background: "var(--gl-olive-bg)", color: "var(--gl-olive)", padding: "4px 10px", borderRadius: 8 }}>
          {item}
        </span>
      ))}
    </div>
  )
}

function ListContent({ content }: { content: string }) {
  const items = content.split("\n").filter(l => l.trim())
  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={i} className="flex items-baseline gap-2.5">
          <span style={{ color: "var(--gl-olive)", flexShrink: 0, fontSize: 10 }}>▪</span>
          <span style={{ fontSize: 12.5, color: "var(--gl-ink-2)", lineHeight: 1.6 }}>{item.trim().replace(/^[-•▪]\s*/, "")}</span>
        </div>
      ))}
    </div>
  )
}

function RefsContent({ content }: { content: string }) {
  const blocks = parseRefs(content)
  return (
    <div className="space-y-4">
      {blocks.map((block, i) => (
        <div key={i}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gl-ink)" }}>{block[0]}</div>
          {block.slice(1).map((line, j) => (
            <div key={j} style={{ fontSize: 12.5, color: "var(--gl-ink-3)", marginTop: 2 }}>{line}</div>
          ))}
        </div>
      ))}
    </div>
  )
}

function DefaultContent({ content }: { content: string }) {
  return <p style={{ fontSize: 12.5, lineHeight: 1.8, color: "var(--gl-ink-2)", margin: 0 }}>{content}</p>
}

function SectionContentWeb({ title, content }: { title: string; content: string }) {
  if (title === "DATOS PERSONALES")                   return <KVContent        content={content} />
  if (title === "EXPERIENCIA LABORAL")                return <ExperienceContent content={content} />
  if (title.startsWith("CONOCIMIENTOS"))              return <BulletContent    content={content} />
  if (title === "FORMACIÓN" || title === "FORMACION") return <ListContent      content={content} />
  if (title === "REFERENCIAS")                        return <RefsContent      content={content} />
  return <DefaultContent content={content} />
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function CVProcesadoEditor({ candidatoId, nombre, apellido, initialTexto, hideDownload = false }: Props) {
  const [sections,    setSections]    = useState<CvSection[]>(() => parseSections(initialTexto ?? ""))
  const [editMode,    setEditMode]    = useState(false)
  const [activeIdx,   setActiveIdx]   = useState<number | null>(null)
  const [drafts,      setDrafts]      = useState<Record<number, string>>({})
  const [showConfirm, setShowConfirm] = useState(false)
  const [pendingHref, setPendingHref] = useState<string | null>(null)
  const [saved,       setSaved]       = useState(false)
  const [isPending,   start]          = useTransition()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()

  const hasText   = !!initialTexto?.trim()
  const hasDrafts = Object.keys(drafts).length > 0
  const isDirty   = editMode && (hasDrafts || activeIdx !== null)

  // Bloquear cierre de tab / refresh cuando hay cambios sin guardar
  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = "" }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [isDirty])

  // Interceptar clicks en links internos cuando hay cambios sin guardar
  useEffect(() => {
    if (!isDirty) return
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as Element).closest("a")
      if (!anchor) return
      if (anchor.hasAttribute("download")) return       // descargas: dejar pasar
      const href = anchor.getAttribute("href")
      if (!href || href.startsWith("http") || href.startsWith("#")) return
      e.preventDefault()
      e.stopPropagation()
      setPendingHref(href)
      setShowConfirm(true)
    }
    document.addEventListener("click", handleClick, true)
    return () => document.removeEventListener("click", handleClick, true)
  }, [isDirty])

  // Entrar en modo edición
  function enterEditMode() {
    setEditMode(true)
    setDrafts({})
    setActiveIdx(null)
    setSaved(false)
  }

  // Abrir una sección para editar (guarda el draft de la anterior si existía)
  function openSection(idx: number) {
    if (!editMode) return
    if (activeIdx !== null && activeIdx !== idx) {
      // Guardar textarea actual al draft local antes de cambiar
      const currentVal = textareaRef.current?.value
      if (currentVal !== undefined) {
        setDrafts(d => ({ ...d, [activeIdx]: currentVal }))
      }
    }
    setActiveIdx(idx)
    setTimeout(() => {
      if (textareaRef.current) autoResize(textareaRef.current)
    }, 0)
  }

  // Guardar todo en DB y salir de edición
  function saveAll() {
    // Capturar el textarea activo si lo hay
    const finalDrafts = { ...drafts }
    if (activeIdx !== null && textareaRef.current) {
      finalDrafts[activeIdx] = textareaRef.current.value
    }
    const updated = sections.map((s, i) =>
      finalDrafts[i] !== undefined ? { ...s, content: finalDrafts[i] } : s
    )
    const fullText = assembleSections(updated)
    start(async () => {
      await updateCVProcesado(candidatoId, fullText)
      setSections(updated)
      setEditMode(false)
      setActiveIdx(null)
      setDrafts({})
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    })
  }

  // Intentar cancelar edición — pedir confirmación si hay cambios sin guardar
  function tryExitEdit() {
    setPendingHref(null)
    if (hasDrafts || activeIdx !== null) {
      setShowConfirm(true)
    } else {
      doExitEdit()
    }
  }

  function doExitEdit() {
    setEditMode(false)
    setActiveIdx(null)
    setDrafts({})
    setShowConfirm(false)
    if (pendingHref) {
      router.push(pendingHref)
      setPendingHref(null)
    }
  }

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (!hasText) {
    return (
      <div className="rounded-2xl border flex flex-col items-center justify-center py-20 gap-4 text-center"
        style={{ background: "#fff", borderColor: "var(--gl-border)" }}>
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

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      {(
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px]" style={{ color: "var(--gl-ink-3)" }}>
            {editMode
              ? activeIdx !== null
                ? `Editando ${sections[activeIdx]?.title} — hacé clic en otra sección para continuar`
                : "Modo edición — hacé clic en una sección para editarla"
              : "CV procesado por IA — editá si necesitás corregir algo"}
          </span>
          <div className="flex items-center gap-2">
            {editMode ? (
              <>
                <button
                  onClick={tryExitEdit}
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-medium transition-colors disabled:opacity-50"
                  style={{ background: "var(--gl-gray-bg)", color: "var(--gl-gray)" }}
                >
                  <X className="h-3.5 w-3.5" /> Cancelar
                </button>
                <button
                  onClick={saveAll}
                  disabled={isPending || (!hasDrafts && activeIdx === null)}
                  className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-semibold transition-all disabled:opacity-40"
                  style={{ background: "var(--gl-olive)", color: "#fff", boxShadow: "0 2px 8px rgba(42,74,24,0.25)" }}
                >
                  <Save className="h-3.5 w-3.5" />
                  {isPending ? "Guardando…" : "Guardar CV"}
                </button>
              </>
            ) : (
              <>
                {saved && (
                  <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: "var(--gl-olive)" }}>
                    <Check className="h-3.5 w-3.5" /> Guardado
                  </span>
                )}
                <button
                  onClick={enterEditMode}
                  className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-medium transition-colors"
                  style={{ background: "var(--gl-olive-bg)", color: "var(--gl-olive)", border: "1px solid rgba(42,74,24,0.2)" }}
                >
                  <Pencil className="h-3.5 w-3.5" /> Editar CV
                </button>
                {!hideDownload && (
                  <a
                    href={`/api/cv/${candidatoId}/pdf`}
                    download
                    className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[12px] font-semibold transition-all hover:opacity-90"
                    style={{ background: "var(--gl-olive)", color: "#fff", boxShadow: "0 2px 8px rgba(42,74,24,0.25)" }}
                  >
                    <Download className="h-3.5 w-3.5" /> Descargar PDF
                  </a>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Diálogo confirmar salir sin guardar ─────────────────────────────── */}
      {showConfirm && (
        <div
          className="mb-3 rounded-xl px-4 py-3 flex items-center justify-between gap-4"
          style={{ background: "#fff8e6", border: "1px solid #f5c842" }}
        >
          <span className="text-[12px] font-medium" style={{ color: "#7a5500" }}>
            Tenés cambios sin guardar. ¿Salir igual?
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfirm(false)}
              className="rounded-lg px-3 py-1.5 text-[11px] font-medium"
              style={{ background: "#fff", border: "1px solid #f5c842", color: "#7a5500" }}
            >
              Seguir editando
            </button>
            <button
              onClick={doExitEdit}
              className="rounded-lg px-3 py-1.5 text-[11px] font-semibold"
              style={{ background: "#c0392b", color: "#fff" }}
            >
              {pendingHref ? "Salir sin guardar" : "Descartar cambios"}
            </button>
          </div>
        </div>
      )}

      {/* ── Documento ─────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "#fff",
          boxShadow:  "0 4px 32px rgba(13,17,23,0.10), 0 1px 4px rgba(13,17,23,0.06)",
          border:     editMode ? "1.5px solid var(--gl-olive)" : "1px solid var(--gl-border)",
          transition: "border-color 0.2s",
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-7 py-5" style={{ background: "var(--gl-olive)" }}>
          <div>
            <div className="font-bold tracking-[0.12em] uppercase" style={{ color: "#fff", fontSize: 12 }}>
              Gestiones Laborales
            </div>
            <div className="mt-1 uppercase tracking-[0.16em]" style={{ color: "rgba(255,255,255,0.55)", fontSize: 7 }}>
              Consultora RRHH Agropecuario
            </div>
          </div>
          <div className="text-right">
            <div className="uppercase tracking-[0.2em]" style={{ color: "rgba(255,255,255,0.55)", fontSize: 7, marginBottom: 3 }}>
              Currículum Vitae
            </div>
            <div className="font-bold" style={{ color: "#fff", fontSize: 12 }}>{nombre} {apellido}</div>
          </div>
        </div>

        <div style={{ height: 3, background: "var(--gl-olive-light)", opacity: 0.35 }} />

        {/* Secciones */}
        <div style={{ background: "#fff" }}>
          {sections.length === 0 && (
            <div className="px-7 py-8">
              <DefaultContent content={initialTexto ?? ""} />
            </div>
          )}

          {sections.map((sec, idx) => {
            const isActive = activeIdx === idx
            const isDirty  = drafts[idx] !== undefined
            const content  = drafts[idx] ?? sec.content

            return (
              <div
                key={idx}
                onClick={() => !isActive && openSection(idx)}
                style={{
                  borderBottom: idx < sections.length - 1 ? "1px solid var(--gl-border)" : "none",
                  padding:      "18px 28px",
                  background:   isActive ? "#fafffe" : editMode && !isActive ? "#fafafa" : "#fff",
                  cursor:       editMode && !isActive ? "pointer" : "default",
                  transition:   "background 0.15s",
                }}
              >
                {/* Cabecera de sección */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div style={{
                      width: 3, height: 14, borderRadius: 2, flexShrink: 0,
                      background: isActive ? "var(--gl-amber)" : "var(--gl-olive)",
                      transition: "background 0.15s",
                    }} />
                    <span className="font-bold uppercase tracking-[0.18em]" style={{
                      color:    isActive ? "var(--gl-amber)" : "var(--gl-olive)",
                      fontSize: 10, transition: "color 0.15s",
                    }}>
                      {sec.title}
                    </span>
                    {isDirty && !isActive && (
                      <span style={{ fontSize: 9, color: "var(--gl-amber)", fontWeight: 600 }}>● editado</span>
                    )}
                  </div>
                  {editMode && !isActive && (
                    <span style={{ fontSize: 10, color: "var(--gl-ink-3)" }}>clic para editar</span>
                  )}
                </div>

                <div style={{
                  height: 1,
                  background: isActive ? "var(--gl-olive)" : "var(--gl-border)",
                  opacity: isActive ? 0.4 : 1,
                  marginBottom: 14,
                  transition: "background 0.15s",
                }} />

                {/* Contenido */}
                {editMode && isActive ? (
                  <textarea
                    ref={textareaRef}
                    defaultValue={content}
                    autoFocus
                    onFocus={(e) => autoResize(e.target)}
                    onChange={(e) => autoResize(e.target)}
                    className="w-full resize-none focus:outline-none rounded-xl px-4 py-3"
                    style={{
                      fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
                      fontSize:   12.5, lineHeight: 1.75, color: "var(--gl-ink)",
                      background: "#f6f8fa", border: "1.5px solid var(--gl-olive)",
                      minHeight:  72, overflow: "hidden",
                    }}
                  />
                ) : (
                  <SectionContentWeb title={sec.title} content={content} />
                )}
              </div>
            )
          })}
        </div>

        {/* Footer del documento */}
        <div className="flex items-center justify-between px-7 py-2.5" style={{ borderTop: "1px solid var(--gl-border)" }}>
          <span className="font-bold uppercase tracking-[0.1em]" style={{ color: "var(--gl-olive)", fontSize: 7.5 }}>
            Gestiones Laborales
          </span>
          <span style={{ color: "var(--gl-ink-3)", fontSize: 7.5 }}>
            {new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })}
          </span>
        </div>
      </div>
    </div>
  )
}
