"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { Users, Inbox, MapPin, Shield, Archive, Plus, List, Search, X, PauseCircle } from "lucide-react"
import { GarantiaCard } from "@/components/app/garantia-card"
import { fuzzyFilter } from "@/lib/fuzzy"

// ── Types ────────────────────────────────────────────────────────────────────

type GestionRaw = { estado: string }

export type BusquedaRow = {
  id: string
  puesto: string
  cliente: string
  estado: string
  ubicacion: string | null
  rango_salarial: string | null
  notas_cierre: string | null
  notas_internas: string | null
  fecha_apertura: string
  fecha_cierre: string | null
  gestiones: GestionRaw[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_HEX = [
  { bg: "#dafbe1", color: "#1a7f37" },
  { bg: "#ddf4ff", color: "#0550ae" },
  { bg: "#ffd8eb", color: "#99286e" },
  { bg: "#fff8c5", color: "#7d4e00" },
  { bg: "#eddeff", color: "#6e40c9" },
]

const STAGE_ORDER = [
  "preseleccionado", "entrevista_orka", "presentado_cliente",
  "entrevista_cliente", "ofertado", "contratado",
]

const STAGE_LABEL: Record<string, string> = {
  preseleccionado:    "Preseleccionado",
  entrevista_orka:    "Entrevista GL",
  presentado_cliente: "Presentado",
  entrevista_cliente: "2ª Entrevista",
  ofertado:           "Ofertado",
  contratado:         "Contratado",
}

const OLIVE    = "#2a4a18"
const OLIVE_BG = "#eef5e8"
const INK3     = "#8b949e"
const BORDER   = "#eaecef"

type Tab = "activas" | "pausadas" | "garantia" | "archivadas"

function daysBadge(days: number) {
  if (days <= 14) return { bg: "#dafbe1", color: "#1a7f37" }
  if (days <= 30) return { bg: "#fff8c5", color: "#9a6700" }
  return { bg: "#ffebe9", color: "#cf222e" }
}

function calcDaysOpen(fecha: string) {
  if (!fecha) return 0
  return Math.floor((Date.now() - new Date(fecha).getTime()) / 86_400_000)
}

function etapasActivas(gestiones: GestionRaw[]) {
  const activas = gestiones.filter((g) => g.estado !== "descartado")
  if (!activas.length) return []
  const result: { label: string; count: number; isContratado: boolean }[] = []
  for (let i = STAGE_ORDER.length - 1; i >= 0; i--) {
    const key   = STAGE_ORDER[i]
    const count = activas.filter((g) => g.estado === key).length
    if (count > 0) {
      result.push({ label: STAGE_LABEL[key], count, isContratado: key === "contratado" })
      if (result.length === 2) break
    }
  }
  return result
}

function diasGarantiaRestantes(fecha_cierre: string | null): number | null {
  if (!fecha_cierre) return null
  const dias = Math.floor((Date.now() - new Date(fecha_cierre).getTime()) / 86_400_000)
  return 90 - dias
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

// ── Main component ───────────────────────────────────────────────────────────

export function BusquedasClient({ busquedas }: { busquedas: BusquedaRow[] }) {
  const [tab, setTab]     = useState<Tab>("activas")
  const [query, setQuery] = useState("")

  const debouncedQuery = useDebounce(query, 180)

  const filtered = useMemo(() => {
    return debouncedQuery.trim()
      ? fuzzyFilter(busquedas, debouncedQuery, (b) => [b.puesto, b.cliente, b.ubicacion])
      : busquedas
  }, [debouncedQuery, busquedas])

  const activas    = filtered.filter((b) => b.estado === "activa")
  const pausadas   = filtered.filter((b) => b.estado === "pausada")
  const garantia   = filtered.filter((b) => b.estado === "cerrada")
  const archivadas = filtered.filter((b) => b.estado === "archivada")

  const garantiasVencidas = garantia.filter((b) => {
    const r = diasGarantiaRestantes(b.fecha_cierre)
    return r !== null && r <= 0
  }).length

  const tabs: { key: Tab; label: string; icon: typeof List; count?: number; urgent?: boolean }[] = [
    { key: "activas",    label: "Activas",    icon: List },
    { key: "pausadas",   label: "Pausadas",   icon: PauseCircle, count: pausadas.length },
    { key: "garantia",   label: "Garantía",   icon: Shield,  count: garantia.length,  urgent: garantiasVencidas > 0 },
    { key: "archivadas", label: "Archivadas", icon: Archive, count: archivadas.length },
  ]

  return (
    <div className="px-10 py-10">

      {/* Header */}
      <header className="mb-8">
        <p className="gl-eyebrow mb-2">Búsquedas</p>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1
            className="font-display tracking-tight leading-none"
            style={{ fontSize: "clamp(2rem, 4vw, 2.75rem)", color: "var(--gl-ink)" }}
          >
            {activas.length} activa{activas.length !== 1 ? "s" : ""}
          </h1>
          <div className="flex items-center gap-3">
            {/* Search input */}
            <div
              className="flex items-center gap-2.5 rounded-lg px-3.5 py-2"
              style={{
                background: "var(--gl-surface)",
                border: "1px solid var(--gl-border)",
                width: 260,
              }}
            >
              <Search className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--gl-ink-3)" }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar posición o cliente..."
                autoComplete="off"
                className="bg-transparent text-[13px] flex-1 outline-none"
                style={{ color: "var(--gl-ink)" }}
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  style={{ color: "var(--gl-ink-3)", display: "flex", alignItems: "center" }}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Link href="/busquedas/nueva" className="gl-btn-primary">
              <Plus style={{ width: 14, height: 14 }} />
              Nueva búsqueda
            </Link>
          </div>
        </div>
      </header>

      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-6" style={{ borderBottom: `1px solid ${BORDER}` }}>
        {tabs.map((t) => {
          const Icon   = t.icon
          const active = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.4rem",
                padding: "0.625rem 0.875rem",
                fontSize: "13px", fontWeight: active ? 600 : 450,
                color: active ? OLIVE : INK3,
                background: "transparent", border: "none",
                borderBottom: active ? `2px solid ${OLIVE}` : "2px solid transparent",
                marginBottom: "-1px", cursor: "pointer",
                transition: "color 0.15s", whiteSpace: "nowrap",
              }}
            >
              <Icon style={{ width: 13, height: 13 }} />
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span
                  style={{
                    fontSize: "10.5px", fontWeight: 700,
                    padding: "1px 6px", borderRadius: "99px",
                    background: t.urgent ? "#ffebe9" : (active ? OLIVE_BG : "#f6f8fa"),
                    color: t.urgent ? "#cf222e" : (active ? OLIVE : INK3),
                    minWidth: "18px", textAlign: "center",
                  }}
                >
                  {t.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Panels */}
      {tab === "activas" && (
        <BusquedasGrid
          busquedas={activas}
          emptyIcon={<Inbox />}
          emptyTitle="Sin búsquedas activas"
          emptyDesc="Creá la primera posición para empezar."
          showDays
        />
      )}
      {tab === "pausadas" && (
        <BusquedasGrid
          busquedas={pausadas}
          emptyIcon={<PauseCircle />}
          emptyTitle="Sin búsquedas pausadas"
          emptyDesc="Las búsquedas pausadas temporalmente aparecen acá."
          showDays={false}
        />
      )}
      {tab === "garantia" && (
        <GarantiaGrid busquedas={garantia} diasFn={diasGarantiaRestantes} />
      )}
      {tab === "archivadas" && (
        <BusquedasGrid
          busquedas={archivadas}
          emptyIcon={<Archive />}
          emptyTitle="Sin búsquedas archivadas"
          emptyDesc="Las búsquedas cerradas exitosamente aparecerán acá."
          showDays={false}
        />
      )}
    </div>
  )
}

// ── Grid genérico ─────────────────────────────────────────────────────────────

function BusquedasGrid({
  busquedas, emptyIcon, emptyTitle, emptyDesc, showDays,
}: {
  busquedas: BusquedaRow[]
  emptyIcon: React.ReactNode
  emptyTitle: string
  emptyDesc: string
  showDays: boolean
}) {
  if (busquedas.length === 0) {
    return (
      <div className="flex flex-col items-center text-center py-20">
        <div
          className="h-13 w-13 rounded-full grid place-items-center mb-5"
          style={{ background: OLIVE_BG }}
        >
          <span style={{ color: OLIVE }}>{emptyIcon}</span>
        </div>
        <h3 className="font-display mb-1.5" style={{ fontSize: "1.375rem", color: "var(--gl-ink)" }}>
          {emptyTitle}
        </h3>
        <p className="text-sm" style={{ color: "var(--gl-ink-3)" }}>{emptyDesc}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      {busquedas.map((b) => {
        const days   = calcDaysOpen(b.fecha_apertura)
        const count  = b.gestiones.length
        const dys    = daysBadge(days)
        const etapas = etapasActivas(b.gestiones)
        const pal    = AVATAR_HEX[(b.puesto.charCodeAt(0) || 0) % AVATAR_HEX.length]

        return (
          <Link key={b.id} href={`/busquedas/${b.id}`} className="gl-card-link flex flex-col p-5">
            <div className="flex items-start gap-3.5 mb-4">
              <div
                className="h-11 w-11 rounded-xl grid place-items-center text-sm font-bold shrink-0"
                style={{ background: pal.bg, color: pal.color }}
              >
                {(b.puesto[0] ?? "?").toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-bold leading-tight" style={{ color: "var(--gl-ink)" }}>
                  {b.puesto}
                </div>
                <div className="text-[12.5px] mt-0.5 truncate" style={{ color: "var(--gl-ink-3)" }}>
                  {b.cliente}
                </div>
                {b.ubicacion && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3 shrink-0" style={{ color: "var(--gl-ink-3)" }} />
                    <span className="text-[11.5px] truncate" style={{ color: "var(--gl-ink-3)" }}>
                      {b.ubicacion}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {etapas.length > 0 ? (
              <div
                className="flex items-center gap-1.5 flex-wrap px-3 py-2 rounded-lg mb-4"
                style={{ background: etapas[0].isContratado ? "#dafbe1" : OLIVE_BG }}
              >
                {etapas.map((e, i) => (
                  <span key={e.label} className="flex items-center gap-1.5">
                    {i > 0 && <span className="text-[10px]" style={{ color: BORDER }}>·</span>}
                    <span className="text-[11px] font-semibold" style={{ color: e.isContratado ? "#1a7f37" : OLIVE }}>
                      {e.label}
                    </span>
                    <span className="text-[11px]" style={{ color: INK3 }}>· {e.count}</span>
                  </span>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-4" style={{ background: "var(--gl-gray-bg)" }}>
                <span className="text-[11px]" style={{ color: INK3 }}>Sin candidatos asignados</span>
              </div>
            )}

            <div
              className="flex items-center justify-between gap-2 pt-3 mt-auto"
              style={{ borderTop: `1px solid ${BORDER}` }}
            >
              <div
                className="flex items-center gap-1.5 text-[12px] min-w-0"
                style={{ color: count > 0 ? OLIVE : INK3 }}
              >
                <Users className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {count === 0 ? "Sin candidatos" : `${count} candidato${count !== 1 ? "s" : ""}`}
                </span>
              </div>
              {showDays && (
                <span
                  className="text-[10.5px] font-semibold font-mono px-2 py-0.5 rounded-full shrink-0"
                  style={dys}
                >
                  {days}d
                </span>
              )}
            </div>
          </Link>
        )
      })}
    </div>
  )
}

// ── Grid de garantía ──────────────────────────────────────────────────────────

function GarantiaGrid({
  busquedas,
  diasFn,
}: {
  busquedas: BusquedaRow[]
  diasFn: (fecha_cierre: string | null) => number | null
}) {
  if (busquedas.length === 0) {
    return (
      <div className="flex flex-col items-center text-center py-20">
        <div
          className="h-13 w-13 rounded-full grid place-items-center mb-5"
          style={{ background: OLIVE_BG }}
        >
          <Shield className="h-6 w-6" style={{ color: OLIVE }} />
        </div>
        <h3 className="font-display mb-1.5" style={{ fontSize: "1.375rem", color: "var(--gl-ink)" }}>
          Sin búsquedas en garantía
        </h3>
        <p className="text-sm" style={{ color: "var(--gl-ink-3)" }}>
          Las búsquedas cerradas aparecen acá durante 90 días.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      {busquedas.map((b) => {
        const restantes = diasFn(b.fecha_cierre)
        const vencida   = restantes !== null && restantes <= 0
        const pal       = AVATAR_HEX[(b.puesto.charCodeAt(0) || 0) % AVATAR_HEX.length]
        const count     = b.gestiones.length

        return (
          <GarantiaCard
            key={b.id}
            busqueda={b}
            pal={pal}
            count={count}
            restantes={restantes}
            vencida={vencida}
          />
        )
      })}
    </div>
  )
}
