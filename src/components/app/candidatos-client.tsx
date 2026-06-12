"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Search, Users, MessageCircle, ThumbsUp, ThumbsDown, X, ArrowUpDown, ArrowUp } from "lucide-react"
import { CandidatoSheet } from "@/components/app/candidato-sheet"
import { CandidatoEstadoToggle } from "@/components/app/candidato-estado-toggle"
import { waUrl } from "@/lib/cv/utils"
import { fuzzyFilter } from "@/lib/fuzzy"
import { createRealtimeClient } from "@/lib/supabase/client"

// ── Types ────────────────────────────────────────────────────────────────────

type GestionRaw = { estado: string; busquedas: { puesto: string } | null }

export type CandidatoRow = {
  id: string
  nombre: string
  apellido: string
  ultimo_puesto: string | null
  fecha_nacimiento: string | null
  ubicacion: string | null
  telefono: string | null
  estado: string
  referencias: { calificacion: "buena" | "mala" | null }[] | null
  categorias: string[] | null
  gestiones: GestionRaw[]
  visto: boolean
  idiomas: string[] | null
  fecha_consultado: string | null
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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

function mejorGestion(gestiones: GestionRaw[]) {
  const activas = gestiones.filter((g) => g.estado !== "descartado" && g.estado !== "contratado")
  if (!activas.length) return null
  return activas.sort((a, b) => STAGE_ORDER.indexOf(b.estado) - STAGE_ORDER.indexOf(a.estado))[0]
}

function calcEdad(fechaNac: string | null): number | null {
  if (!fechaNac) return null
  const b = new Date(fechaNac)
  if (isNaN(b.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - b.getFullYear()
  const m = today.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--
  return age
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

const COLS = "minmax(180px,2fr) minmax(140px,1.5fr) 52px minmax(120px,1.2fr) 48px minmax(160px,1.8fr) minmax(110px,1fr) 140px"

// ── Component ────────────────────────────────────────────────────────────────

export function CandidatosClient({ todos }: { todos: CandidatoRow[] }) {
  const [query, setQuery] = useState("")
  const [estadoFilter, setEstadoFilter] = useState<"todos" | "activo" | "inactivo">("todos")
  const [catFilter, setCatFilter] = useState<string[]>([])
  const [sortOrder, setSortOrder] = useState<"llegada" | "alfabetico">("llegada")
  const router = useRouter()

  useEffect(() => {
    let cancelado = false
    let cleanup = () => {}
    void createRealtimeClient().then((supabase) => {
      if (cancelado) return
      const channel = supabase
        .channel("candidatos-realtime")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "candidatos" }, () => {
          router.refresh()
        })
        .subscribe()
      cleanup = () => { void supabase.removeChannel(channel) }
    })
    return () => { cancelado = true; cleanup() }
  }, [router])

  const debouncedQuery = useDebounce(query, 180)

  const norm = (s: string) =>
    (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

  const candidatos = useMemo(() => {
    let result = debouncedQuery.trim()
      ? fuzzyFilter(todos, debouncedQuery, (c) => [c.nombre, c.apellido, c.ultimo_puesto, c.ubicacion])
      : todos

    if (estadoFilter !== "todos") result = result.filter((c) => c.estado === estadoFilter)
    if (catFilter.length > 0)
      result = result.filter((c) => catFilter.every((cat) => (c.categorias ?? []).includes(cat)))

    if (sortOrder === "alfabetico")
      result = [...result].sort((a, b) => {
        const ap = norm(a.apellido), bp = norm(b.apellido)
        if (ap !== bp) return ap.localeCompare(bp)
        return norm(a.nombre).localeCompare(norm(b.nombre))
      })

    return result
  }, [debouncedQuery, todos, estadoFilter, catFilter, sortOrder])

  const allCats = useMemo(() => {
    const set = new Set<string>()
    todos.forEach((c) => (c.categorias ?? []).forEach((cat) => set.add(cat)))
    return [...set].sort()
  }, [todos])

  const total   = candidatos.length
  const activos = todos.filter((c) => c.estado === "activo").length
  const isFiltered = query.trim() || estadoFilter !== "todos" || catFilter.length > 0

  function toggleCat(cat: string) {
    setCatFilter((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    )
  }

  return (
    <div className="px-10 py-10">

      {/* Header */}
      <header className="mb-6">
        <p className="gl-eyebrow mb-2">Base de candidatos</p>
        <div className="flex items-center justify-between gap-4">
          <h1
            className="font-display tracking-tight leading-none"
            style={{ fontSize: "clamp(2rem, 4vw, 2.75rem)", color: "var(--gl-ink)" }}
          >
            {isFiltered ? (
              <>
                <span>{total}</span>
                <span style={{ fontSize: "clamp(1.1rem, 2vw, 1.4rem)", color: "var(--gl-ink-3)", fontWeight: 400 }}>
                  {" "}de {todos.length} persona{todos.length !== 1 ? "s" : ""}
                </span>
              </>
            ) : (
              `${total} persona${total !== 1 ? "s" : ""}`
            )}
          </h1>
          <div className="flex items-center gap-3">
            <span
              className="text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{ background: "#dafbe1", color: "#1a7f37" }}
            >
              {activos} activo{activos !== 1 ? "s" : ""}
            </span>
            <CandidatoSheet />
          </div>
        </div>
      </header>

      {/* Search + filters */}
      <div className="mb-6 flex flex-col gap-3">
        {/* Search input */}
        <div className="flex items-center gap-3 flex-wrap">
          <div
            className="flex items-center gap-2.5 rounded-lg px-3.5 py-2.5"
            style={{
              background: "var(--gl-surface)",
              border: "1px solid var(--gl-border)",
              flex: "1 1 260px",
              maxWidth: "400px",
            }}
          >
            <Search className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--gl-ink-3)" }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, puesto o ubicación..."
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

          {/* Estado chips */}
          <div className="flex items-center gap-1.5">
            {(["todos", "activo", "inactivo"] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setEstadoFilter(opt)}
                style={{
                  fontSize:     12,
                  fontWeight:   estadoFilter === opt ? 600 : 400,
                  padding:      "5px 12px",
                  borderRadius: 99,
                  border:       `1px solid ${estadoFilter === opt ? "var(--gl-olive)" : "var(--gl-border)"}`,
                  background:   estadoFilter === opt ? "var(--gl-olive-bg)" : "transparent",
                  color:        estadoFilter === opt ? "var(--gl-olive)" : "var(--gl-ink-3)",
                  cursor:       "pointer",
                  transition:   "all 0.12s",
                  whiteSpace:   "nowrap",
                }}
              >
                {opt === "todos" ? "Todos" : opt === "activo" ? "Activos" : "Inactivos"}
              </button>
            ))}
          </div>

          {/* Separador */}
          <span style={{ width: 1, height: 18, background: "var(--gl-border)", flexShrink: 0 }} />

          {/* Orden chips */}
          <div className="flex items-center gap-1.5">
            {(["llegada", "alfabetico"] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setSortOrder(opt)}
                style={{
                  fontSize:     12,
                  fontWeight:   sortOrder === opt ? 600 : 400,
                  padding:      "5px 12px",
                  borderRadius: 99,
                  border:       `1px solid ${sortOrder === opt ? "var(--gl-olive)" : "var(--gl-border)"}`,
                  background:   sortOrder === opt ? "var(--gl-olive-bg)" : "transparent",
                  color:        sortOrder === opt ? "var(--gl-olive)" : "var(--gl-ink-3)",
                  cursor:       "pointer",
                  transition:   "all 0.12s",
                  whiteSpace:   "nowrap",
                }}
              >
                {opt === "llegada" ? "Reciente" : "A → Z"}
              </button>
            ))}
          </div>
        </div>

        {/* Categoría chips */}
        {allCats.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {allCats.map((cat) => {
              const active = catFilter.includes(cat)
              return (
                <button
                  key={cat}
                  onClick={() => toggleCat(cat)}
                  style={{
                    fontSize:     11,
                    fontWeight:   active ? 600 : 400,
                    padding:      "3px 10px",
                    borderRadius: 6,
                    border:       `1px solid ${active ? "var(--gl-olive)" : "var(--gl-border)"}`,
                    background:   active ? "var(--gl-olive-bg)" : "transparent",
                    color:        active ? "var(--gl-olive)" : "var(--gl-ink-3)",
                    cursor:       "pointer",
                    transition:   "all 0.12s",
                  }}
                >
                  {cat}
                </button>
              )
            })}
            {catFilter.length > 0 && (
              <button
                onClick={() => setCatFilter([])}
                style={{
                  fontSize: 11,
                  color: "var(--gl-ink-3)",
                  cursor: "pointer",
                  background: "none",
                  border: "none",
                  textDecoration: "underline",
                }}
              >
                Limpiar
              </button>
            )}
          </div>
        )}
      </div>

      {/* Empty state */}
      {total === 0 && (
        <div className="flex flex-col items-center text-center py-20">
          <div
            className="h-13 w-13 rounded-full grid place-items-center mb-5"
            style={{ background: "var(--gl-olive-bg)" }}
          >
            <Users className="h-6 w-6" style={{ color: "var(--gl-olive)" }} />
          </div>
          <h3 className="font-display mb-1.5" style={{ fontSize: "1.375rem", color: "var(--gl-ink)" }}>
            {isFiltered ? "Sin resultados" : "Sin candidatos todavía"}
          </h3>
          <p className="text-sm mb-6" style={{ color: "var(--gl-ink-3)" }}>
            {isFiltered
              ? "Probá con otro término o cambiá los filtros."
              : "Agregá el primero para empezar a gestionar la base."}
          </p>
          {!isFiltered && <CandidatoSheet />}
        </div>
      )}

      {/* Lista */}
      {total > 0 && (
        <div
          style={{
            background:   "#fff",
            border:       "1px solid var(--gl-border)",
            borderRadius: 14,
            overflow:     "hidden",
          }}
        >
          {/* Cabecera */}
          <div
            style={{
              display:             "grid",
              gridTemplateColumns: COLS,
              gap:                 "0 12px",
              padding:             "10px 16px",
              background:          "var(--gl-surface)",
              borderBottom:        "1px solid var(--gl-border)",
            }}
          >
            {["Nombre", "Último puesto", "Edad", "Localidad", "WA", "Categorías", "Gestión activa", "Estado"].map((h) => (
              h === "Nombre" ? (
                <button
                  key={h}
                  onClick={() => setSortOrder((s) => s === "alfabetico" ? "llegada" : "alfabetico")}
                  style={{
                    display:       "inline-flex",
                    alignItems:    "center",
                    gap:           4,
                    fontSize:      10,
                    fontWeight:    700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color:         sortOrder === "alfabetico" ? "var(--gl-olive)" : "var(--gl-ink-3)",
                    background:    "none",
                    border:        "none",
                    padding:       0,
                    cursor:        "pointer",
                    whiteSpace:    "nowrap",
                  }}
                >
                  {h}
                  {sortOrder === "alfabetico"
                    ? <ArrowUp style={{ width: 10, height: 10 }} />
                    : <ArrowUpDown style={{ width: 10, height: 10, opacity: 0.4 }} />
                  }
                </button>
              ) : (
                <span
                  key={h}
                  style={{
                    fontSize:      10,
                    fontWeight:    700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color:         "var(--gl-ink-3)",
                    whiteSpace:    "nowrap",
                    overflow:      "hidden",
                    textOverflow:  "ellipsis",
                  }}
                >
                  {h}
                </span>
              )
            ))}
          </div>

          {/* Filas */}
          {candidatos.map((c) => {
            const edad           = calcEdad(c.fecha_nacimiento ?? null)
            const gestionesRaw   = (c.gestiones as GestionRaw[]) ?? []
            const gestion        = mejorGestion(gestionesRaw)
            const countActivas   = gestionesRaw.filter((g) => g.estado !== "descartado" && g.estado !== "contratado").length
            const cats           = (c.categorias as string[] | null) ?? []
            const refs           = (c.referencias as { calificacion: "buena" | "mala" | null }[] | null) ?? []
            const buenas         = refs.filter((r) => r?.calificacion === "buena").length
            const malas          = refs.filter((r) => r?.calificacion === "mala").length

            return (
              <div
                key={c.id}
                style={{
                  position:            "relative",
                  display:             "grid",
                  gridTemplateColumns: COLS,
                  gap:                 "0 12px",
                  padding:             "11px 16px",
                  borderBottom:        "1px solid var(--gl-border)",
                  alignItems:          "center",
                  background:          !c.visto ? "#f6fbf4" : undefined,
                }}
                className="hover:bg-[var(--gl-surface)]"
              >
                <Link
                  href={`/candidatos/${c.id}`}
                  style={{ position: "absolute", inset: 0, zIndex: 1 }}
                  aria-label={`Ver perfil de ${c.nombre} ${c.apellido}`}
                />
                {/* Nombre */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
                    <span
                      style={{
                        fontSize:     13.5,
                        fontWeight:   600,
                        color:        "var(--gl-ink)",
                        overflow:     "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace:   "nowrap",
                      }}
                    >
                      {c.apellido} {c.nombre}
                    </span>
                    {!c.visto && (
                      <span style={{
                        fontSize: 9.5, fontWeight: 700, letterSpacing: "0.08em",
                        padding: "1px 6px", borderRadius: 4,
                        background: "#d1fae5", color: "#065f46",
                        textTransform: "uppercase", flexShrink: 0,
                      }}>
                        Nuevo
                      </span>
                    )}
                    {(buenas > 0 || malas > 0) && (
                      <span style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                        {buenas > 0 && (
                          <span style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 10.5, fontWeight: 600, color: "#16a34a" }}>
                            <ThumbsUp style={{ width: 11, height: 11 }} />{buenas}
                          </span>
                        )}
                        {malas > 0 && (
                          <span style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 10.5, fontWeight: 600, color: "#dc2626" }}>
                            <ThumbsDown style={{ width: 11, height: 11 }} />{malas}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* Último puesto */}
                <span
                  style={{ fontSize: 12.5, color: "var(--gl-ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  title={c.ultimo_puesto ?? ""}
                >
                  {c.ultimo_puesto ?? "—"}
                </span>

                {/* Edad */}
                <span style={{ fontSize: 12.5, color: "var(--gl-ink)", fontWeight: 500, textAlign: "center" }}>
                  {edad != null ? edad : "—"}
                </span>

                {/* Localidad */}
                <span
                  style={{ fontSize: 12.5, color: "var(--gl-ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  title={c.ubicacion ?? ""}
                >
                  {c.ubicacion ?? "—"}
                </span>

                {/* WhatsApp */}
                <div style={{ display: "flex", justifyContent: "center", position: "relative", zIndex: 2 }}>
                  {c.telefono ? (
                    <a
                      href={waUrl(c.telefono)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={c.telefono}
                      style={{
                        display: "grid", placeItems: "center",
                        width: 28, height: 28, borderRadius: 8,
                        background: "#dafbe1", color: "#1a7f37",
                        textDecoration: "none", flexShrink: 0,
                      }}
                    >
                      <MessageCircle style={{ width: 13, height: 13 }} />
                    </a>
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--gl-border)" }}>—</span>
                  )}
                </div>

                {/* Categorías */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                  {cats.length > 0 ? cats.slice(0, 3).map((cat) => (
                    <span
                      key={cat}
                      style={{
                        fontSize: 10.5, fontWeight: 500,
                        padding: "2px 7px", borderRadius: 5,
                        background: "var(--gl-olive-bg)", color: "var(--gl-olive)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {cat}
                    </span>
                  )) : <span style={{ fontSize: 12, color: "var(--gl-border)" }}>—</span>}
                  {cats.length > 3 && (
                    <span style={{ fontSize: 10.5, color: "var(--gl-ink-3)", alignSelf: "center" }}>
                      +{cats.length - 3}
                    </span>
                  )}
                </div>

                {/* Gestión activa */}
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {gestion ? (
                    <>
                      <span
                        style={{
                          display: "inline-block", fontSize: 10.5, fontWeight: 600,
                          padding: "2px 8px", borderRadius: 5,
                          background: "var(--gl-olive-bg)", color: "var(--gl-olive)",
                          whiteSpace: "nowrap", maxWidth: "100%",
                          overflow: "hidden", textOverflow: "ellipsis",
                        }}
                        title={gestion.busquedas?.puesto ?? ""}
                      >
                        {STAGE_LABEL[gestion.estado] ?? gestion.estado}
                      </span>
                      {countActivas > 1 && (
                        <span style={{ fontSize: 10, color: "var(--gl-ink-3)" }}>
                          +{countActivas - 1} proceso{countActivas - 1 > 1 ? "s" : ""} más
                        </span>
                      )}
                    </>
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--gl-border)" }}>—</span>
                  )}
                </div>

                {/* Estado toggle */}
                <div style={{ position: "relative", zIndex: 2 }}>
                  <CandidatoEstadoToggle
                    candidatoId={c.id}
                    estadoInicial={c.estado as "activo" | "inactivo"}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
