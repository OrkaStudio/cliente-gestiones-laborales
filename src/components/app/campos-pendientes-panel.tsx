"use client"

import { useState, useEffect } from "react"
import { CheckCircle, X, MessageCircle } from "lucide-react"
import { useRouter } from "next/navigation"
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
  if (isMissing(exp.empresa))
    r.push({ id: "empresa", label: "Nombre del establecimiento" })
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

interface ItemActivo {
  key: string
  label: string
  pregunta: string
  grupo?: string
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
  fontSize: 11.5, borderRadius: 6, padding: "3px 9px",
  border: "1px solid #d4e0c4", cursor: "pointer",
  background: "#edf2e6", color: "#5a6e48", fontWeight: 400,
  transition: "all 0.12s",
}
const CHIP_SEL: React.CSSProperties = {
  ...CHIP_BASE,
  background: "var(--gl-olive)", color: "#fff",
  border: "1px solid var(--gl-olive)", fontWeight: 600,
}

export function CamposPendientesPanel({
  candidato, experiencia, candidatoId, nombre, telefono,
  preguntas_sugeridas, fecha_consultado,
}: Props) {
  const router = useRouter()

  const [estado, setEstado]                   = useState<Estado>("idle")
  const [items, setItems]                     = useState<ItemActivo[]>([])
  const [pregeneratedItems, setPregeneratedItems] = useState<ItemActivo[] | null>(null)
  const [seleccionados, setSeleccionados]     = useState<Set<string>>(new Set())
  const [modalOpen, setModalOpen]             = useState(false)
  const [mensajeTexto, setMensajeTexto]       = useState("")
  const [enviado, setEnviado]                 = useState(false)
  const [sendPending, setSendPending]         = useState(false)
  const [error, setError]                     = useState<string | null>(null)

  // ── Pending campo computation ───────────────────────────────────────────────

  const pendientes = CAMPOS.filter((c) => isMissing(candidato[c.key]))
  const expPendientes: { expIndex: number; empresa: string; campo: ExpCampo }[] = []
  experiencia.forEach((exp, i) => {
    getExpCampos(exp).forEach((campo) => {
      expPendientes.push({ expIndex: i, empresa: exp.empresa ?? `Exp ${i + 1}`, campo })
    })
  })
  const total = pendientes.length + expPendientes.length

  // ── Pre-generate questions in background on mount (for subsequent cycles) ──

  useEffect(() => {
    // First contact uses parse suggestions — no need to pre-generate
    if (!fecha_consultado && preguntas_sugeridas.length > 0) return

    const campos: CampoPendiente[] = [
      ...pendientes.map((c) => ({ tipo: "candidato" as const, campo: c.key as string, label: c.label })),
      ...expPendientes.map((ep) => ({
        tipo: "experiencia" as const,
        expIndex: ep.expIndex,
        empresa: ep.empresa,
        campo: ep.campo.id,
        label: ep.campo.label,
      })),
    ]
    if (!campos.length) return

    generarPreguntasParaCampos(candidatoId, campos).then((result) => {
      if (result.success) {
        setPregeneratedItems(buildItems(result.preguntas.map((p) => [p.campo, p.pregunta])))
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── helpers ─────────────────────────────────────────────────────────────────

  function buildItems(entries: [string, string][]): ItemActivo[] {
    const pregByKey = new Map(entries)
    return [
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
  }

  function toggleItem(key: string, allItems: ItemActivo[]) {
    setSeleccionados((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
    void allItems // keep reference stable
  }

  function handleAbrirModal(allItems: ItemActivo[]) {
    const pregs = [...seleccionados]
      .map((k) => allItems.find((it) => it.key === k)?.pregunta)
      .filter((p): p is string => !!p)
    setMensajeTexto(generarMensajeWhatsapp(nombre, pregs))
    setModalOpen(true)
  }

  async function handleEnviar() {
    if (!telefono || !mensajeTexto.trim() || sendPending) return
    setSendPending(true)
    const preguntasTexto = [...seleccionados]
      .map((k) => items.find((it) => it.key === k)?.pregunta)
      .filter((p): p is string => !!p)
    await registrarEnvioWhatsapp(candidatoId, mensajeTexto, preguntasTexto)
    window.open(`${waUrl(telefono)}?text=${encodeURIComponent(mensajeTexto)}`, "_blank")
    setSendPending(false)
    setEnviado(true)
    setModalOpen(false)
    router.refresh()
  }

  function handleCopiar() {
    if (mensajeTexto.trim()) void navigator.clipboard.writeText(mensajeTexto)
  }

  // ── handlePreparar: instant if pre-generated, spinner otherwise ─────────────

  async function handlePreparar() {
    if (!fecha_consultado && preguntas_sugeridas.length > 0) {
      // First contact: use parse-time suggestions
      const allItems: ItemActivo[] = preguntas_sugeridas.map((p, i) => ({
        key: `q:${i}`, label: p, pregunta: p,
      }))
      setItems(allItems)
      setSeleccionados(new Set())
      setEstado("activo")
      return
    }

    if (pregeneratedItems) {
      // Already ready — instant
      setItems(pregeneratedItems)
      setSeleccionados(new Set())
      setEstado("activo")
      return
    }

    // Still generating — show spinner and await
    setError(null)
    setEstado("cargando")
    const campos: CampoPendiente[] = [
      ...pendientes.map((c) => ({ tipo: "candidato" as const, campo: c.key as string, label: c.label })),
      ...expPendientes.map((ep) => ({
        tipo: "experiencia" as const, expIndex: ep.expIndex, empresa: ep.empresa,
        campo: ep.campo.id, label: ep.campo.label,
      })),
    ]
    const result = await generarPreguntasParaCampos(candidatoId, campos)
    if (!result.success) { setError(result.error); setEstado("idle"); return }
    const allItems = buildItems(result.preguntas.map((p) => [p.campo, p.pregunta]))
    setItems(allItems)
    setSeleccionados(new Set())
    setEstado("activo")
  }

  // ── Early return after all hooks ────────────────────────────────────────────

  if (total === 0) return null

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

  // ── SEND MODAL ──────────────────────────────────────────────────────────────

  const Modal = modalOpen ? (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(13,17,23,0.55)", backdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false) }}
    >
      <div style={{
        background: "#fff", borderRadius: 20, padding: "28px 32px",
        boxShadow: "0 24px 64px rgba(13,17,23,0.22)",
        width: "min(640px, 96vw)", maxHeight: "90vh",
        display: "flex", flexDirection: "column", gap: 16, overflowY: "auto",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0d1117" }}>
            Mensaje para {nombre}
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(false)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#8b949e", padding: 4 }}
          >
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <textarea
          value={mensajeTexto}
          onChange={(e) => setMensajeTexto(e.target.value)}
          rows={12}
          style={{
            width: "100%", boxSizing: "border-box",
            borderRadius: 12, padding: "12px 14px",
            fontSize: 13.5, lineHeight: 1.7,
            fontFamily: "inherit",
            background: "#f6f8f3",
            border: "1.5px solid var(--gl-olive)",
            color: "#0d1117", outline: "none", resize: "vertical",
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            type="button"
            onClick={() => { void handleEnviar() }}
            disabled={sendPending || !telefono}
            title={!telefono ? "El candidato no tiene teléfono registrado" : undefined}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "10px 0", borderRadius: 12, border: "none",
              fontSize: 13.5, fontWeight: 700, cursor: sendPending || !telefono ? "not-allowed" : "pointer",
              background: !telefono ? "#e2e8d9" : "#25D366",
              color: !telefono ? "#8b9e73" : "#fff",
              opacity: sendPending ? 0.7 : 1,
            }}
          >
            <MessageCircle style={{ width: 16, height: 16 }} />
            {sendPending ? "Abriendo…" : "Abrir en WhatsApp y registrar envío"}
          </button>
          <button
            type="button"
            onClick={handleCopiar}
            style={{
              padding: "8px 0", borderRadius: 12, fontSize: 13, fontWeight: 600,
              background: "transparent", color: "#6b7c5a",
              border: "1px solid #d4e0c4", cursor: "pointer",
            }}
          >
            Solo copiar texto
          </button>
          <button
            type="button"
            onClick={() => setModalOpen(false)}
            style={{ padding: "6px 0", fontSize: 12, color: "#8b949e", background: "none", border: "none", cursor: "pointer" }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  ) : null

  // ── CARGANDO ────────────────────────────────────────────────────────────────

  if (estado === "cargando") {
    return (
      <>
        {Modal}
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
            <span style={{ fontSize: 12, color: "#6b7c5a" }}>Generando preguntas…</span>
          </div>
        </div>
      </>
    )
  }

  // ── ACTIVO ──────────────────────────────────────────────────────────────────

  if (estado === "activo") {
    const grupos = Array.from(
      new Set(items.map((it) => it.grupo ?? ""))
    ).filter(Boolean)
    const sinGrupo = items.filter((it) => !it.grupo)
    const nSel = seleccionados.size

    const preguntasSeleccionadas = [...seleccionados]
      .map((k) => items.find((it) => it.key === k))
      .filter((it): it is ItemActivo => !!it)

    function CheckRow({ item }: { item: ItemActivo }) {
      const sel = seleccionados.has(item.key)
      return (
        <button
          type="button"
          onClick={() => toggleItem(item.key, items)}
          style={{
            display: "flex", alignItems: "flex-start", gap: 10, width: "100%",
            background: sel ? "#f0f5ea" : "transparent",
            border: sel ? "1px solid #c5d9b0" : "1px solid transparent",
            borderRadius: 8, padding: "7px 10px", cursor: "pointer", textAlign: "left",
          }}
        >
          <div style={{
            width: 16, height: 16, borderRadius: 4, flexShrink: 0, marginTop: 2,
            background: sel ? "var(--gl-olive)" : "#fff",
            border: sel ? "1.5px solid var(--gl-olive)" : "1.5px solid #c5d9b0",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {sel && <span style={{ color: "#fff", fontSize: 10, lineHeight: 1, fontWeight: 700 }}>✓</span>}
          </div>
          <span style={{ fontSize: 12.5, color: sel ? "#2d3a1f" : "#5a6e48", lineHeight: 1.5 }}>
            {item.pregunta || item.label}
          </span>
        </button>
      )
    }

    return (
      <>
        {Modal}
        <div style={panelStyle}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            {headerLabel}
            <button
              type="button"
              onClick={() => { setEstado("idle"); setItems([]); setSeleccionados(new Set()); setEnviado(false) }}
              style={{ fontSize: 11, color: "#8b9e73", background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}
            >
              ← volver
            </button>
          </div>

          {/* Lista unificada — CheckRow para todos los modos */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Items sin grupo (modo parseo: preguntas directas) */}
            {sinGrupo.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {sinGrupo.map((item) => <CheckRow key={item.key} item={item} />)}
              </div>
            )}
            {/* Items agrupados (modo ciclos siguientes) */}
            {grupos.map((grupo) => {
              const grupoItems = items.filter((it) => it.grupo === grupo)
              if (!grupoItems.length) return null
              return (
                <div key={grupo}>
                  <div style={{ fontSize: 9.5, fontWeight: 600, color: "#8b9e73", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
                    {grupo}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {grupoItems.map((item) => <CheckRow key={item.key} item={item} />)}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Questions preview — clean card, no textarea */}
          <div style={{ marginTop: 14 }}>
            {nSel === 0 ? (
              <div style={{
                borderRadius: 10, padding: "12px 14px",
                background: "#f4f7f0", border: "1px dashed #c5d9b0",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontSize: 12, color: "#8b9e73" }}>
                  Tocá un campo para agregar la pregunta
                </span>
              </div>
            ) : (
              <div style={{
                borderRadius: 10, padding: "14px 16px",
                background: "#f4f7f0", border: "1px solid #c5d9b0",
                display: "flex", flexDirection: "column", gap: 10,
              }}>
                {preguntasSeleccionadas.map((item, i) => (
                  <div key={item.key} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: "50%",
                      background: "var(--gl-olive)", color: "#fff",
                      fontSize: 10, fontWeight: 700,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, marginTop: 1,
                    }}>
                      {i + 1}
                    </div>
                    <span style={{ fontSize: 13, color: "#2d3a1f", lineHeight: 1.55, flex: 1 }}>
                      {item.pregunta}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleItem(item.key, items)}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: "#8b9e73", fontSize: 14, lineHeight: 1,
                        padding: "2px 4px", flexShrink: 0,
                      }}
                      title="Quitar"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            {enviado ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#dafbe1", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <CheckCircle style={{ width: 14, height: 14, color: "#1a7f37" }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#1a7f37" }}>
                  Enviado — {new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ) : (
              <span style={{ fontSize: 11.5, color: nSel > 0 ? "#5a6e48" : "#8b9e73", fontWeight: nSel > 0 ? 600 : 400 }}>
                {nSel === 0 ? "Seleccioná los campos que querés preguntar" : `${nSel} pregunta${nSel !== 1 ? "s" : ""}`}
              </span>
            )}

            {!enviado && (
              <button
                type="button"
                onClick={() => handleAbrirModal(items)}
                disabled={nSel === 0}
                style={{
                  fontSize: 12, fontWeight: 700,
                  color: nSel === 0 ? "#8b9e73" : "#fff",
                  background: nSel === 0 ? "#e2e8d9" : "var(--gl-olive)",
                  border: "none", borderRadius: 8, padding: "7px 16px",
                  cursor: nSel === 0 ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                  whiteSpace: "nowrap",
                }}
              >
                <MessageCircle style={{ width: 13, height: 13 }} />
                Armar mensaje →
              </button>
            )}
          </div>
        </div>
      </>
    )
  }

  // ── IDLE ────────────────────────────────────────────────────────────────────

  const grupos = Array.from(new Set(pendientes.map((p) => p.grupo)))
  const esPrimerContacto = !fecha_consultado && preguntas_sugeridas.length > 0
  const isPregenerated = !!pregeneratedItems

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
                  <span key={c.key as string} style={{ ...CHIP_BASE, cursor: "default" }}>{c.label}</span>
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
                <span key={`${ep.expIndex}:${ep.campo.id}`} style={{ ...CHIP_BASE, cursor: "default" }}>
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

      <div style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {/* Pre-generation status indicator */}
        {!esPrimerContacto && (
          <span style={{ fontSize: 11, color: isPregenerated ? "#1a7f37" : "#8b9e73" }}>
            {isPregenerated ? "✓ Preguntas listas" : "Generando preguntas…"}
          </span>
        )}
        {esPrimerContacto && <span />}

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
