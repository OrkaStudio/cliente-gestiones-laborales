"use client"

import { useState } from "react"
import { CheckCircle } from "lucide-react"
import { generarMensajeWhatsapp, waUrl } from "@/lib/cv/utils"
import {
  generarPreguntasParaCampos,
  registrarEnvioWhatsapp,
  type CampoPendiente,
} from "@/lib/actions/candidatos"
import type { Tables } from "@/lib/supabase/types"

type Candidato   = Tables<"candidatos">
type Experiencia = Tables<"experiencia_laboral">

const CAMPOS: { key: keyof Candidato; label: string; grupo: string }[] = [
  { key: "lugar_nacimiento",     label: "Lugar de nacimiento",  grupo: "Personal"    },
  { key: "estado_civil",         label: "Estado civil",         grupo: "Personal"    },
  { key: "hijos",                label: "Hijos",                grupo: "Personal"    },
  { key: "disponibilidad",       label: "Disponibilidad",       grupo: "Condiciones" },
  { key: "pretension_salarial",  label: "Pretensión salarial",  grupo: "Condiciones" },
  { key: "movilidad",            label: "Movilidad",            grupo: "Condiciones" },
  { key: "vehiculo_propio",      label: "Vehículo propio",      grupo: "Condiciones" },
  { key: "licencia_conducir",    label: "Licencia de conducir", grupo: "Condiciones" },
  { key: "muebles_propios",      label: "Muebles propios",      grupo: "Campo"       },
  { key: "animales",             label: "Animales",             grupo: "Campo"       },
  { key: "hectareas_max",        label: "Hectáreas máx.",       grupo: "Capacidad"   },
  { key: "personal_a_cargo_max", label: "Personal a cargo",     grupo: "Capacidad"   },
]

function isMissing(val: unknown): boolean {
  return val === null || val === undefined || val === ""
}

type ExpCampo = { id: string; label: string }

function getExpCampos(exp: Experiencia): ExpCampo[] {
  const r: ExpCampo[] = []
  if (isMissing(exp.ubicacion))
    r.push({ id: "ubicacion", label: "Ubicación" })
  if (isMissing(exp.dimension_establecimiento))
    r.push({ id: "dimension_establecimiento", label: "Tamaño establecimiento" })
  if (exp.en_blanco === null)
    r.push({ id: "en_blanco", label: "En blanco" })
  if (isMissing(exp.motivo_cambio_o_salida) && exp.hasta !== null)
    r.push({ id: "motivo_cambio_o_salida", label: "Motivo de salida" })
  if (exp.hasta === null) {
    if (isMissing(exp.ingresos_actuales)) r.push({ id: "ingresos_actuales", label: "Ingresos actuales" })
    if (isMissing(exp.beneficios))        r.push({ id: "beneficios",        label: "Beneficios"       })
  }
  return r
}

// Item in activo state: a selectable chip backed by a generated question
interface ItemActivo {
  key: string      // "candidato:field" | "exp:N:field" | "q:N"
  label: string    // campo label or truncated question text
  pregunta: string // full question to include in message
  grupo?: string   // for campo mode grouping
}

interface Props {
  candidato:           Candidato
  experiencia:         Experiencia[]
  candidatoId:         string
  nombre:              string
  telefono:            string | null
  preguntas_sugeridas: string[]
  fecha_consultado:    string | null
}

type Estado = "idle" | "cargando" | "activo"

const CHIP_BASE: React.CSSProperties = {
  fontSize: 11.5, borderRadius: 6, padding: "2px 8px",
  border: "1px solid #d4e0c4", cursor: "pointer",
  background: "#edf2e6", color: "#5a6e48",
  fontWeight: 400,
}

const CHIP_SEL: React.CSSProperties = {
  ...CHIP_BASE,
  background: "var(--gl-olive)", color: "#fff",
  border: "1px solid var(--gl-olive)", fontWeight: 600,
}

export function CamposPendientesPanel({
  candidato,
  experiencia,
  candidatoId,
  nombre,
  telefono,
  preguntas_sugeridas,
  fecha_consultado,
}: Props) {
  const [estado, setEstado]             = useState<Estado>("idle")
  const [items, setItems]               = useState<ItemActivo[]>([])
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [mensajeTexto, setMensajeTexto] = useState("")
  const [enviado, setEnviado]           = useState(false)
  const [sendPending, setSendPending]   = useState(false)
  const [error, setError]               = useState<string | null>(null)

  // ── Compute pending campos ──────────────────────────────────────────────────

  const pendientes = CAMPOS.filter((c) => isMissing(candidato[c.key]))

  const expPendientes: { expIndex: number; empresa: string; campo: ExpCampo }[] = []
  experiencia.forEach((exp, i) => {
    getExpCampos(exp).forEach((campo) => {
      expPendientes.push({ expIndex: i, empresa: exp.empresa ?? `Exp ${i + 1}`, campo })
    })
  })

  const total = pendientes.length + expPendientes.length
  if (total === 0) return null

  // ── Chip toggle helpers ─────────────────────────────────────────────────────

  function recalcMensaje(sel: Set<string>, allItems: ItemActivo[]) {
    const pregs = [...sel]
      .map((k) => allItems.find((it) => it.key === k)?.pregunta)
      .filter((p): p is string => !!p)
    setMensajeTexto(generarMensajeWhatsapp(nombre, pregs))
  }

  function toggleItem(key: string, allItems: ItemActivo[]) {
    setSeleccionados((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      recalcMensaje(next, allItems)
      return next
    })
  }

  // ── Prepare questions ───────────────────────────────────────────────────────

  async function handlePreparar() {
    // First contact: use parse-time suggestions as flat selectable list
    if (!fecha_consultado && preguntas_sugeridas.length > 0) {
      const allItems: ItemActivo[] = preguntas_sugeridas.map((p, i) => ({
        key: `q:${i}`,
        label: p,
        pregunta: p,
      }))
      setItems(allItems)
      setSeleccionados(new Set())
      setMensajeTexto("")
      setEstado("activo")
      return
    }

    // Subsequent cycles: call Haiku for all pending campos
    setError(null)
    setEstado("cargando")

    const camposPendientes: CampoPendiente[] = [
      ...pendientes.map((c) => ({
        tipo: "candidato" as const,
        campo: c.key as string,
        label: c.label,
      })),
      ...expPendientes.map((ep) => ({
        tipo: "experiencia" as const,
        expIndex: ep.expIndex,
        empresa: ep.empresa,
        campo: ep.campo.id,
        label: ep.campo.label,
      })),
    ]

    const result = await generarPreguntasParaCampos(candidatoId, camposPendientes)

    if (!result.success) {
      setError(result.error)
      setEstado("idle")
      return
    }

    const pregByKey = new Map(result.preguntas.map((p) => [p.campo, p.pregunta]))

    const allItems: ItemActivo[] = [
      ...pendientes.flatMap((c) => {
        const key = `candidato:${c.key}`
        const pregunta = pregByKey.get(key)
        if (!pregunta) return []
        return [{ key, label: c.label, pregunta, grupo: c.grupo }]
      }),
      ...expPendientes.flatMap((ep) => {
        const key = `exp:${ep.expIndex}:${ep.campo.id}`
        const pregunta = pregByKey.get(key)
        if (!pregunta) return []
        return [{ key, label: `${ep.empresa}: ${ep.campo.label}`, pregunta, grupo: "Experiencia laboral" }]
      }),
    ]

    setItems(allItems)
    setSeleccionados(new Set())
    setMensajeTexto("")
    setEstado("activo")
  }

  // ── Send handlers ───────────────────────────────────────────────────────────

  async function handleEnviar() {
    if (!telefono || !mensajeTexto.trim() || sendPending) return
    setSendPending(true)
    const preguntasTexto = [...seleccionados]
      .map((k) => items.find((it) => it.key === k)?.pregunta)
      .filter((p): p is string => !!p)
    await registrarEnvioWhatsapp(candidatoId, mensajeTexto, preguntasTexto)
    const url = `${waUrl(telefono)}?text=${encodeURIComponent(mensajeTexto)}`
    window.open(url, "_blank")
    setSendPending(false)
    setEnviado(true)
  }

  function handleCopiar() {
    if (mensajeTexto.trim()) navigator.clipboard.writeText(mensajeTexto)
  }

  function handleReset() {
    setEstado("idle")
    setItems([])
    setSeleccionados(new Set())
    setMensajeTexto("")
    setEnviado(false)
    setError(null)
  }

  // ── Chip renderer ───────────────────────────────────────────────────────────

  function Chip({ item }: { item: ItemActivo }) {
    const sel = seleccionados.has(item.key)
    return (
      <button
        type="button"
        onClick={() => toggleItem(item.key, items)}
        style={sel ? CHIP_SEL : CHIP_BASE}
      >
        {sel ? "✓ " : ""}{item.label}
      </button>
    )
  }

  // ── Panel wrapper ───────────────────────────────────────────────────────────

  const panelStyle: React.CSSProperties = {
    background: "#fafbf8", border: "1px solid #e2e8d9", borderRadius: 12, padding: "14px 18px",
  }

  const headerLabel = (
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#6b7c5a" }}>
      Pendiente de completar
    </div>
  )

  const totalBadge = (
    <span style={{ fontSize: 11, fontWeight: 700, color: "#8b9e73", background: "#e8f0df", padding: "2px 8px", borderRadius: 20 }}>
      {total} campo{total !== 1 ? "s" : ""}
    </span>
  )

  // ── CARGANDO ────────────────────────────────────────────────────────────────

  if (estado === "cargando") {
    return (
      <div style={panelStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          {headerLabel}{totalBadge}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0" }}>
          <div style={{
            width: 18, height: 18, borderRadius: "50%",
            border: "2px solid #e2e8d9", borderTopColor: "#2a4a18",
            animation: "spin 0.9s linear infinite", flexShrink: 0,
          }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <span style={{ fontSize: 12, color: "#6b7c5a" }}>
            Generando preguntas para los campos pendientes…
          </span>
        </div>
      </div>
    )
  }

  // ── ACTIVO ──────────────────────────────────────────────────────────────────

  if (estado === "activo") {
    const esModoparse = items[0]?.key.startsWith("q:")

    // Grouped display for campo mode
    const grupos = esModoparse ? [] : Array.from(
      new Set(items.filter((it) => !it.key.startsWith("exp:")).map((it) => it.grupo ?? "Otro"))
    )

    return (
      <div style={panelStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          {headerLabel}
          <button
            type="button"
            onClick={handleReset}
            style={{ fontSize: 11, color: "#8b9e73", background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}
          >
            ← volver
          </button>
        </div>

        {/* Chips */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
          {esModoparse ? (
            // First-contact mode: one chip per question, listed vertically
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {items.map((item) => (
                <Chip key={item.key} item={item} />
              ))}
            </div>
          ) : (
            // Campo mode: grouped chips
            <>
              {grupos.map((grupo) => {
                const grupoItems = items.filter((it) => it.grupo === grupo && !it.key.startsWith("exp:"))
                if (!grupoItems.length) return null
                return (
                  <div key={grupo}>
                    <div style={{ fontSize: 9.5, fontWeight: 600, color: "#8b9e73", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 5 }}>
                      {grupo}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {grupoItems.map((item) => <Chip key={item.key} item={item} />)}
                    </div>
                  </div>
                )
              })}
              {items.filter((it) => it.key.startsWith("exp:")).length > 0 && (
                <div>
                  <div style={{ fontSize: 9.5, fontWeight: 600, color: "#8b9e73", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 5 }}>
                    Experiencia laboral
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {items.filter((it) => it.key.startsWith("exp:")).map((item) => <Chip key={item.key} item={item} />)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Message preview */}
        <div style={{ borderTop: "1px solid #e2e8d9", paddingTop: 12 }}>
          <div style={{ fontSize: 9.5, fontWeight: 600, color: "#8b9e73", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
            Vista previa del mensaje
          </div>

          {seleccionados.size === 0 ? (
            <p style={{ fontSize: 11.5, color: "#8b9e73", fontStyle: "italic", marginBottom: 10, marginTop: 0 }}>
              Seleccioná los campos para armar el mensaje
            </p>
          ) : (
            <textarea
              value={mensajeTexto}
              onChange={(e) => setMensajeTexto(e.target.value)}
              rows={8}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{
                background: "var(--gl-surface)",
                border: "1.5px solid var(--gl-olive)",
                color: "var(--gl-ink)",
                fontFamily: "inherit",
                lineHeight: 1.6,
                resize: "vertical",
                width: "100%",
                boxSizing: "border-box",
                marginBottom: 10,
                display: "block",
              }}
            />
          )}

          {enviado ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#dafbe1", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CheckCircle style={{ width: 14, height: 14, color: "#1a7f37" }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#1a7f37" }}>
                Enviado — {new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={handleCopiar}
                disabled={seleccionados.size === 0}
                style={{
                  fontSize: 12, fontWeight: 600,
                  color: "var(--gl-ink-3)",
                  background: "var(--gl-surface)",
                  border: "1px solid var(--gl-border)",
                  borderRadius: 8, padding: "6px 14px",
                  cursor: seleccionados.size === 0 ? "not-allowed" : "pointer",
                  opacity: seleccionados.size === 0 ? 0.5 : 1,
                }}
              >
                Solo copiar
              </button>
              <button
                type="button"
                onClick={() => { void handleEnviar() }}
                disabled={sendPending || seleccionados.size === 0 || !telefono}
                title={!telefono ? "El candidato no tiene teléfono registrado" : undefined}
                style={{
                  fontSize: 12, fontWeight: 600,
                  color: "#fff",
                  background: seleccionados.size === 0 || !telefono ? "#c8d9b8" : "var(--gl-olive)",
                  border: "none",
                  borderRadius: 8, padding: "6px 14px",
                  cursor: sendPending || seleccionados.size === 0 || !telefono ? "not-allowed" : "pointer",
                  opacity: sendPending ? 0.7 : 1,
                }}
              >
                {sendPending ? "Abriendo…" : "Abrir en WhatsApp y registrar →"}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── IDLE ────────────────────────────────────────────────────────────────────

  const grupos = Array.from(new Set(pendientes.map((p) => p.grupo)))
  const esPrimerContacto = !fecha_consultado && preguntas_sugeridas.length > 0

  return (
    <div style={panelStyle}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        {headerLabel}{totalBadge}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {grupos.map((grupo) => {
          const grupoCampos = pendientes.filter((p) => p.grupo === grupo)
          return (
            <div key={grupo}>
              <div style={{ fontSize: 9.5, fontWeight: 600, color: "#8b9e73", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 5 }}>
                {grupo}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {grupoCampos.map((c) => (
                  <span key={c.key as string} style={CHIP_BASE}>{c.label}</span>
                ))}
              </div>
            </div>
          )
        })}

        {expPendientes.length > 0 && (
          <div>
            <div style={{ fontSize: 9.5, fontWeight: 600, color: "#8b9e73", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 5 }}>
              Experiencia laboral
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {expPendientes.map((ep) => (
                <span key={`${ep.expIndex}:${ep.campo.id}`} style={CHIP_BASE}>
                  {ep.empresa}: {ep.campo.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && (
        <p style={{ fontSize: 11, color: "#c0392b", marginTop: 8, marginBottom: 0 }}>{error}</p>
      )}

      <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={() => { void handlePreparar() }}
          style={{
            fontSize: 12, fontWeight: 600,
            color: "var(--gl-olive)",
            background: "var(--gl-olive-bg)",
            border: "1px solid rgba(42,74,24,0.2)",
            borderRadius: 8, padding: "6px 14px",
            cursor: "pointer",
          }}
        >
          {esPrimerContacto ? "Revisar preguntas del parseo →" : "Preparar preguntas →"}
        </button>
      </div>
    </div>
  )
}
