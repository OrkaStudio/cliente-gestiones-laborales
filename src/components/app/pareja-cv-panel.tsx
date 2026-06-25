"use client"

import { useState, useTransition } from "react"
import { FileText, ArrowLeftRight, Sparkles } from "lucide-react"
import {
  getOrCreatePareja,
  setPrincipalPareja,
  updateSituacionFamiliar,
  generarSituacionFamiliar,
  type ParejaContexto,
} from "@/lib/actions/parejas"

export function ParejaCvPanel({ candidatoId }: { candidatoId: string }) {
  const [open, setOpen] = useState(false)
  const [ctx, setCtx] = useState<ParejaContexto | null>(null)
  const [texto, setTexto] = useState("")
  const [isPending, start] = useTransition()
  const [savedMsg, setSavedMsg] = useState<string | null>(null)

  function abrir() {
    setOpen(true); setCtx(null); setSavedMsg(null)
    start(async () => {
      const r = await getOrCreatePareja(candidatoId)
      if (r.ok) { setCtx(r.ctx); setTexto(r.ctx.pareja.situacion_familiar ?? "") }
    })
  }
  function cerrar() { setOpen(false) }

  const principalId = ctx ? (ctx.pareja.principal_id ?? ctx.a.id) : null
  const principal = ctx ? (principalId === ctx.a.id ? ctx.a : ctx.b) : null
  const otro      = ctx ? (principalId === ctx.a.id ? ctx.b : ctx.a) : null

  function intercambiar() {
    if (!ctx || !otro) return
    start(async () => {
      await setPrincipalPareja(ctx.pareja.id, otro.id)
      setCtx({ ...ctx, pareja: { ...ctx.pareja, principal_id: otro.id } })
    })
  }
  function generar() {
    if (!ctx) return
    setSavedMsg(null)
    start(async () => {
      const r = await generarSituacionFamiliar(ctx.pareja.id)
      if (r.ok) { setTexto(r.texto); setSavedMsg("Borrador generado — revisalo y guardá") }
    })
  }
  function guardar() {
    if (!ctx) return
    start(async () => {
      await updateSituacionFamiliar(ctx.pareja.id, texto)
      setSavedMsg("Guardado")
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        className="inline-flex items-center gap-1 text-[12px] font-semibold"
        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--gl-olive)" }}
      >
        <FileText style={{ width: 12, height: 12 }} /> CV de la pareja
      </button>

      {open && (
        <>
          <div onClick={cerrar} style={{ position: "fixed", inset: 0, background: "rgba(13,17,23,0.42)", zIndex: 70 }} />
          <div role="dialog" aria-label="CV de la pareja" style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            width: "min(520px, 94vw)", maxHeight: "88vh", overflowY: "auto",
            background: "#fff", borderRadius: "1rem", boxShadow: "0 24px 64px rgba(13,17,23,0.28)", zIndex: 71,
          }}>
            <div className="flex items-center justify-between gap-4 px-5 py-4" style={{ borderBottom: "1px solid var(--gl-border)" }}>
              <h3 className="text-[15px] font-bold" style={{ color: "var(--gl-ink)" }}>CV de la pareja</h3>
              <button type="button" onClick={cerrar} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--gl-ink-3)", fontSize: 20, lineHeight: 1 }}>×</button>
            </div>

            <div className="px-5 py-5">
              {!ctx ? (
                <div className="text-[13px]" style={{ color: "var(--gl-ink-3)" }}>Cargando…</div>
              ) : (
                <>
                  {/* Principal */}
                  <div className="flex items-center justify-between gap-3 p-3 rounded-xl" style={{ background: "var(--gl-olive-bg)", marginBottom: 16 }}>
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--gl-ink-3)" }}>Principal (CV completo)</div>
                      <div className="text-[14px] font-semibold" style={{ color: "var(--gl-ink)" }}>{principal!.nombre} {principal!.apellido}</div>
                      <div className="text-[11.5px]" style={{ color: "var(--gl-ink-3)" }}>Pareja (condensada): {otro!.nombre} {otro!.apellido}</div>
                    </div>
                    <button type="button" onClick={intercambiar} disabled={isPending}
                      className="inline-flex items-center gap-1 text-[12px] font-semibold px-2.5 py-1.5 rounded-lg shrink-0"
                      style={{ background: "#fff", border: "1px solid var(--gl-border-md)", color: "var(--gl-ink-2)", cursor: "pointer" }}>
                      <ArrowLeftRight style={{ width: 12, height: 12 }} /> Intercambiar
                    </button>
                  </div>

                  {/* Situación Familiar */}
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--gl-ink-3)" }}>Situación Familiar</label>
                    <button type="button" onClick={generar} disabled={isPending}
                      className="inline-flex items-center gap-1 text-[11.5px] font-semibold"
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--gl-olive)" }}>
                      <Sparkles style={{ width: 11, height: 11 }} /> {isPending ? "…" : "Generar borrador (IA)"}
                    </button>
                  </div>
                  <textarea
                    value={texto}
                    onChange={(e) => { setTexto(e.target.value); setSavedMsg(null) }}
                    placeholder="Narrativa de la pareja para el CV (convivencia, familia, motivo de búsqueda). Generá un borrador con IA o escribilo."
                    rows={5}
                    className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                    style={{ border: "1px solid var(--gl-border-md)", color: "var(--gl-ink)", fontFamily: "inherit", lineHeight: 1.5, resize: "vertical" }}
                  />

                  <div className="flex items-center justify-between mt-4">
                    <div className="text-[12px]" style={{ color: "var(--gl-olive)" }}>{savedMsg}</div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={guardar} disabled={isPending}
                        className="text-[12.5px] font-semibold px-3 py-1.5 rounded-lg"
                        style={{ background: "#fff", border: "1px solid var(--gl-border-md)", color: "var(--gl-ink-2)", cursor: "pointer" }}>
                        Guardar
                      </button>
                      <a href={`/api/parejas/${ctx.pareja.id}/cv/pdf`} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-3 py-1.5 rounded-lg no-underline"
                        style={{ background: "var(--gl-olive)", color: "#fff" }}>
                        <FileText style={{ width: 13, height: 13 }} /> Descargar CV de la pareja
                      </a>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
