"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Sparkles, Upload, Loader2, Check, AlertTriangle,
  FileText, User, Briefcase,
  MapPin, GraduationCap, MessageSquare, Tractor,
} from "lucide-react"
import { guardarCandidatoProcesado } from "@/lib/actions/candidatos"
import type { CVParseado } from "@/lib/cv/parse"

// ─── Constantes ───────────────────────────────────────────────────────────────

const FASES = [
  "Leyendo el CV",
  "Identificando experiencias",
  "Extrayendo datos personales",
  "Generando preguntas para la planilla",
  "Guardando en la base de datos",
]

const CAMPOS_QUE_EXTRAE = [
  { icon: User,          label: "Nombre, DNI, estado civil, situación familiar" },
  { icon: MapPin,        label: "Domicilio completo, vehículo, licencia, animales" },
  { icon: Briefcase,     label: "Experiencia con propietario, fechas y hectáreas" },
  { icon: Tractor,       label: "Tipos de ganadería y dimensión del establecimiento" },
  { icon: GraduationCap, label: "Formación y nivel educativo" },
  { icon: MessageSquare, label: "Preguntas para completar la planilla GL" },
]

// ─── Helpers de presentación ─────────────────────────────────────────────────

// ─── Página ───────────────────────────────────────────────────────────────────

type Step = "input" | "procesando"

export default function ProcesarPage() {
  const router  = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step,      setStep]     = useState<Step>("input")
  const [cvText,    setCvText]   = useState("")
  const [archivo,   setArchivo]  = useState<File | null>(null)
  const [faseIdx,   setFaseIdx]  = useState(0)
  const [error,     setError]    = useState<string | null>(null)
  const [savedId,   setSavedId]  = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [,          startSave]   = useTransition()

  const procesando = step === "procesando"

  // Navegar al perfil en cuanto se guarda
  useEffect(() => {
    if (savedId) router.push(`/candidatos/${savedId}`)
  }, [savedId, router])

  // Warning al cerrar/refrescar mientras procesa
  useEffect(() => {
    if (!procesando) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = "" }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [procesando])

  async function procesar() {
    setError(null)
    setSavedId(null)
    setSaveError(null)
    setStep("procesando")
    setFaseIdx(0)

    // Anima hasta la fase "Generando preguntas" (índice 3), la última la controlamos manualmente
    const interval = setInterval(() =>
      setFaseIdx(p => Math.min(p + 1, FASES.length - 3)), 2500
    )

    try {
      const fd = new FormData()
      if (archivo) fd.append("archivo", archivo)
      else         fd.append("texto",   cvText)

      const res  = await fetch("/api/procesar", { method: "POST", body: fd })
      const json = await res.json()

      if (res.status === 401) throw new Error("No autorizado. Iniciá sesión para procesar CVs.")
      if (!res.ok) throw new Error(json.detail ?? json.error ?? "Error desconocido")

      clearInterval(interval)
      const parsedResult = json as CVParseado

      // Mostrar "Generando preguntas" como completada, luego "Guardando"
      setFaseIdx(FASES.length - 2)
      await new Promise(r => setTimeout(r, 400))
      setFaseIdx(FASES.length - 1)

      startSave(async () => {
        const saveRes = await guardarCandidatoProcesado(parsedResult)
        if (saveRes.success) {
          setSavedId(saveRes.id)  // useEffect navega al perfil
        } else {
          setSaveError(saveRes.error ?? "Error al guardar")
          setStep("input")
        }
      })
    } catch (err) {
      clearInterval(interval)
      setError(err instanceof Error ? err.message : String(err))
      setStep("input")
    }
  }

  function reiniciar() {
    setStep("input")
    setError(null)
    setSaveError(null)
    setArchivo(null)
    setFaseIdx(0)
    setSavedId(null)
    setCvText("")
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      className="px-10 py-10"
      style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}
    >
      {/* Header */}
      <header className="mb-8 shrink-0">
        <div
          className="inline-flex items-center gap-1.5 mb-3 px-2.5 py-1 rounded-full"
          style={{ background: "var(--gl-olive-bg)" }}
        >
          <Sparkles className="h-3 w-3" style={{ color: "var(--gl-olive)" }} />
          <span className="font-bold uppercase tracking-[0.18em]" style={{ fontSize: 9.5, color: "var(--gl-olive)" }}>
            Asistente IA
          </span>
        </div>
        <h1
          className="font-bold leading-[1.1] tracking-tight"
          style={{ fontSize: "clamp(2rem, 4vw, 2.75rem)", color: "var(--gl-ink)" }}
        >
          Procesar un CV
        </h1>
        <p className="text-sm mt-2 leading-relaxed" style={{ color: "var(--gl-ink-3)" }}>
          Pegá el texto crudo o subí un PDF. La IA extrae todos los campos y genera las preguntas para completar la planilla.
        </p>
      </header>

      {/* ── Layout input ── */}
      {step === "input" && (
        <div
          className="grid gap-6"
          style={{ gridTemplateColumns: "440px 1fr", alignItems: "start" }}
        >
          {/* IZQUIERDA: input */}
          <div>
            <div style={{ position: "sticky", top: 24 }}>
              <div
                className="rounded-2xl"
                style={{ height: "360px", display: "flex", flexDirection: "column", border: "1px solid var(--gl-border)", background: "#fff", overflow: "hidden" }}
              >
                {/* Header del card */}
                <div
                  className="flex items-center justify-between px-5 py-3 shrink-0"
                  style={{ borderBottom: "1px solid var(--gl-border)" }}
                >
                  <div className="flex items-center gap-2">
                    <div style={{ width: 3, height: 14, borderRadius: 2, background: "var(--gl-olive)", flexShrink: 0 }} />
                    <span className="font-bold uppercase tracking-[0.18em]" style={{ fontSize: 10, color: "var(--gl-olive)" }}>
                      {archivo ? "Archivo seleccionado" : "CV crudo"}
                    </span>
                  </div>
                  {archivo && (
                    <button
                      onClick={() => { setArchivo(null); if (fileRef.current) fileRef.current.value = "" }}
                      className="text-[11px] font-medium"
                      style={{ color: "var(--gl-ink-3)", background: "none", border: "none", cursor: "pointer" }}
                    >
                      Quitar archivo
                    </button>
                  )}
                </div>

                {/* Cuerpo */}
                {archivo ? (
                  <div
                    className="flex items-center gap-3 px-5"
                    style={{ flex: 1, paddingTop: "2rem", paddingBottom: "2rem", alignSelf: "flex-start", width: "100%" }}
                  >
                    <div className="h-10 w-10 rounded-xl grid place-items-center shrink-0" style={{ background: "var(--gl-olive-bg)" }}>
                      <FileText className="h-5 w-5" style={{ color: "var(--gl-olive)" }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--gl-ink)" }}>{archivo.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--gl-ink-3)" }}>
                        {(archivo.size / 1024).toFixed(0)} KB · listo para procesar
                      </p>
                    </div>
                  </div>
                ) : (
                  <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
                    <textarea
                      value={cvText}
                      onChange={(e) => setCvText(e.target.value)}
                      className="w-full outline-none px-5 py-4 leading-relaxed"
                      style={{ flex: 1, resize: "none", fontSize: 13.5, lineHeight: 1.75, color: "var(--gl-ink-2)", background: "transparent", minHeight: 0 }}
                      placeholder="Pegá el texto del CV acá..."
                    />
                  </div>
                )}

                {/* Footer */}
                <div
                  className="flex items-center justify-between px-5 py-3 shrink-0"
                  style={{ borderTop: "1px solid var(--gl-border)" }}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.docx,.doc,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) { setArchivo(f); setCvText("") }
                    }}
                  />
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[12.5px] font-medium transition-colors"
                    style={{ color: "var(--gl-ink-3)", border: "1px solid var(--gl-border-md)", background: "transparent" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "var(--gl-ink)"; e.currentTarget.style.borderColor = "var(--gl-ink-3)" }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "var(--gl-ink-3)"; e.currentTarget.style.borderColor = "var(--gl-border-md)" }}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Subir PDF / DOCX
                  </button>
                  <button
                    onClick={procesar}
                    disabled={!cvText.trim() && !archivo}
                    className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-semibold transition-all disabled:opacity-40"
                    style={{ background: "var(--gl-olive)", color: "#fff", boxShadow: "0 2px 8px rgba(42,74,24,0.25)" }}
                    onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.opacity = "0.88" }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = "1" }}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Procesar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* DERECHA: info o error */}
          <div>
            {!error ? (
              <div
                className="rounded-2xl"
                style={{ display: "flex", flexDirection: "column", border: "1.5px dashed var(--gl-border-md)", padding: "2rem" }}
              >
                <p className="text-xs font-bold uppercase tracking-[0.2em] mb-6" style={{ color: "var(--gl-ink-3)" }}>
                  Qué extrae la IA
                </p>
                <div className="space-y-4">
                  {CAMPOS_QUE_EXTRAE.map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg grid place-items-center shrink-0" style={{ background: "var(--gl-olive-bg)" }}>
                        <Icon className="h-3.5 w-3.5" style={{ color: "var(--gl-olive)" }} />
                      </div>
                      <span style={{ fontSize: 13, color: "var(--gl-ink-2)" }}>{label}</span>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl px-4 py-3 mt-6" style={{ background: "var(--gl-olive-bg)" }}>
                  <p className="text-[12px] leading-relaxed" style={{ color: "var(--gl-olive)" }}>
                    El CV se guarda automáticamente al procesar. Podés cerrar la pestaña sin perder datos.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl p-6" style={{ background: "var(--gl-red-bg)", border: "1px solid #f1aeb5" }}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "var(--gl-red)" }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--gl-red)" }}>Error al procesar</p>
                    <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--gl-red)" }}>{error}</p>
                  </div>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="mt-4 text-[12px] font-medium"
                  style={{ color: "var(--gl-red)", background: "none", border: "none", cursor: "pointer", padding: 0, opacity: 0.75 }}
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Layout procesando: centrado full-page ── */}
      {step === "procesando" && (
        <div
          style={{
            flex:           1,
            display:        "flex",
            flexDirection:  "column",
            alignItems:     "center",
            justifyContent: "center",
            gap:            "2rem",
            padding:        "2rem 0",
          }}
        >
          {/* Título */}
          <div style={{ textAlign: "center" }}>
            <div
              className="inline-flex items-center gap-1.5 mb-4 px-2.5 py-1 rounded-full"
              style={{ background: "var(--gl-olive-bg)" }}
            >
              <Loader2 className="h-3 w-3 animate-spin" style={{ color: "var(--gl-olive)" }} />
              <span className="font-bold uppercase tracking-[0.18em]" style={{ fontSize: 9.5, color: "var(--gl-olive)" }}>
                Asistente IA
              </span>
            </div>
            <h2
              className="font-bold leading-tight"
              style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", color: "var(--gl-ink)", letterSpacing: "-0.01em" }}
            >
              Analizando el CV…
            </h2>
            <p className="text-sm mt-2" style={{ color: "var(--gl-ink-3)" }}>
              Esto tarda unos segundos. No cerrés la pestaña.
            </p>
          </div>

          {/* Card de fases */}
          <div
            className="rounded-2xl w-full"
            style={{ maxWidth: "440px", background: "#fff", border: "1px solid var(--gl-border)" }}
          >
            <div
              className="flex items-center gap-3 px-6 py-4"
              style={{ borderBottom: "1px solid var(--gl-border)" }}
            >
              <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--gl-olive)" }} />
              <span className="text-sm font-semibold" style={{ color: "var(--gl-ink)" }}>
                Procesando CV con IA…
              </span>
              <span className="ml-auto font-mono text-[11px] tabular-nums" style={{ color: "var(--gl-ink-3)" }}>
                {faseIdx + 1} / {FASES.length}
              </span>
            </div>
            <div className="px-6 py-2">
              {FASES.map((fase, i) => (
                <div
                  key={fase}
                  className="flex items-center gap-3 py-3"
                  style={{
                    borderBottom: i < FASES.length - 1 ? "1px solid var(--gl-border)" : "none",
                    opacity:      i > faseIdx ? 0.3 : 1,
                    transition:   "opacity 0.3s",
                  }}
                >
                  {i < faseIdx ? (
                    <div className="h-5 w-5 rounded-full grid place-items-center shrink-0" style={{ background: "var(--gl-green-bg)" }}>
                      <Check className="h-3 w-3" style={{ color: "var(--gl-green)" }} />
                    </div>
                  ) : i === faseIdx ? (
                    <div className="h-5 w-5 rounded-full grid place-items-center shrink-0" style={{ background: "var(--gl-olive-bg)" }}>
                      <Loader2 className="h-3 w-3 animate-spin" style={{ color: "var(--gl-olive)" }} />
                    </div>
                  ) : (
                    <div className="h-5 w-5 rounded-full shrink-0" style={{ background: "var(--gl-border)" }} />
                  )}
                  <span className="text-sm" style={{ color: i <= faseIdx ? "var(--gl-ink)" : "var(--gl-ink-3)" }}>
                    {fase}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
