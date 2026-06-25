"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { Users } from "lucide-react"
import { fuzzyScore } from "@/lib/fuzzy"
import { ParejaCvPanel } from "@/components/app/pareja-cv-panel"
import {
  vincularPareja,
  desvincularPareja,
  listarCandidatosParaPareja,
  type ParejaCandidato,
} from "@/lib/actions/candidatos"

type ParejaResumen = {
  id: string
  nombre: string
  apellido: string
  ultimo_puesto: string | null
}

interface Props {
  candidatoId: string
  estadoCivil: string | null
  parejaDeclarada: string | null
  pareja: ParejaResumen | null
}

function tienePareja(civil: string | null): boolean {
  const v = (civil ?? "").toLowerCase()
  return v.startsWith("casad") || v.includes("pareja") || v.includes("concubin") || v.includes("union") || v.includes("unión")
}

const initials = (n: string, a: string) => ((n[0] ?? "") + (a[0] ?? "")).toUpperCase()
const fullName = (c: { nombre: string; apellido: string }) => `${c.nombre} ${c.apellido}`

export function ParejaVinculo({ candidatoId, estadoCivil, parejaDeclarada, pareja }: Props) {
  const [open, setOpen] = useState(false)
  const [manual, setManual] = useState(false)         // forzar búsqueda aunque haya sugerencia
  const [all, setAll] = useState<ParejaCandidato[] | null>(null) // lista completa (carga 1 vez)
  const [query, setQuery] = useState("")
  const [isPending, startTrans] = useTransition()

  const declara = !!(parejaDeclarada && parejaDeclarada.trim())

  // sugerencia desde el nombre declarado — client-side, sobre la lista cargada
  const sugerida = useMemo(() => {
    if (!all || !declara) return null
    let best: ParejaCandidato | null = null
    let bs = 0
    for (const c of all) {
      const s = fuzzyScore([fullName(c)], parejaDeclarada as string)
      if (s > bs) { bs = s; best = c }
    }
    return bs >= 1 ? best : null
  }, [all, declara, parejaDeclarada])

  // resultados del buscador — client-side, instantáneo
  const resultados = useMemo(() => {
    if (!all) return []
    if (query.trim()) {
      return all
        .map((c) => ({ c, s: fuzzyScore([fullName(c), c.ultimo_puesto], query) }))
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .map((x) => x.c)
    }
    // sin query → lista alfabética (sin sugerir nada por zona/apellido)
    return [...all].sort((a, b) => fullName(a).localeCompare(fullName(b)))
  }, [all, query])

  // No mostrar nada si no hay vínculo, no es casado y no declara pareja
  if (!pareja && !tienePareja(estadoCivil) && !declara) return null

  function abrirModal() {
    setOpen(true)
    setQuery("")
    setManual(!declara) // si declara, arranca en vista sugerencia; si no, en búsqueda
    if (!all) {
      startTrans(async () => {
        setAll(await listarCandidatosParaPareja(candidatoId))
      })
    }
  }

  function cerrar() {
    setOpen(false)
    setManual(false)
    setQuery("")
  }

  function confirmar(parejaId: string) {
    startTrans(async () => {
      await vincularPareja(candidatoId, parejaId)
      cerrar()
    })
  }

  function quitar() {
    startTrans(async () => {
      await desvincularPareja(candidatoId)
    })
  }

  return (
    <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--gl-border)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--gl-ink-3)" }}>
        <Users style={{ width: 13, height: 13 }} /> Pareja
      </span>

      {pareja ? (
        <>
          <Link
            href={`/candidatos/${pareja.id}`}
            className="inline-flex items-center rounded-full px-2.5 py-1 text-[12.5px] font-semibold no-underline"
            style={{ background: "var(--gl-olive-bg)", color: "var(--gl-olive)" }}
            title={`Ver perfil de ${pareja.nombre} ${pareja.apellido}`}
          >
            {pareja.nombre} {pareja.apellido}
          </Link>
          <button
            type="button"
            onClick={quitar}
            disabled={isPending}
            className="text-[12px]"
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--gl-ink-3)" }}
            title="Quitar vínculo"
          >
            Quitar
          </button>
          <span style={{ color: "var(--gl-border)" }}>·</span>
          <ParejaCvPanel candidatoId={candidatoId} />
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={abrirModal}
            className="text-[12.5px] font-semibold"
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--gl-olive)" }}
          >
            Vincular pareja
          </button>
          {declara && (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-medium"
              style={{ color: "var(--gl-amber)" }}
              title={`El CV menciona a "${parejaDeclarada}"`}
            >
              · el CV menciona una
            </span>
          )}
        </>
      )}

      {open && (
        <ModalVincular
          declarada={parejaDeclarada}
          loading={all === null}
          showSuggestion={!manual && declara}
          sugerida={sugerida}
          query={query}
          resultados={resultados}
          onBuscar={setQuery}
          onIrManual={() => setManual(true)}
          onConfirmar={confirmar}
          onCerrar={cerrar}
        />
      )}
    </div>
  )
}

function ModalVincular(props: {
  declarada: string | null
  loading: boolean
  showSuggestion: boolean
  sugerida: ParejaCandidato | null
  query: string
  resultados: ParejaCandidato[]
  onBuscar: (q: string) => void
  onIrManual: () => void
  onConfirmar: (id: string) => void
  onCerrar: () => void
}) {
  const { declarada, loading, showSuggestion, sugerida, query, resultados, onBuscar, onIrManual, onConfirmar, onCerrar } = props

  // qué vista: cargando → spinner; sugerencia (si declara y hay match y no forzó manual); si no → buscador
  const vista = loading ? "loading" : showSuggestion && sugerida ? "suggest" : "search"

  return (
    <>
      <div
        onClick={onCerrar}
        style={{ position: "fixed", inset: 0, background: "rgba(13,17,23,0.42)", zIndex: 70 }}
      />
      <div
        role="dialog"
        aria-label="Vincular pareja"
        style={{
          position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          width: "min(460px, 94vw)", maxHeight: "86vh", overflowY: "auto",
          background: "#fff", borderRadius: "1rem", boxShadow: "0 24px 64px rgba(13,17,23,0.28)", zIndex: 71,
        }}
      >
        <div className="flex items-center justify-between gap-4 px-5 py-4" style={{ borderBottom: "1px solid var(--gl-border)" }}>
          <h3 className="text-[15px] font-bold" style={{ color: "var(--gl-ink)" }}>Vincular pareja</h3>
          <button type="button" onClick={onCerrar} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--gl-ink-3)", fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

        <div className="px-5 py-5">
          {vista === "loading" && (
            <div className="text-[13px]" style={{ color: "var(--gl-ink-3)" }}>Cargando candidatos…</div>
          )}

          {vista === "suggest" && sugerida && (
            <>
              <div className="text-[12.5px] mb-3" style={{ color: "var(--gl-ink-2)", lineHeight: 1.5 }}>
                El CV menciona a <b style={{ color: "var(--gl-ink)" }}>&quot;{declarada}&quot;</b>. Encontramos esta coincidencia en la base — confirmá si es la misma persona:
              </div>
              <div className="flex items-center gap-3 p-3" style={{ border: "1px solid var(--gl-olive)", borderRadius: "0.8rem", background: "var(--gl-olive-bg)" }}>
                <Avatar nombre={sugerida.nombre} apellido={sugerida.apellido} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-semibold" style={{ color: "var(--gl-ink)" }}>{sugerida.nombre} {sugerida.apellido}</div>
                  <div className="text-[12px]" style={{ color: "var(--gl-ink-3)" }}>{sugerida.ultimo_puesto ?? "—"}{sugerida.ubicacion ? ` · ${sugerida.ubicacion}` : ""}</div>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <BtnGhost onClick={onIrManual}>No es</BtnGhost>
                  <BtnOlive onClick={() => onConfirmar(sugerida.id)}>Confirmar</BtnOlive>
                </div>
              </div>
              <div className="mt-3 text-[12px]" style={{ color: "var(--gl-ink-3)" }}>
                ¿No es esta persona?{" "}
                <button type="button" onClick={onIrManual} className="font-semibold" style={{ color: "var(--gl-olive)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>Buscar a mano</button>
              </div>
            </>
          )}

          {vista === "search" && (
            <>
              {declarada && declarada.trim() && (
                <div className="text-[12.5px] mb-3" style={{ color: "var(--gl-ink-2)", lineHeight: 1.5 }}>
                  El CV menciona a <b style={{ color: "var(--gl-ink)" }}>&quot;{declarada}&quot;</b>, pero buscá y elegí a la persona correcta:
                </div>
              )}
              <input
                autoFocus
                value={query}
                onChange={(e) => onBuscar(e.target.value)}
                placeholder="Buscar candidato por nombre…"
                className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                style={{ border: "1px solid var(--gl-border-md)", color: "var(--gl-ink)", fontFamily: "inherit" }}
              />
              <div className="mt-2 flex flex-col gap-0.5" style={{ maxHeight: 300, overflowY: "auto" }}>
                {resultados.length === 0 ? (
                  <div className="text-[12.5px] px-1 py-2" style={{ color: "var(--gl-ink-3)" }}>
                    {query.trim() ? `No hay candidatos que coincidan con "${query}".` : "No hay otros candidatos en la base."}
                  </div>
                ) : (
                  resultados.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onConfirmar(c.id)}
                      className="flex items-center gap-3 p-2 rounded-lg text-left"
                      style={{ background: "none", border: "none", cursor: "pointer" }}
                    >
                      <Avatar nombre={c.nombre} apellido={c.apellido} />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold" style={{ color: "var(--gl-ink)" }}>{c.nombre} {c.apellido}</div>
                        <div className="text-[11.5px]" style={{ color: "var(--gl-ink-3)" }}>{c.ultimo_puesto ?? "—"}{c.estado_civil ? ` · ${c.estado_civil}` : ""}</div>
                      </div>
                      <span className="text-[11.5px] font-semibold shrink-0" style={{ color: "var(--gl-olive)" }}>Vincular</span>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

const AVATAR_HEX = [
  { bg: "#dafbe1", c: "#1a7f37" }, { bg: "#ddf4ff", c: "#0550ae" },
  { bg: "#ffd8eb", c: "#99286e" }, { bg: "#fff8c5", c: "#7d4e00" }, { bg: "#eddeff", c: "#6e40c9" },
]
function Avatar({ nombre, apellido }: { nombre: string; apellido: string }) {
  const p = AVATAR_HEX[((nombre.charCodeAt(0) || 0) + (apellido.charCodeAt(0) || 0)) % AVATAR_HEX.length]
  return (
    <div className="grid place-items-center rounded-full shrink-0" style={{ width: 36, height: 36, background: p.bg, color: p.c, fontWeight: 700, fontSize: 13 }}>
      {initials(nombre, apellido)}
    </div>
  )
}
function BtnOlive({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="text-[12px] font-semibold px-2.5 py-1.5 rounded-md whitespace-nowrap" style={{ background: "var(--gl-olive)", color: "#fff", border: "1px solid var(--gl-olive)", cursor: "pointer", fontFamily: "inherit" }}>{children}</button>
}
function BtnGhost({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="text-[12px] font-semibold px-2.5 py-1.5 rounded-md whitespace-nowrap" style={{ background: "#fff", color: "var(--gl-ink-2)", border: "1px solid var(--gl-border-md)", cursor: "pointer", fontFamily: "inherit" }}>{children}</button>
}
