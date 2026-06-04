"use client"

import { useState, useEffect } from "react"
import { CheckCircle, X, MessageCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { generarMensajeWhatsapp, waUrl } from "@/lib/cv/utils"
import {
  generarPreguntasParaCampos,
  registrarEnvioWhatsapp,
  type CampoPendiente,
  type PreguntaEnviada,
} from "@/lib/actions/candidatos"
import type { Tables } from "@/lib/supabase/types"
import type { PreguntaMapeada } from "@/lib/cv/generar-preguntas-mapeadas"

type Candidato   = Tables<"candidatos">
type Experiencia = Tables<"experiencia_laboral">

const CAMPOS: { key: keyof Candidato; label: string; grupo: string }[] = [
  // Personal
  { key: "dni",                  label: "DNI",                    grupo: "Personal"    },
  { key: "fecha_nacimiento",     label: "Fecha de nacimiento",    grupo: "Personal"    },
  { key: "lugar_nacimiento",     label: "Lugar de nacimiento",    grupo: "Personal"    },
  { key: "domicilio_completo",   label: "Domicilio completo",     grupo: "Personal"    },
  { key: "email",                label: "Email",                  grupo: "Personal"    },
  { key: "telefono",             label: "Teléfono",               grupo: "Personal"    },
  { key: "estado_civil",         label: "Estado civil",           grupo: "Personal"    },
  { key: "hijos",                label: "Hijos",                  grupo: "Personal"    },
  { key: "educacion",            label: "Estudios",               grupo: "Personal"    },
  // Condiciones
  { key: "disponibilidad",       label: "Disponibilidad",         grupo: "Condiciones" },
  { key: "pretension_salarial",  label: "Pretensión salarial",    grupo: "Condiciones" },
  { key: "vehiculo_propio",      label: "Vehículo o movilidad propia (y cuál tiene)", grupo: "Condiciones" },
  { key: "licencia_conducir",    label: "Licencia de conducir",   grupo: "Condiciones" },
  // Campo
  { key: "muebles_propios",      label: "Muebles propios",        grupo: "Campo"       },
  { key: "animales",             label: "Animales",               grupo: "Campo"       },
]

function isMissing(val: unknown): boolean {
  return val === null || val === undefined || val === ""
}

const AGRO_KW    = ["campo", "estancia", "tambo", "feedlot", "agrícol", "agropecuar", "ganade", "rural", "tambero", "puestero", "capataz", "tractorista", "cosecha", "siembra", "cultivo", "agro"]
const NO_AGRO_KW = ["distribuidora", "distribuidor", "distribución", "repositor", "supermercado", "hipermercado", "farmacia", "banco ", "financier", "seguro", "administrat", "contab", "recepcion", "cajero", "secretar", "sistemas", "software", "programad", "marketing"]

function requiereDimensionEstablecimiento(exp: { rol?: string | null; empresa?: string | null }): boolean {
  const t = `${exp.rol ?? ""} ${exp.empresa ?? ""}`.toLowerCase()
  if (AGRO_KW.some(kw => t.includes(kw)))    return true
  if (NO_AGRO_KW.some(kw => t.includes(kw))) return false
  return true
}

const CHIP_AMBER: React.CSSProperties = {
  background: "#fff7e6", border: "1px solid #f59e0b", color: "#92400e",
}

type ExpCampo = { id: string; label: string }

function getExpCampos(exp: Experiencia): ExpCampo[] {
  const r: ExpCampo[] = []
  if (isMissing(exp.empresa))                   r.push({ id: "empresa",                  label: "Nombre del establecimiento" })
  if (isMissing(exp.nombre_propietario))         r.push({ id: "nombre_propietario",        label: "Nombre del propietario"     })
  if (isMissing(exp.rol))                        r.push({ id: "rol",                       label: "Cargo/puesto"               })
  if (isMissing(exp.desde))                      r.push({ id: "desde",                     label: "Fecha de ingreso"           })
  if (isMissing(exp.ubicacion))                  r.push({ id: "ubicacion",                 label: "Ubicación"                  })
  if (isMissing(exp.dimension_establecimiento) && requiereDimensionEstablecimiento(exp))  r.push({ id: "dimension_establecimiento", label: "Tamaño establecimiento"     })
  if (isMissing(exp.descripcion))                r.push({ id: "descripcion",               label: "Tareas desarrolladas"       })
  if (isMissing(exp.personal_a_cargo))           r.push({ id: "personal_a_cargo",          label: "Personas a cargo"           })
  if (exp.en_blanco === null)                    r.push({ id: "en_blanco",                 label: "En blanco"                  })
  if (isMissing(exp.motivo_cambio_o_salida) && exp.hasta !== null)
                                                  r.push({ id: "motivo_cambio_o_salida",   label: "Motivo de salida"           })
  if (exp.hasta === null) {
    if (isMissing(exp.ingresos_actuales)) r.push({ id: "ingresos_actuales", label: "Ingresos actuales" })
    if (isMissing(exp.beneficios))        r.push({ id: "beneficios",        label: "Beneficios"        })
  }
  return r
}

interface ItemActivo {
  key: string
  label: string
  pregunta: string
  grupo?: string
  expId?: string
  empresa?: string
}

interface Props {
  candidato:              Candidato
  experiencia:            Experiencia[]
  candidatoId:            string
  nombre:                 string
  telefono:               string | null
  pregunasMapeadasDb:     PreguntaMapeada[] | null
  preguntasEnviadasDb:    PreguntaEnviada[] | null
  fecha_consultado:       string | null
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
  pregunasMapeadasDb, preguntasEnviadasDb, fecha_consultado,
}: Props) {
  const router = useRouter()

  // ── Pending campo computation ───────────────────────────────────────────────

  const pendientes = CAMPOS.filter((c) => isMissing(candidato[c.key]))
  const expPendientes: { expIndex: number; expId: string; empresa: string; campo: ExpCampo }[] = []
  experiencia.forEach((exp, i) => {
    getExpCampos(exp).forEach((campo) => {
      expPendientes.push({ expIndex: i, expId: exp.id, empresa: exp.empresa ?? `Exp ${i + 1}`, campo })
    })
  })
  const total = pendientes.length + expPendientes.length

  const sentCampos = new Set<string>(preguntasEnviadasDb?.map((p) => p.campo) ?? [])
  const pendientesNoEnviados = pendientes.filter((c) => !sentCampos.has(`candidato:${c.key as string}`))
  const expPendientesNoEnviados = expPendientes.filter(
    (ep) => !sentCampos.has(`exp:${ep.expIndex}:${ep.campo.id}`)
  )

  // ── Inicializar desde DB (ya generadas al parsear el CV) ────────────────────

  // Derivado en cada render para que refleje preguntasEnviadasDb actualizado post-envío
  const dbItems = pregunasMapeadasDb ? buildItemsFromDb(pregunasMapeadasDb) : null
  const [backgroundItems, setBackgroundItems] = useState<ItemActivo[] | null>(null)
  const pregeneratedItems = dbItems ?? backgroundItems

  const [estado, setEstado]                   = useState<Estado>("idle")
  const [items, setItems]                     = useState<ItemActivo[]>([])
  const [preGenerating, setPreGenerating]     = useState(false)
  const [seleccionados, setSeleccionados]     = useState<Set<string>>(new Set())
  const [modalOpen, setModalOpen]             = useState(false)
  const [mensajeTexto, setMensajeTexto]       = useState("")
  const [sendPending, setSendPending]         = useState(false)
  const [error, setError]                     = useState<string | null>(null)

  // ── Fallback: si no hay preguntas en DB, generar en background ──────────────
  // Re-corre cuando cambia preguntasEnviadasDb (post-envío de tanda) para
  // pre-generar solo los campos restantes, no los ya enviados.

  useEffect(() => {
    if (dbItems) return // ya tenemos preguntas mapeadas del DB → no necesitamos generar

    const camposPendientes: CampoPendiente[] = [
      ...pendientesNoEnviados.map((c) => ({ tipo: "candidato" as const, campo: c.key as string, label: c.label })),
      ...expPendientesNoEnviados.map((ep) => ({
        tipo: "experiencia" as const,
        expIndex: ep.expIndex,
        empresa: ep.empresa,
        campo: ep.campo.id,
        label: ep.campo.label,
      })),
    ]
    if (!camposPendientes.length) return

    setPreGenerating(true)
    generarPreguntasParaCampos(candidatoId, camposPendientes).then((result) => {
      if (result.success) {
        setBackgroundItems(buildItems(result.preguntas.map((p) => [p.campo, p.pregunta])))
      }
      setPreGenerating(false)
    })
  }, [preguntasEnviadasDb]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── helpers ─────────────────────────────────────────────────────────────────

  function buildItemsFromDb(mapeadas: PreguntaMapeada[]): ItemActivo[] {
    return buildItems(mapeadas.map((p) => [p.campo, p.pregunta]))
  }

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
        return [{ key, label: ep.campo.label, pregunta, grupo: "Experiencia laboral", expId: ep.expId, empresa: ep.empresa }]
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
    const tandaId      = crypto.randomUUID()
    const enviadoAt    = new Date().toISOString()
    const preguntasConCampo: PreguntaEnviada[] = [...seleccionados]
      .flatMap((k) => {
        const item = items.find((it) => it.key === k)
        if (!item) return []
        const p: PreguntaEnviada = { campo: item.key, label: item.label, pregunta: item.pregunta, enviado_at: enviadoAt, tanda_id: tandaId }
        if (item.expId) p.expId = item.expId
        return [p]
      })
    await registrarEnvioWhatsapp(candidatoId, mensajeTexto, preguntasTexto, preguntasConCampo)
    window.open(`${waUrl(telefono)}?text=${encodeURIComponent(mensajeTexto)}`, "_blank")
    setSendPending(false)
    setModalOpen(false)
    setEstado("idle")
    setItems([])
    setSeleccionados(new Set())
    router.refresh() // actualiza preguntasEnviadasDb → dispara el useEffect para regenerar
  }

  function handleCopiar() {
    if (mensajeTexto.trim()) void navigator.clipboard.writeText(mensajeTexto)
  }

  // ── handlePreparar: instant if pre-generated, spinner otherwise ─────────────

  async function handlePreparar() {
    if (pregeneratedItems) {
      // Already ready — instant; filter out campos already sent in a previous tanda
      const filtered = pregeneratedItems.filter((it) => !sentCampos.has(it.key))
      setItems(filtered)
      setSeleccionados(new Set())
      setEstado("activo")
      return
    }

    // Still generating — show spinner and await
    setError(null)
    setEstado("cargando")
    const campos: CampoPendiente[] = [
      ...pendientesNoEnviados.map((c) => ({ tipo: "candidato" as const, campo: c.key as string, label: c.label })),
      ...expPendientesNoEnviados.map((ep) => ({
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
      new Set(items.filter((it) => it.grupo).map((it) => it.grupo!))
    )
    const sinGrupo = items.filter((it) => !it.grupo)
    const nSel = seleccionados.size

    const preguntasSeleccionadas = [...seleccionados]
      .map((k) => items.find((it) => it.key === k))
      .filter((it): it is ItemActivo => !!it)

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

    return (
      <>
        {Modal}
        <div style={panelStyle}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            {headerLabel}
            <button
              type="button"
              onClick={() => { setEstado("idle"); setItems([]); setSeleccionados(new Set()) }}
              style={{ fontSize: 11, color: "#8b9e73", background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}
            >
              ← volver
            </button>
          </div>

          {/* Chips — mismo look en todos los modos */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sinGrupo.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {sinGrupo.map((item) => <Chip key={item.key} item={item} />)}
              </div>
            )}
            {grupos.map((grupo) => {
              const grupoItems = items.filter((it) => it.grupo === grupo)
              if (!grupoItems.length) return null
              if (grupo === "Experiencia laboral") {
                const empresas = Array.from(new Set(grupoItems.map((it) => it.empresa ?? "")))
                return (
                  <div key={grupo}>
                    <div style={{ fontSize: 9.5, fontWeight: 600, color: "#8b9e73", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
                      {grupo}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {empresas.map((empresa) => (
                        <div key={empresa}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: "#6b7c5a", marginBottom: 5 }}>{empresa}</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {grupoItems.filter((it) => (it.empresa ?? "") === empresa).map((item) => <Chip key={item.key} item={item} />)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              }
              return (
                <div key={grupo}>
                  <div style={{ fontSize: 9.5, fontWeight: 600, color: "#8b9e73", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
                    {grupo}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {grupoItems.map((item) => <Chip key={item.key} item={item} />)}
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
            <span style={{ fontSize: 11.5, color: nSel > 0 ? "#5a6e48" : "#8b9e73", fontWeight: nSel > 0 ? 600 : 400 }}>
              {nSel === 0 ? "Seleccioná los campos que querés preguntar" : `${nSel} pregunta${nSel !== 1 ? "s" : ""}`}
            </span>

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
          </div>
        </div>
      </>
    )
  }

  // ── IDLE ────────────────────────────────────────────────────────────────────

  const grupos = Array.from(new Set(pendientes.map((p) => p.grupo)))
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
                {grupoCampos.map((c) => {
                  const campoKey = `candidato:${c.key as string}`
                  const isEnviado = preguntasEnviadasDb?.some((p) => p.campo === campoKey) ?? false
                  return (
                    <span key={c.key as string} style={{ ...CHIP_BASE, cursor: "default", ...(isEnviado ? CHIP_AMBER : {}) }}>
                      {isEnviado ? "⏳ " : ""}{c.label}
                    </span>
                  )
                })}
              </div>
            </div>
          )
        })}

        {expPendientes.length > 0 && (() => {
          const empresas = Array.from(new Set(expPendientes.map((ep) => ep.empresa)))
          return (
            <div>
              <div style={{ fontSize: 9.5, fontWeight: 600, color: "#8b9e73", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
                Experiencia laboral
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {empresas.map((empresa) => {
                  const campos = expPendientes.filter((ep) => ep.empresa === empresa)
                  return (
                    <div key={empresa}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#6b7c5a", marginBottom: 5 }}>
                        {empresa}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                        {campos.map((ep) => {
                          const campoKey = `exp:${ep.expIndex}:${ep.campo.id}`
                          const isEnviado = preguntasEnviadasDb?.some((p) => p.campo === campoKey) ?? false
                          return (
                            <span key={campoKey} style={{ ...CHIP_BASE, cursor: "default", ...(isEnviado ? CHIP_AMBER : {}) }}>
                              {isEnviado ? "⏳ " : ""}{ep.campo.label}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}
      </div>

      {error && (
        <p style={{ fontSize: 11, color: "#c0392b", marginTop: 8, marginBottom: 0 }}>{error}</p>
      )}

      <div style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        {/* Pre-generation status indicator */}
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: isPregenerated ? "#1a7f37" : "#8b9e73" }}>
          {preGenerating && (
            <>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              <span style={{ width: 10, height: 10, borderRadius: "50%", border: "1.5px solid #d4e0c4", borderTopColor: "#5a6e48", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
            </>
          )}
          {isPregenerated ? "✓ Preguntas listas" : preGenerating ? "Preparando preguntas…" : ""}
        </span>

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
          Preparar preguntas →
        </button>
      </div>
    </div>
  )
}
