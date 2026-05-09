"use client"

import { useState, useTransition } from "react"
import { MessageCircle, ChevronDown, ChevronUp, Plus, Trash2, X } from "lucide-react"
import { generarMensajeWhatsapp, waUrl } from "@/lib/cv/utils"
import { registrarEnvioWhatsapp } from "@/lib/actions/candidatos"

interface Props {
  candidatoId: string
  nombre: string
  telefono: string | null
  preguntas_sugeridas: string[]
  fecha_consultado: string | null
  mensaje_whatsapp: string | null
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
}: Props) {
  const [preguntas, setPreguntas] = useState(preguntas_sugeridas)
  const [modalOpen, setModalOpen] = useState(false)
  const [mensajeEnModal, setMensajeEnModal] = useState("")
  const [showOriginal, setShowOriginal] = useState(false)
  const [isPending, startTransition] = useTransition()

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

  function handleEnviar() {
    if (sinTelefono) return
    startTransition(async () => {
      await registrarEnvioWhatsapp(candidatoId, mensajeEnModal)
      const url = `${waUrl(telefono!)}?text=${encodeURIComponent(mensajeEnModal)}`
      window.open(url, "_blank")
      setModalOpen(false)
    })
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

            {/* Botón enviar */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium"
                style={{ color: "var(--gl-ink-3)" }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleEnviar}
                disabled={sinTelefono || isPending}
                title={sinTelefono ? "El candidato no tiene telefono registrado" : undefined}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
                style={{
                  background: sinTelefono ? "var(--gl-surface)" : "#25D366",
                  color: sinTelefono ? "var(--gl-ink-3)" : "#fff",
                  border: sinTelefono ? "1px solid var(--gl-border)" : "none",
                  opacity: isPending ? 0.7 : 1,
                  cursor: sinTelefono ? "not-allowed" : "pointer",
                }}
              >
                <MessageCircle className="h-4 w-4" />
                {isPending ? "Abriendo..." : "Abrir en WhatsApp"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
