"use client"

import { Download, FileText } from "lucide-react"
import {
  parseSections,
  parseKV, parseJobs, parseBullets, parseRefs, parseJobBlocksB,
  type CvSection,
} from "@/lib/cv/utils"

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
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 32px" }}>
      {pairs.map(({ label, value }, i) => {
        const sinDato = !value || value === "sin dato"
        return (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {label && (
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--gl-ink-3)" }}>
                {label}
              </span>
            )}
            <span style={{ fontSize: 13, color: sinDato ? "var(--gl-ink-3)" : "var(--gl-ink)", fontStyle: sinDato ? "italic" : "normal", lineHeight: 1.4 }}>
              {value || "sin dato"}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function SinDatoTag() {
  return <span style={{ color: "var(--gl-ink-3)", fontStyle: "italic", fontWeight: 400 }}>sin dato</span>
}

function ExperienceContent({ content }: { content: string }) {
  const blocks = parseJobBlocksB(content)
  // Fallback al parser viejo si el contenido no tiene marcadores ▸
  if (!blocks.length) {
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

  return (
    <div className="space-y-5">
      {blocks.map((b, i) => {
        const isSinDato = (v: string) => !v || v === "sin dato"

        return (
          <div key={i} className="pl-3.5" style={{ borderLeft: "2px solid var(--gl-border)" }}>
            {/* Tipo: TRABAJO ACTUAL / TRABAJO ANTERIOR N */}
            <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--gl-olive)", opacity: 0.65, marginBottom: 5 }}>
              {b.header}
            </div>

            {/* Cargo + Período — misma fila */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 3 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: isSinDato(b.cargo) ? "var(--gl-ink-3)" : "var(--gl-ink)", fontStyle: isSinDato(b.cargo) ? "italic" : "normal", lineHeight: 1.3 }}>
                {isSinDato(b.cargo) ? "sin dato" : b.cargo}
              </span>
              {!isSinDato(b.periodo) && (
                <span style={{ fontSize: 11, color: "var(--gl-ink-3)", flexShrink: 0 }}>{b.periodo}</span>
              )}
            </div>

            {/* Establecimiento · Ubicación */}
            <div style={{ fontSize: 12.5, marginBottom: 8, lineHeight: 1.4 }}>
              {!isSinDato(b.establecimiento)
                ? <span style={{ fontWeight: 600, color: "var(--gl-olive)" }}>{b.establecimiento}</span>
                : <span style={{ color: "var(--gl-ink-3)", fontStyle: "italic" }}>sin dato</span>
              }
              {!isSinDato(b.ubicacion) && (
                <span style={{ color: "var(--gl-ink-3)" }}> · {b.ubicacion}</span>
              )}
            </div>

            {/* Metadata — grilla 2 columnas, siempre visible */}
            {b.metadata.length > 0 && (
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr",
                gap: "5px 16px", marginBottom: 8,
                background: "rgba(42,74,24,0.04)", borderRadius: 6, padding: "8px 10px",
              }}>
                {b.metadata.map((m, j) => {
                  const kv = m.match(/^([^:]+):\s*(.+)$/)
                  if (!kv) return null
                  const sinD = kv[2].trim() === "sin dato"
                  return (
                    <div key={j} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      <span style={{ fontSize: 9.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--gl-ink-3)" }}>
                        {kv[1].trim()}
                      </span>
                      <span style={{ fontSize: 12, color: sinD ? "var(--gl-ink-3)" : "var(--gl-ink-2)", fontStyle: sinD ? "italic" : "normal" }}>
                        {kv[2].trim()}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Tareas */}
            <p style={{ fontSize: 12.5, color: isSinDato(b.tareas) ? "var(--gl-ink-3)" : "var(--gl-ink-2)", fontStyle: isSinDato(b.tareas) ? "italic" : "normal", lineHeight: 1.7, margin: 0 }}>
              {isSinDato(b.tareas) ? "Tareas: sin dato" : b.tareas}
            </p>
          </div>
        )
      })}
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
  const sections: CvSection[] = parseSections(initialTexto ?? "")
  const hasText = !!initialTexto?.trim()

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
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px]" style={{ color: "var(--gl-ink-3)" }}>
          CV procesado por IA — para corregir datos, editá el perfil del candidato
        </span>
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
      </div>

      {/* ── Documento ─────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "#fff",
          boxShadow:  "0 4px 32px rgba(13,17,23,0.10), 0 1px 4px rgba(13,17,23,0.06)",
          border:     "1px solid var(--gl-border)",
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

          {sections.map((sec, idx) => (
            <div
              key={idx}
              style={{
                borderBottom: idx < sections.length - 1 ? "1px solid var(--gl-border)" : "none",
                padding: "18px 28px",
              }}
            >
              <div className="flex items-center gap-2.5 mb-3">
                <div style={{ width: 3, height: 14, borderRadius: 2, flexShrink: 0, background: "var(--gl-olive)" }} />
                <span className="font-bold uppercase tracking-[0.18em]" style={{ color: "var(--gl-olive)", fontSize: 10 }}>
                  {sec.title}
                </span>
              </div>
              <div style={{ height: 1, background: "var(--gl-border)", marginBottom: 14 }} />
              <SectionContentWeb title={sec.title} content={sec.content} />
            </div>
          ))}
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
