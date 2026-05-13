"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CheckCircle, RefreshCw, PauseCircle, X, Loader2 } from "lucide-react"
import { cerrarGarantia } from "@/lib/actions/busquedas"

const INK = "#0d1117"
const INK3 = "#8b949e"
const BORDER = "#eaecef"
const BORDER_MD = "#d4d8de"
const OLIVE = "#2a4a18"
const OLIVE_BG = "#eef5e8"

type Decision = "exitosa" | "reabrir" | "pausar"

const OPCIONES: { value: Decision; label: string; desc: string; icon: typeof CheckCircle; color: string; bg: string }[] = [
  {
    value: "exitosa",
    label: "Cerrar exitosamente",
    desc: "El candidato funcionó. Se archiva la búsqueda.",
    icon: CheckCircle,
    color: "#1a7f37",
    bg: "#dafbe1",
  },
  {
    value: "reabrir",
    label: "Reabrir búsqueda",
    desc: "El candidato no funcionó. Hay que reemplazarlo.",
    icon: RefreshCw,
    color: "#9a6700",
    bg: "#fff8c5",
  },
  {
    value: "pausar",
    label: "Pausar",
    desc: "Caso intermedio. Queda pausada para decidir después.",
    icon: PauseCircle,
    color: "#0550ae",
    bg: "#ddf4ff",
  },
]

interface GarantiaDialogProps {
  busquedaId: string
  puesto: string
  cliente: string
  open: boolean
  onClose: () => void
}

export function GarantiaDialog({ busquedaId, puesto, cliente, open, onClose }: GarantiaDialogProps) {
  const [decision, setDecision] = useState<Decision | null>(null)
  const [notas, setNotas] = useState("")
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  if (!open) return null

  function handleConfirm() {
    if (!decision) return
    startTransition(async () => {
      const result = await cerrarGarantia(busquedaId, decision, notas)
      if (!result.success) {
        toast.error("Error al procesar la garantía")
        return
      }
      const msg =
        decision === "exitosa"
          ? "Búsqueda archivada exitosamente"
          : decision === "reabrir"
            ? "Búsqueda reabierta"
            : "Búsqueda pausada"
      toast.success(msg)
      router.refresh()
      onClose()
      setDecision(null)
      setNotas("")
    })
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      {/* Overlay */}
      <div
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }}
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        style={{
          position: "relative",
          background: "#ffffff",
          borderRadius: "1rem",
          width: "min(100%, 480px)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          display: "flex",
          flexDirection: "column",
          gap: 0,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: `1px solid ${BORDER}`,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "1rem",
          }}
        >
          <div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: INK }}>
              Resolver garantía
            </div>
            <div style={{ fontSize: "12.5px", color: INK3, marginTop: "2px" }}>
              {puesto} · {cliente}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: INK3, padding: "2px" }}
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Opciones */}
        <div style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: INK3, marginBottom: "0.25rem" }}>
            ¿Qué pasó con esta búsqueda?
          </div>
          {OPCIONES.map((op) => {
            const Icon = op.icon
            const selected = decision === op.value
            return (
              <button
                key={op.value}
                onClick={() => setDecision(op.value)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.875rem",
                  padding: "0.875rem 1rem",
                  borderRadius: "0.75rem",
                  border: selected ? `2px solid ${op.color}` : `2px solid ${BORDER}`,
                  background: selected ? op.bg : "#ffffff",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s",
                  width: "100%",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: selected ? op.bg : "#f6f8fa",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon style={{ width: 18, height: 18, color: selected ? op.color : INK3 }} />
                </div>
                <div>
                  <div style={{ fontSize: "13.5px", fontWeight: 600, color: selected ? op.color : INK }}>
                    {op.label}
                  </div>
                  <div style={{ fontSize: "12px", color: INK3, marginTop: "1px" }}>
                    {op.desc}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Notas */}
        <div style={{ padding: "0 1.5rem 1.25rem" }}>
          <label style={{ display: "block", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: INK3, marginBottom: "0.375rem" }}>
            Notas del cierre <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(opcional)</span>
          </label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={3}
            placeholder="¿Qué pasó? Feedback del cliente, motivo de la decisión..."
            style={{
              width: "100%",
              border: `1px solid ${BORDER_MD}`,
              borderRadius: "0.5rem",
              padding: "0.5rem 0.75rem",
              fontSize: "13.5px",
              fontFamily: "inherit",
              color: INK,
              resize: "none",
              outline: "none",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = OLIVE
              e.currentTarget.style.boxShadow = `0 0 0 3px ${OLIVE_BG}`
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = BORDER_MD
              e.currentTarget.style.boxShadow = "none"
            }}
          />
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "1rem 1.5rem",
            borderTop: `1px solid ${BORDER}`,
            display: "flex",
            justifyContent: "flex-end",
            gap: "0.75rem",
          }}
        >
          <button
            onClick={onClose}
            style={{ padding: "0.5rem 1rem", fontSize: "13.5px", color: INK3, background: "transparent", border: "none", cursor: "pointer" }}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!decision || pending}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.375rem",
              padding: "0.5rem 1.25rem",
              fontSize: "13.5px",
              fontWeight: 600,
              color: "#ffffff",
              background: !decision ? "#d4d8de" : OLIVE,
              border: "none",
              borderRadius: "0.75rem",
              cursor: !decision || pending ? "not-allowed" : "pointer",
              opacity: pending ? 0.8 : 1,
              transition: "background 0.15s",
            }}
          >
            {pending && <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />}
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
