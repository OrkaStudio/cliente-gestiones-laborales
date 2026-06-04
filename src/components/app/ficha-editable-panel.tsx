"use client"

import { useState, useTransition, useRef } from "react"
import { Pencil, Check, X } from "lucide-react"
import { updateCandidatoFields } from "@/lib/actions/candidatos"

interface Props {
  candidatoId: string
  disponibilidad:     string | null
  pretension_salarial: string | null
  vehiculo_propio:    boolean | null
  vehiculo_detalle:   string | null
  licencia_conducir:  boolean | null
  estado_civil:       string | null
  hijos:              string | null
  edad:               number | null
}

type TextField = "disponibilidad" | "pretension_salarial" | "estado_civil" | "hijos" | "vehiculo_detalle"
type BoolField  = "vehiculo_propio" | "licencia_conducir"
type EditField  = TextField | BoolField

const CARD = {
  background:  "#ffffff",
  borderColor: "var(--gl-border)",
  boxShadow:   "0 2px 8px rgba(13,17,23,0.05)",
} as const

function boolToStr(v: boolean | null) {
  if (v === true)  return "true"
  if (v === false) return "false"
  return "null"
}

function boolDisplay(v: boolean | null) {
  if (v === true)  return { text: "Sí",  positive: true }
  if (v === false) return { text: "No",  negative: true }
  return { text: "—", muted: true }
}

const TEXT_FIELDS: TextField[]  = ["disponibilidad", "pretension_salarial", "estado_civil", "hijos", "vehiculo_detalle"]
const BOOL_FIELDS: BoolField[]  = ["vehiculo_propio", "licencia_conducir"]

const LABELS: Record<EditField, string> = {
  disponibilidad:      "Disponibilidad",
  pretension_salarial: "Pretensión",
  estado_civil:        "Estado civil",
  hijos:               "Hijos",
  vehiculo_propio:     "Vehículo propio",
  vehiculo_detalle:    "Detalle vehículo",
  licencia_conducir:   "Licencia conducir",
}

export function FichaEditablePanel({
  candidatoId,
  edad,
  ...initial
}: Props) {
  type DataState = Omit<Props, "candidatoId" | "edad">
  const [data, setData] = useState<DataState>(initial)
  const [editing, setEditing]   = useState<EditField | null>(null)
  const [editVal, setEditVal]   = useState("")
  const [isPending, startTrans] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function startEdit(field: EditField) {
    const isBool = BOOL_FIELDS.includes(field as BoolField)
    const current = isBool
      ? boolToStr(data[field as BoolField] as boolean | null)
      : ((data[field as TextField] as string | null) ?? "")
    setEditing(field)
    setEditVal(current)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function cancelEdit() {
    setEditing(null)
    setEditVal("")
  }

  function commitEdit(field: EditField) {
    const isBool = BOOL_FIELDS.includes(field as BoolField)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: Record<string, any> = isBool
      ? { [field]: editVal === "null" ? null : editVal === "true" }
      : { [field]: editVal.trim() || null }

    setData((prev) => ({ ...prev, ...payload }))
    setEditing(null)
    startTrans(async () => {
      await updateCandidatoFields(candidatoId, payload)
    })
  }

  function handleKeyDown(e: React.KeyboardEvent, field: EditField) {
    if (e.key === "Enter") { e.preventDefault(); commitEdit(field) }
    if (e.key === "Escape") cancelEdit()
  }

  const allFields: EditField[] = [...TEXT_FIELDS, ...BOOL_FIELDS]
  const hasAnyData = allFields.some((f) => {
    const v = data[f as keyof DataState]
    return v !== null && v !== undefined
  }) || edad !== null

  if (!hasAnyData) return null

  return (
    <div className="rounded-2xl border p-5" style={CARD}>
      <div
        className="text-[10px] font-bold uppercase tracking-[0.18em] mb-4"
        style={{ color: "var(--gl-ink-3)" }}
      >
        Datos del candidato
      </div>

      <div
        style={{
          display:               "grid",
          gridTemplateColumns:   "repeat(auto-fill, minmax(160px, 1fr))",
          gap:                   "1rem 2.5rem",
        }}
      >
        {/* Edad — solo lectura */}
        {edad !== null && (
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: "var(--gl-ink-3)" }}>
              Edad
            </div>
            <div className="text-[13.5px] font-semibold" style={{ color: "var(--gl-ink)" }}>
              {edad} años
            </div>
          </div>
        )}

        {/* Campos editables */}
        {allFields.map((field) => {
          const isBool   = BOOL_FIELDS.includes(field as BoolField)
          const isEditing = editing === field
          const label    = LABELS[field]

          let displayText: string
          let positive = false
          let negative = false

          if (isBool) {
            const bd = boolDisplay(data[field as BoolField] as boolean | null)
            displayText = bd.text
            positive    = !!bd.positive
            negative    = !!bd.negative
          } else {
            displayText = (data[field as TextField] as string | null) ?? "—"
          }

          return (
            <div key={field} className="group">
              <div className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: "var(--gl-ink-3)" }}>
                {label}
              </div>

              {isEditing ? (
                <div className="flex items-center gap-1">
                  {isBool ? (
                    <select
                      value={editVal}
                      onChange={(e) => setEditVal(e.target.value)}
                      onBlur={() => commitEdit(field)}
                      onKeyDown={(e) => { if (e.key === "Escape") cancelEdit() }}
                      autoFocus
                      className="flex-1 rounded-lg px-2 py-1 text-[13px] outline-none"
                      style={{
                        border:     "1.5px solid var(--gl-olive)",
                        background: "var(--gl-surface)",
                        color:      "var(--gl-ink)",
                        fontFamily: "inherit",
                      }}
                    >
                      <option value="true">Sí</option>
                      <option value="false">No</option>
                      <option value="null">Sin datos</option>
                    </select>
                  ) : (
                    <input
                      ref={inputRef}
                      value={editVal}
                      onChange={(e) => setEditVal(e.target.value)}
                      onBlur={() => commitEdit(field)}
                      onKeyDown={(e) => handleKeyDown(e, field)}
                      placeholder="—"
                      className="flex-1 rounded-lg px-2 py-1 text-[13px] outline-none min-w-0"
                      style={{
                        border:     "1.5px solid var(--gl-olive)",
                        background: "var(--gl-surface)",
                        color:      "var(--gl-ink)",
                        fontFamily: "inherit",
                      }}
                    />
                  )}
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); commitEdit(field) }}
                    className="shrink-0 p-1 rounded-md"
                    style={{ color: "var(--gl-olive)" }}
                  >
                    <Check className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); cancelEdit() }}
                    className="shrink-0 p-1 rounded-md"
                    style={{ color: "var(--gl-ink-3)" }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => startEdit(field)}
                  className="flex items-center gap-1.5 text-left w-full group/btn"
                  style={{ background: "none", border: "none", padding: 0, cursor: "text" }}
                >
                  <span
                    className="text-[13.5px] font-semibold"
                    style={{
                      color: positive
                        ? "var(--gl-olive)"
                        : negative
                          ? "#cf222e"
                          : displayText === "—"
                            ? "var(--gl-ink-3)"
                            : "var(--gl-ink)",
                    }}
                  >
                    {displayText}
                  </span>
                  <Pencil
                    className="h-3 w-3 opacity-0 group-hover/btn:opacity-60 transition-opacity shrink-0"
                    style={{ color: "var(--gl-ink-3)" }}
                  />
                </button>
              )}
            </div>
          )
        })}
      </div>

      {isPending && (
        <div className="mt-3 text-[10.5px]" style={{ color: "var(--gl-ink-3)" }}>
          Guardando…
        </div>
      )}
    </div>
  )
}
