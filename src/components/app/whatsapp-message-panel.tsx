"use client"

import { useState, useTransition } from "react"
import { RefreshCw, CheckCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import {
  actualizarCVDesdeConversacion,
  actualizarCVConRespuestas,
  extraerYGuardarRespuestas,
  type ConversacionEntry,
  type RespuestaItem,
  type PreguntaEnviada,
} from "@/lib/actions/candidatos"

// ─── Overlay de carga / éxito ─────────────────────────────────────────────────

function LoadingOverlay({ titulo, subtitulo }: { titulo: string; subtitulo: string }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(13,17,23,0.55)", backdropFilter: "blur(3px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "#fff", borderRadius: 20, padding: "40px 52px",
        textAlign: "center", boxShadow: "0 24px 64px rgba(13,17,23,0.22)",
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 16, minWidth: 260,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: "50%",
          border: "3px solid #e2e8d9", borderTopColor: "#2a4a18",
          animation: "spin 0.9s linear infinite",
        }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0d1117", marginBottom: 4 }}>{titulo}</div>
          <div style={{ fontSize: 12, color: "#8b949e" }}>{subtitulo}</div>
        </div>
      </div>
    </div>
  )
}

function SuccessOverlay({ titulo, subtitulo }: { titulo: string; subtitulo: string }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(13,17,23,0.55)", backdropFilter: "blur(3px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "#fff", borderRadius: 20, padding: "40px 52px",
        textAlign: "center", boxShadow: "0 24px 64px rgba(13,17,23,0.22)",
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 16, minWidth: 260,
      }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#dafbe1", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <CheckCircle style={{ width: 26, height: 26, color: "#1a7f37" }} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0d1117", marginBottom: 4 }}>{titulo}</div>
          <div style={{ fontSize: 12, color: "#8b949e" }}>{subtitulo}</div>
        </div>
      </div>
    </div>
  )
}

interface Props {
  candidatoId:           string
  fecha_consultado:      string | null
  initialRespuestas?:    RespuestaItem[] | null
  initialConversaciones?: ConversacionEntry[] | null
  preguntasEnviadasDb?:  PreguntaEnviada[] | null
}

const CARD = {
  background: "#ffffff",
  borderColor: "var(--gl-border)",
  boxShadow: "0 2px 8px rgba(13,17,23,0.05)",
} as const

export function WhatsappMessagePanel({
  candidatoId,
  fecha_consultado,
  initialRespuestas,
  initialConversaciones,
  preguntasEnviadasDb,
}: Props) {
  const router = useRouter()
  const [conversaciones, setConversaciones]   = useState<ConversacionEntry[]>(initialConversaciones ?? [])
  const [expandedConvId, setExpandedConvId]   = useState<string | null>(null)
  const [modoCiclo, setModoCiclo]             = useState(false)
  const [cicloTexto, setCicloTexto]           = useState("")
  const [cicloOk, setCicloOk]                 = useState(false)
  const [cicloErr, setCicloErr]               = useState<string | null>(null)
  const [cicloPending, startCiclo]            = useTransition()
  const [respuestasPorTanda, setRespuestasPorTanda] = useState<Map<string, string>>(new Map())
  const [extractandoPor, setExtractandoPor]         = useState<string | null>(null)
  const [erroresPorTanda, setErroresPorTanda]       = useState<Map<string, string>>(new Map())
  const [cvOk, setCvOk]                             = useState(false)
  const [cvErr, setCvErr]                           = useState<string | null>(null)

  // Agrupar preguntas enviadas por tanda_id
  type TandaGroup = { id: string; preguntas: PreguntaEnviada[]; enviado_at: string; numero: number }
  const tandas: TandaGroup[] = (() => {
    if (!preguntasEnviadasDb?.length) return []
    const map = new Map<string, PreguntaEnviada[]>()
    for (const p of preguntasEnviadasDb) {
      const key = p.tanda_id ?? "legacy"
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(p)
    }
    return Array.from(map.entries())
      .map(([id, preguntas], i) => ({ id, preguntas, enviado_at: preguntas[0]!.enviado_at, numero: i + 1 }))
      .sort((a, b) => a.enviado_at.localeCompare(b.enviado_at))
  })()

  function isTandaExtraida(tanda: TandaGroup): boolean {
    return tanda.preguntas.every((p) =>
      initialRespuestas?.some((r) => r.pregunta === p.pregunta && r.respuesta.trim())
    )
  }

  async function handleExtraerTanda(tanda: TandaGroup) {
    const texto = respuestasPorTanda.get(tanda.id) ?? ""
    if (!texto.trim() || extractandoPor === tanda.id) return
    setExtractandoPor(tanda.id)
    setCvErr(null)
    setCvOk(false)
    setErroresPorTanda((prev) => { const m = new Map(prev); m.delete(tanda.id); return m })

    // Paso 1: extraer y guardar respuestas
    const result = await extraerYGuardarRespuestas(candidatoId, tanda.preguntas, texto)
    if (!result.success) {
      setExtractandoPor(null)
      setErroresPorTanda((prev) => { const m = new Map(prev); m.set(tanda.id, result.error ?? "Error"); return m })
      return
    }

    // Paso 2: actualizar CV automáticamente
    const cvResult = await actualizarCVConRespuestas(candidatoId)
    setExtractandoPor(null)
    setRespuestasPorTanda((prev) => { const m = new Map(prev); m.set(tanda.id, ""); return m })

    if (cvResult.success) {
      setCvOk(true)
      router.refresh()
      setTimeout(() => setCvOk(false), 2500)
    } else {
      setCvErr(cvResult.error ?? "No se pudo actualizar el CV")
      router.refresh()
    }
  }

  const fechaFormateada = fecha_consultado
    ? new Date(fecha_consultado).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })
    : null

  const hasRespuestas = !!initialRespuestas?.some((r) => r.respuesta.trim())

  // ── modoCiclo: paste new conversation ──────────────────────────────────────

  if (modoCiclo) {
    function handleActualizarCiclo() {
      setCicloErr(null); setCicloOk(false)
      const textoGuardado = cicloTexto
      startCiclo(async () => {
        const result = await actualizarCVDesdeConversacion(candidatoId, textoGuardado)
        if (result.success) {
          const nueva: ConversacionEntry = {
            id: crypto.randomUUID(),
            fecha: new Date().toISOString(),
            texto: textoGuardado,
          }
          setConversaciones((prev) => [nueva, ...prev])
          setCicloOk(true)
          setCicloTexto("")
          setTimeout(() => { setCicloOk(false); setModoCiclo(false) }, 2000)
        } else {
          setCicloErr(result.error)
        }
      })
    }

    return (
      <>
        {cicloPending && <LoadingOverlay titulo="Actualizando CV…" subtitulo="Procesando la conversación…" />}
        {cicloOk      && <SuccessOverlay titulo="CV actualizado" subtitulo="Los cambios ya están guardados" />}
        <div className="rounded-2xl border p-5" style={CARD}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[14px] font-bold" style={{ color: "var(--gl-ink)" }}>Nueva conversación</h2>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--gl-ink-3)" }}>
                Pegá la conversación de WhatsApp — el CV se actualiza automáticamente
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setModoCiclo(false); setCicloTexto(""); setCicloErr(null) }}
              style={{ background: "none", border: "none", color: "var(--gl-ink-3)", cursor: "pointer", fontSize: 13 }}
            >
              ✕
            </button>
          </div>

          <textarea
            value={cicloTexto}
            onChange={(e) => setCicloTexto(e.target.value)}
            rows={8}
            placeholder={"[Oriana]: ¿Tenés vehículo propio?\n[Candidato]: Sí, auto Gol 2012.\n..."}
            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none mb-3"
            style={{
              background: "var(--gl-surface)", border: "1.5px solid var(--gl-olive)",
              color: "var(--gl-ink)", fontFamily: "inherit", lineHeight: 1.6, resize: "vertical",
            }}
          />

          {cicloErr && <p className="text-xs mb-2" style={{ color: "#c0392b" }}>{cicloErr}</p>}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleActualizarCiclo}
              disabled={cicloPending || !cicloTexto.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-semibold"
              style={{
                background: "var(--gl-olive)", color: "#fff", border: "none",
                cursor: cicloPending || !cicloTexto.trim() ? "default" : "pointer",
                opacity: cicloPending || !cicloTexto.trim() ? 0.6 : 1,
              }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {cicloPending ? "Actualizando CV…" : "Actualizar CV"}
            </button>
          </div>
        </div>
      </>
    )
  }

  // ── Historial (Q&A + conversations) ────────────────────────────────────────

  // Empty state
  if (!fecha_consultado && !hasRespuestas && conversaciones.length === 0 && tandas.length === 0) {
    return (
      <div className="rounded-2xl border p-6" style={CARD}>
        <p className="text-sm text-center py-4" style={{ color: "var(--gl-ink-3)" }}>
          Sin contacto registrado aún — generá las preguntas desde el panel de arriba.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Overlays globales */}
      {extractandoPor !== null && <LoadingOverlay titulo="Procesando respuestas…" subtitulo="Puede tardar unos segundos." />}
      {cvOk             && <SuccessOverlay titulo="CV actualizado" subtitulo="El perfil ya refleja las respuestas del candidato" />}
      {cvErr     && null /* el error se muestra inline en la card */}

      {/* Una card por tanda */}
      {tandas.map((tanda) => {
        const extraida         = isTandaExtraida(tanda)
        const textoRespuesta   = respuestasPorTanda.get(tanda.id) ?? ""
        const estaExtractando  = extractandoPor === tanda.id
        const error            = erroresPorTanda.get(tanda.id)
        const fechaTanda       = new Date(tanda.enviado_at).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })
        const horaTanda        = new Date(tanda.enviado_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
        return (
          <div key={tanda.id} className="rounded-2xl border p-5" style={CARD}>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-[14px] font-bold flex items-center gap-1.5" style={{ color: "var(--gl-ink)" }}>
                  Tanda {tanda.numero}
                  {extraida && <CheckCircle className="h-3.5 w-3.5" style={{ color: "#1a7f37" }} />}
                </h2>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--gl-ink-3)" }}>
                  {fechaTanda} · {horaTanda} · {tanda.preguntas.length} pregunta{tanda.preguntas.length !== 1 ? "s" : ""}
                </p>
              </div>
              {cvErr && <span className="text-[11px]" style={{ color: "#c0392b" }}>{cvErr}</span>}
            </div>

            {/* Preguntas de esta tanda */}
            <div className="flex flex-col gap-1 mb-3 rounded-xl p-3" style={{ background: "var(--gl-surface)", border: "1px solid var(--gl-border)" }}>
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: "var(--gl-ink-3)" }}>
                Preguntas realizadas
              </div>
              {tanda.preguntas.map((p, i) => (
                <div key={p.campo} className="flex gap-2 text-[12px]" style={{ color: "var(--gl-ink-2, #4a5c38)" }}>
                  <span className="shrink-0 font-semibold">{i + 1}.</span>
                  <span>{p.pregunta}</span>
                </div>
              ))}
            </div>

            {/* Si fue extraída: Q&A read-only. Si no: textarea + botón */}
            {extraida ? (
              <div className="space-y-2.5">
                {tanda.preguntas.map((p) => {
                  const resp = initialRespuestas?.find((r) => r.pregunta === p.pregunta)
                  return (
                    <div key={p.campo} style={{ borderLeft: "2px solid var(--gl-border)", paddingLeft: 10 }}>
                      <div className="text-[11px] font-semibold mb-0.5" style={{ color: "var(--gl-ink-3)" }}>{p.pregunta}</div>
                      <div className="text-[12.5px]" style={{ color: resp?.respuesta?.trim() ? "var(--gl-ink)" : "var(--gl-ink-3)" }}>
                        {resp?.respuesta?.trim() || "— sin respuesta"}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <>
                <textarea
                  value={textoRespuesta}
                  onChange={(e) => setRespuestasPorTanda((prev) => new Map(prev).set(tanda.id, e.target.value))}
                  rows={5}
                  placeholder="Pegá la respuesta del candidato aquí…"
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none mb-3"
                  style={{
                    background: "var(--gl-surface)", border: "1.5px solid var(--gl-olive)",
                    color: "var(--gl-ink)", fontFamily: "inherit", lineHeight: 1.6, resize: "vertical",
                  }}
                />
                {error && <p className="text-xs mb-2" style={{ color: "#c0392b" }}>{error}</p>}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => { void handleExtraerTanda(tanda) }}
                    disabled={estaExtractando || !textoRespuesta.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-semibold"
                    style={{
                      background: "var(--gl-olive)", color: "#fff", border: "none",
                      cursor: estaExtractando || !textoRespuesta.trim() ? "default" : "pointer",
                      opacity: estaExtractando || !textoRespuesta.trim() ? 0.65 : 1,
                    }}
                  >
                    <RefreshCw className={`h-3.5 w-3.5${estaExtractando ? " animate-spin" : ""}`} />
                    {estaExtractando ? "Extrayendo…" : "Extraer y guardar →"}
                  </button>
                </div>
              </>
            )}
          </div>
        )
      })}

      {/* Q&A read-only — solo se muestra cuando no hay sistema de tandas (candidatos legacy) */}
      {hasRespuestas && tandas.length === 0 && (
        <div className="rounded-2xl border p-5" style={CARD}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[14px] font-bold" style={{ color: "var(--gl-ink)" }}>Q&amp;A registrado</h2>
              {fechaFormateada && (
                <p className="text-[11px] mt-0.5" style={{ color: "var(--gl-ink-3)" }}>
                  Consultado el {fechaFormateada}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setModoCiclo(true)}
              className="text-[11.5px] font-semibold px-3 py-1.5 rounded-lg"
              style={{ background: "var(--gl-olive-bg)", color: "var(--gl-olive)", border: "none", cursor: "pointer" }}
            >
              + Agregar conversación
            </button>
          </div>
          <div className="space-y-3">
            {initialRespuestas!.map(({ pregunta, respuesta }, i) => (
              <div key={i} style={{ borderLeft: "2px solid var(--gl-border)", paddingLeft: 12 }}>
                <div className="text-[11px] font-semibold mb-0.5" style={{ color: "var(--gl-ink-3)" }}>
                  {pregunta}
                </div>
                <div className="text-[12.5px]" style={{ color: respuesta.trim() ? "var(--gl-ink)" : "var(--gl-ink-3)" }}>
                  {respuesta.trim() || "— sin respuesta"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botón para agregar conversación manual — siempre visible cuando hay tandas */}
      {tandas.length > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setModoCiclo(true)}
            className="text-[11.5px] font-semibold px-3 py-1.5 rounded-lg"
            style={{ background: "var(--gl-olive-bg)", color: "var(--gl-olive)", border: "none", cursor: "pointer" }}
          >
            + Agregar conversación libre
          </button>
        </div>
      )}

      {/* Historial de conversaciones */}
      {conversaciones.length > 0 && (
        <div className="rounded-2xl border p-5" style={CARD}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--gl-ink-3)" }}>
              Conversaciones ({conversaciones.length})
            </div>
            {!hasRespuestas && (
              <button
                type="button"
                onClick={() => setModoCiclo(true)}
                className="text-[11.5px] font-semibold px-3 py-1.5 rounded-lg"
                style={{ background: "var(--gl-olive-bg)", color: "var(--gl-olive)", border: "none", cursor: "pointer" }}
              >
                + Agregar conversación
              </button>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {conversaciones.map((conv) => {
              const isOpen = expandedConvId === conv.id
              const fecha = new Date(conv.fecha).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })
              const hora  = new Date(conv.fecha).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
              const preview = conv.texto.split("\n")[0]?.slice(0, 60) ?? ""
              return (
                <div key={conv.id} className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--gl-border)" }}>
                  <button
                    type="button"
                    onClick={() => setExpandedConvId(isOpen ? null : conv.id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left"
                    style={{ background: isOpen ? "var(--gl-surface)" : "#fff", cursor: "pointer", border: "none" }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-[11.5px] font-semibold shrink-0" style={{ color: "var(--gl-olive)" }}>
                        {fecha} · {hora}
                      </span>
                      {!isOpen && (
                        <span className="text-[11px] truncate" style={{ color: "var(--gl-ink-3)" }}>
                          {preview}…
                        </span>
                      )}
                    </div>
                    <span style={{ color: "var(--gl-ink-3)", fontSize: 12, flexShrink: 0 }}>
                      {isOpen ? "▲" : "▼"}
                    </span>
                  </button>
                  {isOpen && (
                    <pre
                      className="px-4 pb-4 text-xs leading-relaxed whitespace-pre-wrap font-sans"
                      style={{
                        color: "var(--gl-ink)", borderTop: "1px solid var(--gl-border)",
                        margin: 0, paddingTop: 12, background: "var(--gl-surface)",
                        maxHeight: 320, overflowY: "auto",
                      }}
                    >
                      {conv.texto}
                    </pre>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Contactado pero sin respuestas ni conversaciones aún */}
      {fecha_consultado && !hasRespuestas && conversaciones.length === 0 && (
        <div className="rounded-2xl border p-5" style={CARD}>
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: "var(--gl-ink-3)" }}>
              Consultado el {fechaFormateada} — sin respuestas registradas todavía.
            </p>
            <button
              type="button"
              onClick={() => setModoCiclo(true)}
              className="text-[11.5px] font-semibold px-3 py-1.5 rounded-lg shrink-0"
              style={{ background: "var(--gl-olive-bg)", color: "var(--gl-olive)", border: "none", cursor: "pointer" }}
            >
              + Agregar conversación
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
