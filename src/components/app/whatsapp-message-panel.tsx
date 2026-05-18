"use client"

import { useState, useTransition } from "react"
import { MessageCircle, ChevronDown, ChevronUp, Plus, Trash2, X, Save, RefreshCw, CheckCircle, MessageSquare, Wand2 } from "lucide-react"
import { generarMensajeWhatsapp, waUrl } from "@/lib/cv/utils"
import { registrarEnvioWhatsapp, guardarRespuestas, actualizarCVConRespuestas, extraerRespuestasDeConversacion } from "@/lib/actions/candidatos"

interface Props {
  candidatoId: string
  nombre: string
  telefono: string | null
  preguntas_sugeridas: string[]
  fecha_consultado: string | null
  mensaje_whatsapp: string | null
  initialRespuestas?: { pregunta: string; respuesta: string }[] | null
}

const CARD = {
  background: "#ffffff",
  borderColor: "var(--gl-border)",
  boxShadow: "0 2px 8px rgba(13,17,23,0.05)",
} as const

export function WhatsappMessagePanel({
  candidatoId,
  nombre,
  telefono,
  preguntas_sugeridas,
  fecha_consultado,
  mensaje_whatsapp,
  initialRespuestas,
}: Props) {
  const [preguntas, setPreguntas] = useState(preguntas_sugeridas)
  const [modalOpen, setModalOpen] = useState(false)
  const [mensajeEnModal, setMensajeEnModal] = useState("")
  const [showOriginal, setShowOriginal] = useState(false)
  const [isPending, startTransition] = useTransition()

  // ── Respuestas ──────────────────────────────────────────────────────────────
  const hasRespuestas = !!initialRespuestas?.some((r) => r.respuesta.trim())
  const [showRespuestas, setShowRespuestas] = useState(hasRespuestas)
  const [answers, setAnswers] = useState<string[]>(() =>
    preguntas_sugeridas.map((p) => initialRespuestas?.find((r) => r.pregunta === p)?.respuesta ?? "")
  )
  const [savePending,   startSave]   = useTransition()
  const [updatePending, startUpdate] = useTransition()
  const [parsePending,  startParse]  = useTransition()
  const [saveOk,   setSaveOk]   = useState(false)
  const [updateOk, setUpdateOk] = useState(false)
  const [parseOk,  setParseOk]  = useState(false)
  const [respErr,  setRespErr]  = useState<string | null>(null)
  const [convTexto, setConvTexto] = useState("")

  function handleGuardar() {
    setRespErr(null); setSaveOk(false)
    startSave(async () => {
      const payload = preguntas_sugeridas.map((p, i) => ({ pregunta: p, respuesta: answers[i] ?? "" }))
      const result = await guardarRespuestas(candidatoId, payload)
      if (result.success) { setSaveOk(true); setTimeout(() => setSaveOk(false), 2500) }
      else setRespErr(result.error)
    })
  }

  function handleActualizarCV() {
    setRespErr(null); setUpdateOk(false)
    startUpdate(async () => {
      const payload = preguntas_sugeridas.map((p, i) => ({ pregunta: p, respuesta: answers[i] ?? "" }))
      await guardarRespuestas(candidatoId, payload)
      const result = await actualizarCVConRespuestas(candidatoId)
      if (result.success) { setUpdateOk(true); setTimeout(() => setUpdateOk(false), 3000) }
      else setRespErr(result.error)
    })
  }

  function handleAnalizarConversacion() {
    setRespErr(null); setParseOk(false)
    startParse(async () => {
      const result = await extraerRespuestasDeConversacion(preguntas_sugeridas, convTexto)
      if (result.success) {
        setAnswers(result.respuestas)
        setParseOk(true)
        setConvTexto("")
        setTimeout(() => setParseOk(false), 4000)
      } else {
        setRespErr(result.error)
      }
    })
  }

  const sinTelefono = !telefono

  const fechaFormateada = fecha_consultado
    ? new Date(fecha_consultado).toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null

  function updatePregunta(i: number, value: string) {
    setPreguntas((prev) => prev.map((p, idx) => (idx === i ? value : p)))
  }

  function removePregunta(i: number) {
    setPreguntas((prev) => prev.filter((_, idx) => idx !== i))
  }

  function addPregunta() {
    setPreguntas((prev) => [...prev, ""])
  }

  function handleGenerarMensaje() {
    const preguntasValidas = preguntas.filter((p) => p.trim())
    setMensajeEnModal(generarMensajeWhatsapp(nombre, preguntasValidas))
    setModalOpen(true)
  }

  function abrirWA() {
    const url = `${waUrl(telefono!)}?text=${encodeURIComponent(mensajeEnModal)}`
    window.open(url, "_blank")
  }

  function handleEnviarYMarcar() {
    if (sinTelefono) return
    startTransition(async () => {
      await registrarEnvioWhatsapp(candidatoId, mensajeEnModal, preguntas.filter((p) => p.trim()))
      abrirWA()
      setModalOpen(false)
    })
  }

  function handleSoloAbrir() {
    if (sinTelefono) return
    abrirWA()
    setModalOpen(false)
  }

  return (
    <>
      <div className="rounded-2xl border p-6" style={CARD}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-[15px] font-bold" style={{ color: "var(--gl-ink)" }}>
              Mensaje WhatsApp
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--gl-ink-3)" }}>
              Editá las preguntas y generá el mensaje para enviar
            </p>
          </div>
          {fechaFormateada && (
            <span
              className="text-[10.5px] font-semibold px-2.5 py-1 rounded-full shrink-0"
              style={{ background: "#dafbe1", color: "#1a7f37" }}
            >
              Consultado el {fechaFormateada}
            </span>
          )}
        </div>

        {/* Mensaje enviado colapsable */}
        {fecha_consultado && mensaje_whatsapp && (
          <>
            <button
              type="button"
              onClick={() => setShowOriginal((v) => !v)}
              className="flex items-center gap-1.5 text-[11px] font-medium mb-4"
              style={{ color: "var(--gl-ink-3)" }}
            >
              {showOriginal ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {showOriginal ? "Ocultar mensaje enviado" : "Ver mensaje que se envio"}
            </button>
            {showOriginal && (
              <pre
                className="text-xs rounded-xl p-4 mb-5 whitespace-pre-wrap font-sans leading-relaxed"
                style={{
                  background: "var(--gl-surface)",
                  border: "1px solid var(--gl-border)",
                  color: "var(--gl-ink-3)",
                }}
              >
                {mensaje_whatsapp}
              </pre>
            )}
          </>
        )}

        {/* Lista de preguntas editable */}
        <div className="space-y-2 mb-5">
          {preguntas.map((p, i) => (
            <div key={i} className="flex items-start gap-2">
              <span
                className="text-[11px] font-bold tabular-nums mt-2.5 shrink-0 w-5 text-right"
                style={{ color: "var(--gl-ink-3)" }}
              >
                {i + 1}.
              </span>
              <input
                value={p}
                onChange={(e) => updatePregunta(i, e.target.value)}
                placeholder="Escribi la pregunta..."
                className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
                style={{
                  background: "var(--gl-surface)",
                  border: "1px solid var(--gl-border)",
                  color: "var(--gl-ink)",
                }}
              />
              <button
                type="button"
                onClick={() => removePregunta(i)}
                className="mt-1.5 p-1.5 rounded-lg transition-opacity hover:opacity-70 shrink-0"
                style={{ color: "var(--gl-ink-3)" }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* ── Respuestas del candidato ── */}
        {preguntas_sugeridas.length > 0 && (
          <div
            style={{
              marginBottom: "1.25rem",
              borderTop: "1px solid var(--gl-border)",
              paddingTop: "1.25rem",
            }}
          >
            <button
              type="button"
              onClick={() => setShowRespuestas((v) => !v)}
              className="flex items-center gap-2 w-full text-left mb-3"
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              <MessageSquare className="h-3.5 w-3.5" style={{ color: "var(--gl-olive)", flexShrink: 0 }} />
              <span className="text-[12px] font-semibold" style={{ color: "var(--gl-ink)", flex: 1 }}>
                Respuestas del candidato
              </span>
              {hasRespuestas && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--gl-olive-bg)", color: "var(--gl-olive)" }}>
                  {initialRespuestas!.filter((r) => r.respuesta.trim()).length} cargadas
                </span>
              )}
              {showRespuestas
                ? <ChevronUp className="h-3.5 w-3.5" style={{ color: "var(--gl-ink-3)", flexShrink: 0 }} />
                : <ChevronDown className="h-3.5 w-3.5" style={{ color: "var(--gl-ink-3)", flexShrink: 0 }} />
              }
            </button>

            {showRespuestas && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>

                {/* Pegar conversación completa */}
                <div>
                  <textarea
                    value={convTexto}
                    onChange={(e) => setConvTexto(e.target.value)}
                    rows={6}
                    placeholder="Pegá acá el chat de WhatsApp y se extraen las respuestas automáticamente..."
                    className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                    style={{
                      background: "var(--gl-surface)",
                      border: "1px solid var(--gl-border)",
                      color: "var(--gl-ink)",
                      fontFamily: "inherit",
                      lineHeight: 1.5,
                      resize: "vertical",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--gl-olive)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--gl-border)")}
                  />
                  <div className="flex items-center justify-between mt-2">
                    {parseOk ? (
                      <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "#1a7f37" }}>
                        <CheckCircle className="h-3.5 w-3.5" />
                        Respuestas cargadas — revisalas antes de guardar
                      </span>
                    ) : <span />}
                    <button
                      type="button"
                      onClick={handleAnalizarConversacion}
                      disabled={parsePending || !convTexto.trim()}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
                      style={{
                        background: "var(--gl-olive)",
                        color: "#fff",
                        border: "none",
                        opacity: parsePending || !convTexto.trim() ? 0.5 : 1,
                        cursor: parsePending || !convTexto.trim() ? "not-allowed" : "pointer",
                      }}
                    >
                      <Wand2 className="h-3.5 w-3.5" />
                      {parsePending ? "Extrayendo…" : "Extraer respuestas"}
                    </button>
                  </div>
                </div>

                {/* Respuestas extraídas — solo si hay alguna */}
                {answers.some((a) => a.trim()) && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", borderTop: "1px solid var(--gl-border)", paddingTop: "0.875rem" }}>
                    {preguntas_sugeridas.map((pregunta, i) => (
                      <div key={i}>
                        <div className="text-[11px] font-semibold mb-1" style={{ color: "var(--gl-olive)" }}>
                          {i + 1}. {pregunta}
                        </div>
                        <textarea
                          value={answers[i] ?? ""}
                          onChange={(e) => {
                            const next = [...answers]
                            next[i] = e.target.value
                            setAnswers(next)
                          }}
                          rows={2}
                          placeholder="Sin respuesta"
                          className="w-full rounded-xl px-3 py-2 text-sm outline-none resize-none"
                          style={{
                            background: "var(--gl-surface)",
                            border: "1px solid var(--gl-border)",
                            color: "var(--gl-ink)",
                            lineHeight: 1.5,
                            fontFamily: "inherit",
                            transition: "border-color 0.15s",
                          }}
                          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--gl-olive)")}
                          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--gl-border)")}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {respErr && (
                  <div className="rounded-xl px-3 py-2 text-xs" style={{ background: "#ffebe9", color: "#cf222e", border: "1px solid #f1aeb5" }}>
                    {respErr}
                  </div>
                )}

                {answers.some((a) => a.trim()) && (
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleGuardar}
                      disabled={savePending || updatePending}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-opacity"
                      style={{
                        background: saveOk ? "#dafbe1" : "var(--gl-surface)",
                        border: `1px solid ${saveOk ? "#1a7f37" : "var(--gl-border)"}`,
                        color: saveOk ? "#1a7f37" : "var(--gl-ink-3)",
                        opacity: savePending ? 0.7 : 1,
                        cursor: savePending ? "not-allowed" : "pointer",
                      }}
                    >
                      {saveOk ? <CheckCircle className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                      {saveOk ? "Guardado" : savePending ? "Guardando…" : "Guardar"}
                    </button>
                    <button
                      type="button"
                      onClick={handleActualizarCV}
                      disabled={savePending || updatePending}
                      className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[12px] font-semibold transition-opacity"
                      style={{
                        background: updateOk ? "#1a7f37" : "var(--gl-olive)",
                        color: "#fff",
                        border: "none",
                        opacity: updatePending ? 0.8 : 1,
                        cursor: updatePending ? "not-allowed" : "pointer",
                      }}
                    >
                      <RefreshCw className="h-3.5 w-3.5" style={{ animation: updatePending ? "spin 1s linear infinite" : "none" }} />
                      {updateOk ? "CV actualizado ✓" : updatePending ? "Actualizando…" : "Actualizar CV"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Acciones */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={addPregunta}
            className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-xl transition-opacity hover:opacity-70"
            style={{
              background: "var(--gl-surface)",
              border: "1px solid var(--gl-border)",
              color: "var(--gl-ink-3)",
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Agregar pregunta
          </button>

          <button
            type="button"
            onClick={handleGenerarMensaje}
            disabled={preguntas.filter((p) => p.trim()).length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-opacity"
            style={{
              background: "var(--gl-olive)",
              color: "#fff",
              opacity: preguntas.filter((p) => p.trim()).length === 0 ? 0.4 : 1,
              cursor: preguntas.filter((p) => p.trim()).length === 0 ? "not-allowed" : "pointer",
            }}
          >
            <MessageCircle className="h-4 w-4" />
            Generar mensaje
          </button>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(13,17,23,0.5)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false) }}
        >
          <div
            className="w-full rounded-2xl p-8 flex flex-col gap-4"
            style={{ background: "#ffffff", boxShadow: "0 8px 32px rgba(13,17,23,0.18)", width: "min(860px, 94vw)", height: "88vh", overflowY: "auto" }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-bold" style={{ color: "var(--gl-ink)" }}>
                Mensaje para {nombre}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg hover:opacity-70"
                style={{ color: "var(--gl-ink-3)" }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Aviso nota */}
            <div
              className="rounded-xl px-3 py-2.5"
              style={{ background: "#fff8c5", border: "1px solid #f0c000" }}
            >
              <span style={{ color: "#7d4e00", fontSize: "11px", lineHeight: 1.5 }}>
                Recorda borrar la nota al pie antes de enviar.
              </span>
            </div>

            {/* Textarea editable */}
            <textarea
              value={mensajeEnModal}
              onChange={(e) => setMensajeEnModal(e.target.value)}
              rows={24}
              className="w-full rounded-xl px-4 py-3 text-sm font-mono resize-y outline-none"
              style={{
                background: "var(--gl-surface)",
                border: "1px solid var(--gl-border)",
                color: "var(--gl-ink)",
                lineHeight: 1.6,
              }}
            />

            {/* Botones */}
            <div className="flex flex-col gap-2">
              {/* Acción principal: abrir + marcar */}
              <button
                type="button"
                onClick={handleEnviarYMarcar}
                disabled={sinTelefono || isPending}
                title={sinTelefono ? "El candidato no tiene teléfono registrado" : undefined}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold"
                style={{
                  background: sinTelefono ? "var(--gl-surface)" : "#25D366",
                  color: sinTelefono ? "var(--gl-ink-3)" : "#fff",
                  border: sinTelefono ? "1px solid var(--gl-border)" : "none",
                  opacity: isPending ? 0.7 : 1,
                  cursor: sinTelefono ? "not-allowed" : "pointer",
                }}
              >
                <MessageCircle className="h-4 w-4" />
                {isPending ? "Abriendo..." : "Abrir en WhatsApp y marcar como enviado"}
              </button>

              {/* Secundario: solo abrir */}
              <button
                type="button"
                onClick={handleSoloAbrir}
                disabled={sinTelefono || isPending}
                className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-[12.5px] font-medium"
                style={{
                  background: "transparent",
                  color: "var(--gl-ink-3)",
                  border: "1px solid var(--gl-border)",
                  cursor: sinTelefono ? "not-allowed" : "pointer",
                }}
              >
                Solo abrir (sin marcar como enviado)
              </button>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-[12px] text-center py-1"
                style={{ color: "var(--gl-ink-3)", background: "none", border: "none", cursor: "pointer" }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
