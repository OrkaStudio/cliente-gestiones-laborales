"use client"

import { useState, useTransition } from "react"
import { MessageSquare, Save, RefreshCw, CheckCircle } from "lucide-react"
import { guardarRespuestas, actualizarCVConRespuestas } from "@/lib/actions/candidatos"

interface Props {
  candidatoId:       string
  preguntas:         string[]
  initialRespuestas: { pregunta: string; respuesta: string }[] | null
}

const OLIVE    = "#2a4a18"
const OLIVE_BG = "#eef5e8"
const INK      = "#0d1117"
const INK3     = "#8b949e"
const BORDER   = "#eaecef"
const BORDER_MD = "#d4d8de"

export function RespuestasPanel({ candidatoId, preguntas, initialRespuestas }: Props) {
  const [answers, setAnswers] = useState<string[]>(() => {
    return preguntas.map((p) => {
      const found = initialRespuestas?.find((r) => r.pregunta === p)
      return found?.respuesta ?? ""
    })
  })

  const [savePending,   startSave]   = useTransition()
  const [updatePending, startUpdate] = useTransition()
  const [saveOk,   setSaveOk]   = useState(false)
  const [updateOk, setUpdateOk] = useState(false)
  const [saveErr,   setSaveErr]   = useState<string | null>(null)
  const [updateErr, setUpdateErr] = useState<string | null>(null)

  if (!preguntas.length) {
    return (
      <div
        style={{
          display:       "flex",
          flexDirection: "column",
          alignItems:    "center",
          justifyContent:"center",
          padding:       "4rem 2rem",
          textAlign:     "center",
          gap:           "0.75rem",
        }}
      >
        <MessageSquare style={{ width: 32, height: 32, color: INK3, opacity: 0.4 }} />
        <p style={{ fontSize: 14, fontWeight: 600, color: INK }}>Sin preguntas sugeridas</p>
        <p style={{ fontSize: 13, color: INK3, maxWidth: 320 }}>
          Procesá el CV del candidato para generar preguntas de preselección automáticamente.
        </p>
      </div>
    )
  }

  function handleSave() {
    setSaveErr(null)
    setSaveOk(false)
    startSave(async () => {
      const payload = preguntas.map((p, i) => ({ pregunta: p, respuesta: answers[i] ?? "" }))
      const result = await guardarRespuestas(candidatoId, payload)
      if (result.success) {
        setSaveOk(true)
        setTimeout(() => setSaveOk(false), 2500)
      } else {
        setSaveErr(result.error)
      }
    })
  }

  function handleUpdate() {
    setUpdateErr(null)
    setUpdateOk(false)
    startUpdate(async () => {
      // Guardar primero para que la action lea los datos actualizados
      const payload = preguntas.map((p, i) => ({ pregunta: p, respuesta: answers[i] ?? "" }))
      await guardarRespuestas(candidatoId, payload)
      const result = await actualizarCVConRespuestas(candidatoId)
      if (result.success) {
        setUpdateOk(true)
        setTimeout(() => setUpdateOk(false), 3000)
      } else {
        setUpdateErr(result.error)
      }
    })
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* Preguntas */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {preguntas.map((pregunta, i) => (
          <div
            key={i}
            style={{
              background:   "#fff",
              border:       `1px solid ${BORDER}`,
              borderRadius: "0.75rem",
              padding:      "1.25rem",
            }}
          >
            <label
              style={{
                display:       "block",
                fontSize:      12,
                fontWeight:    700,
                color:         OLIVE,
                letterSpacing: "0.05em",
                marginBottom:  "0.5rem",
              }}
            >
              {i + 1}. {pregunta}
            </label>
            <textarea
              value={answers[i] ?? ""}
              onChange={(e) => {
                const next = [...answers]
                next[i] = e.target.value
                setAnswers(next)
              }}
              rows={3}
              placeholder="Escribí la respuesta del candidato..."
              style={{
                width:        "100%",
                border:       `1px solid ${BORDER_MD}`,
                borderRadius: "0.5rem",
                padding:      "0.5rem 0.75rem",
                fontSize:     "13.5px",
                fontFamily:   "inherit",
                color:        INK,
                background:   "#f9fafb",
                resize:       "vertical",
                outline:      "none",
                transition:   "border-color 0.15s, box-shadow 0.15s",
                boxSizing:    "border-box",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = OLIVE
                e.currentTarget.style.boxShadow = `0 0 0 3px ${OLIVE_BG}`
                e.currentTarget.style.background = "#fff"
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = BORDER_MD
                e.currentTarget.style.boxShadow = "none"
                e.currentTarget.style.background = "#f9fafb"
              }}
            />
          </div>
        ))}
      </div>

      {/* Errores */}
      {(saveErr || updateErr) && (
        <div
          style={{
            fontSize:     13,
            color:        "#cf222e",
            background:   "#ffebe9",
            border:       "1px solid #f1aeb5",
            borderRadius: "0.5rem",
            padding:      "0.625rem 0.875rem",
          }}
        >
          {saveErr ?? updateErr}
        </div>
      )}

      {/* Acciones */}
      <div
        style={{
          display:        "flex",
          gap:            "0.75rem",
          justifyContent: "flex-end",
          flexWrap:       "wrap",
          paddingTop:     "0.5rem",
          borderTop:      `1px solid ${BORDER}`,
        }}
      >
        <button
          type="button"
          onClick={handleSave}
          disabled={savePending || updatePending}
          style={{
            display:     "inline-flex",
            alignItems:  "center",
            gap:         "0.375rem",
            padding:     "0.5rem 1rem",
            fontSize:    "13.5px",
            fontWeight:  600,
            color:       saveOk ? "#1a7f37" : INK3,
            background:  "transparent",
            border:      `1px solid ${saveOk ? "#dafbe1" : BORDER_MD}`,
            borderRadius:"0.75rem",
            cursor:      savePending ? "not-allowed" : "pointer",
            transition:  "all 0.15s",
            opacity:     savePending ? 0.7 : 1,
          }}
        >
          {saveOk
            ? <><CheckCircle style={{ width: 14, height: 14 }} /> Guardado</>
            : <><Save style={{ width: 14, height: 14 }} /> {savePending ? "Guardando…" : "Guardar respuestas"}</>
          }
        </button>

        <button
          type="button"
          onClick={handleUpdate}
          disabled={savePending || updatePending}
          style={{
            display:     "inline-flex",
            alignItems:  "center",
            gap:         "0.375rem",
            padding:     "0.5rem 1.25rem",
            fontSize:    "13.5px",
            fontWeight:  600,
            color:       "#fff",
            background:  updateOk ? "#1a7f37" : OLIVE,
            border:      "none",
            borderRadius:"0.75rem",
            cursor:      updatePending ? "not-allowed" : "pointer",
            opacity:     updatePending ? 0.8 : 1,
            transition:  "all 0.15s",
          }}
        >
          <RefreshCw style={{ width: 14, height: 14, animation: updatePending ? "spin 1s linear infinite" : "none" }} />
          {updateOk ? "CV actualizado" : updatePending ? "Actualizando CV…" : "Actualizar CV con respuestas"}
        </button>
      </div>
    </div>
  )
}
