"use client"

import { useState, useTransition } from "react"
import { MessageCircle, ChevronDown, ChevronUp } from "lucide-react"
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
  const mensajeInicial = mensaje_whatsapp ?? generarMensajeWhatsapp(nombre, preguntas_sugeridas)
  const [mensaje, setMensaje] = useState(mensajeInicial)
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

  function handleEnviar() {
    if (sinTelefono) return
    startTransition(async () => {
      await registrarEnvioWhatsapp(candidatoId, mensaje)
      const url = `${waUrl(telefono!)}?text=${encodeURIComponent(mensaje)}`
      window.open(url, "_blank")
    })
  }

  return (
    <div className="rounded-2xl border p-6" style={CARD}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[15px] font-bold" style={{ color: "var(--gl-ink)" }}>
            Mensaje WhatsApp
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--gl-ink-3)" }}>
            Editá el mensaje antes de enviarlo al candidato
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

      {/* Mensaje enviado colapsable (solo si ya fue consultado) */}
      {fecha_consultado && mensaje_whatsapp && (
        <>
          <button
            type="button"
            onClick={() => setShowOriginal((v) => !v)}
            className="flex items-center gap-1.5 text-[11px] font-medium mb-3"
            style={{ color: "var(--gl-ink-3)" }}
          >
            {showOriginal
              ? <ChevronUp className="h-3 w-3" />
              : <ChevronDown className="h-3 w-3" />}
            {showOriginal ? "Ocultar mensaje enviado" : "Ver mensaje que se envió"}
          </button>

          {showOriginal && (
            <pre
              className="text-xs rounded-xl p-4 mb-4 whitespace-pre-wrap font-sans leading-relaxed"
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

      {/* Aviso nota al pie */}
      <div
        className="flex items-start gap-2 rounded-xl px-3 py-2.5 mb-3"
        style={{ background: "#fff8c5", border: "1px solid #f0c000" }}
      >
        <span style={{ color: "#7d4e00", fontSize: "11px", lineHeight: 1.5 }}>
          ⚠️ Recordá borrar la nota al pie antes de enviar.
        </span>
      </div>

      {/* Textarea editable */}
      <textarea
        value={mensaje}
        onChange={(e) => setMensaje(e.target.value)}
        rows={10}
        className="w-full rounded-xl px-4 py-3 text-sm font-mono resize-y outline-none"
        style={{
          background: "var(--gl-surface)",
          border: "1px solid var(--gl-border)",
          color: "var(--gl-ink)",
          lineHeight: 1.6,
        }}
      />

      {/* Botón */}
      <div className="flex items-center justify-end mt-3">
        <button
          type="button"
          onClick={handleEnviar}
          disabled={sinTelefono || isPending}
          title={sinTelefono ? "El candidato no tiene teléfono registrado" : undefined}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-opacity"
          style={{
            background: sinTelefono ? "var(--gl-surface)" : "#25D366",
            color: sinTelefono ? "var(--gl-ink-3)" : "#fff",
            border: sinTelefono ? "1px solid var(--gl-border)" : "none",
            opacity: isPending ? 0.7 : 1,
            cursor: sinTelefono ? "not-allowed" : "pointer",
          }}
        >
          <MessageCircle className="h-4 w-4" />
          {isPending ? "Abriendo…" : "Abrir en WhatsApp"}
        </button>
      </div>
    </div>
  )
}
