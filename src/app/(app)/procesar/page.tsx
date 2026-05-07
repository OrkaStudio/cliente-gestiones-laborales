"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Sparkles, Upload, Loader2, Check, AlertTriangle,
  ArrowRight, FileText, RotateCcw, User, Briefcase,
  MapPin, GraduationCap, MessageSquare, Tractor,
} from "lucide-react"
import { guardarCandidatoProcesado } from "@/lib/actions/candidatos"
import type { CVParseado } from "@/lib/cv/parse"

// ─── Constantes ───────────────────────────────────────────────────────────────

const FASES = [
  "Leyendo el CV",
  "Identificando experiencias",
  "Extrayendo datos personales",
  "Generando preguntas de entrevista",
]

const AVATAR_HEX = [
  { bg: "#dafbe1", color: "#1a7f37" },
  { bg: "#ddf4ff", color: "#0550ae" },
  { bg: "#ffd8eb", color: "#99286e" },
  { bg: "#fff8c5", color: "#7d4e00" },
  { bg: "#eddeff", color: "#6e40c9" },
]

const CAMPOS_QUE_EXTRAE = [
  { icon: User,          label: "Nombre, teléfono, email, fecha de nac." },
  { icon: MapPin,        label: "Ubicación y movilidad geográfica" },
  { icon: Briefcase,     label: "Experiencia laboral ordenada" },
  { icon: Tractor,       label: "Tipos de ganadería y hectáreas máximas" },
  { icon: GraduationCap, label: "Formación y nivel educativo" },
  { icon: MessageSquare, label: "Preguntas sugeridas para la entrevista" },
]

const CV_EJEMPLO = `Joaquin Chebaia
Olavarria, Bs As - 28 anios

Experiencia
2022-actualidad: Estancia La Esperanza - Encargado.
Manejo cria + invernada. 3 peones a cargo.
Pasturas, silaje, sanidad, recorridas diarias.

2018-2022: Cabana San Antonio - Peon general.
Hacienda Aberdeen Angus. Tareas de campo.
Alambrado.

Educacion: Tec. Agropecuario - Esc. Agrotecnica Olavarria 2014.
Disponible inmediato. Acepto mudarme.
Telefono: 2284-555-0123`

function avatarPal(nombre: string, apellido: string) {
  const idx = ((nombre.charCodeAt(0) ?? 0) + (apellido.charCodeAt(0) ?? 0)) % AVATAR_HEX.length
  return AVATAR_HEX[idx]
}

// ─── Helpers de presentación ─────────────────────────────────────────────────

function CampoRow({ label, value }: { label: string; value?: string | number | boolean | null }) {
  if (value === null || value === undefined || value === "") return null
  const display = typeof value === "boolean" ? (value ? "Sí" : "No") : String(value)
  return (
    <div
      className="grid items-baseline py-2.5"
      style={{ gridTemplateColumns: "160px 1fr", columnGap: 16, borderBottom: "1px solid var(--gl-border)" }}
    >
      <span style={{ fontSize: 11.5, color: "var(--gl-ink-3)" }}>{label}</span>
      <span style={{ fontSize: 13, color: "var(--gl-ink)" }}>{display}</span>
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl" style={{ background: "#fff", border: "1px solid var(--gl-border)", overflow: "hidden" }}>
      <div className="flex items-center gap-2.5 px-6 py-4" style={{ borderBottom: "1px solid var(--gl-border)" }}>
        <div style={{ width: 3, height: 14, borderRadius: 2, background: "var(--gl-olive)", flexShrink: 0 }} />
        <span className="font-bold uppercase tracking-[0.18em]" style={{ fontSize: 10, color: "var(--gl-olive)" }}>
          {title}
        </span>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

type Step = "input" | "procesando" | "resultado"

export default function ProcesarPage() {
  const router  = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step,      setStep]      = useState<Step>("input")
  const [cvText,    setCvText]    = useState(CV_EJEMPLO)
  const [archivo,   setArchivo]   = useState<File | null>(null)
  const [faseIdx,   setFaseIdx]   = useState(0)
  const [resultado, setResultado] = useState<CVParseado | null>(null)
  const [error,     setError]     = useState<string | null>(null)
  const [saving,    startSave]    = useTransition()

  const procesando = step === "procesando"

  async function procesar() {
    setError(null)
    setStep("procesando")
    setFaseIdx(0)

    const interval = setInterval(() =>
      setFaseIdx(p => Math.min(p + 1, FASES.length - 2)), 2500
    )

    try {
      const fd = new FormData()
      if (archivo) fd.append("archivo", archivo)
      else         fd.append("texto",   cvText)

      const res  = await fetch("/api/procesar", { method: "POST", body: fd })
      const json = await res.json()

      if (res.status === 401) throw new Error("No autorizado. Iniciá sesión para procesar CVs.")
      if (!res.ok) throw new Error(json.detail ?? json.error ?? "Error desconocido")

      setFaseIdx(FASES.length - 1)
      setResultado(json as CVParseado)
      setTimeout(() => setStep("resultado"), 400)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setStep("input")
    } finally {
      clearInterval(interval)
    }
  }

  function guardar() {
    if (!resultado) return
    startSave(async () => {
      const res = await guardarCandidatoProcesado(resultado)
      if (!res.success) { setError(res.error); return }
      router.push(`/candidatos/${res.id}`)
    })
  }

  function reiniciar() {
    setStep("input")
    setResultado(null)
    setError(null)
    setArchivo(null)
    setFaseIdx(0)
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
          Pegá el texto crudo o subí un PDF. La IA extrae todos los campos y genera preguntas de entrevista.
        </p>
      </header>

      {/* 2 columnas — se estiran para llenar el espacio restante */}
      <div
        className="grid gap-6"
        style={{
          gridTemplateColumns: "440px 1fr",
          flex: 1,
          alignItems: "stretch",
          minHeight: 0,
        }}
      >
        {/* ── IZQUIERDA: input, sticky ── */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              position:      "sticky",
              top:           24,
              flex:          1,
              display:       "flex",
              flexDirection: "column",
              opacity:       procesando ? 0.55 : 1,
              transition:    "opacity 0.3s",
              pointerEvents: procesando ? "none" : "auto",
            }}
          >
            <div
              className="rounded-2xl"
              style={{
                flex:          1,
                display:       "flex",
                flexDirection: "column",
                border:        "1px solid var(--gl-border)",
                background:    "#fff",
                overflow:      "hidden",
              }}
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

              {/* Cuerpo — crece para llenar el espacio */}
              {archivo ? (
                <div
                  className="flex items-center gap-3 px-5"
                  style={{ flex: 1, paddingTop: "2rem", paddingBottom: "2rem", alignSelf: "flex-start", width: "100%" }}
                >
                  <div
                    className="h-10 w-10 rounded-xl grid place-items-center shrink-0"
                    style={{ background: "var(--gl-olive-bg)" }}
                  >
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
                    style={{
                      flex:       1,
                      resize:     "none",
                      fontSize:   13.5,
                      lineHeight: 1.75,
                      color:      "var(--gl-ink-2)",
                      background: "transparent",
                      minHeight:  0,
                    }}
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
                  disabled={procesando || (!cvText.trim() && !archivo)}
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

        {/* ── DERECHA: empty / procesando / resultado ── */}
        <div style={{ display: "flex", flexDirection: "column" }}>

          {/* Empty state */}
          {step === "input" && !error && (
            <div
              className="rounded-2xl"
              style={{
                flex:           1,
                display:        "flex",
                flexDirection:  "column",
                border:         "1.5px dashed var(--gl-border-md)",
                padding:        "2rem",
              }}
            >
              <p className="text-xs font-bold uppercase tracking-[0.2em] mb-6" style={{ color: "var(--gl-ink-3)" }}>
                Qué extrae la IA
              </p>
              <div className="space-y-4">
                {CAMPOS_QUE_EXTRAE.map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div
                      className="h-8 w-8 rounded-lg grid place-items-center shrink-0"
                      style={{ background: "var(--gl-olive-bg)" }}
                    >
                      <Icon className="h-3.5 w-3.5" style={{ color: "var(--gl-olive)" }} />
                    </div>
                    <span style={{ fontSize: 13, color: "var(--gl-ink-2)" }}>{label}</span>
                  </div>
                ))}
              </div>
              <div style={{ flex: 1 }} />
              <div
                className="rounded-xl px-4 py-3 mt-6"
                style={{ background: "var(--gl-olive-bg)" }}
              >
                <p className="text-[12px] leading-relaxed" style={{ color: "var(--gl-olive)" }}>
                  El resultado aparece acá. Podés revisarlo antes de guardar en la base.
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {step === "input" && error && (
            <div
              className="rounded-2xl"
              style={{ flex: 1, display: "flex", flexDirection: "column" }}
            >
              <div
                className="rounded-2xl p-6"
                style={{ background: "var(--gl-red-bg)", border: "1px solid #f1aeb5" }}
              >
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
            </div>
          )}

          {/* Procesando */}
          {step === "procesando" && (
            <div className="rounded-2xl" style={{ background: "#fff", border: "1px solid var(--gl-border)" }}>
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
          )}

          {/* Resultado */}
          {step === "resultado" && resultado && (
            <div className="space-y-4">

              <div
                className="flex items-center gap-3 rounded-2xl px-5 py-3.5"
                style={{ background: "var(--gl-green-bg)", border: "1px solid #a8e6c0" }}
              >
                <div className="h-7 w-7 rounded-full grid place-items-center shrink-0" style={{ background: "#1a7f37" }}>
                  <Check className="h-3.5 w-3.5" style={{ color: "#fff" }} />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-semibold" style={{ color: "#1a7f37" }}>CV procesado correctamente</span>
                  <span className="text-xs ml-3" style={{ color: "#1a7f37", opacity: 0.75 }}>
                    {resultado.experiencia.length} experiencia{resultado.experiencia.length !== 1 ? "s" : ""} ·{" "}
                    {resultado.preguntas_sugeridas.length} preguntas
                  </span>
                </div>
              </div>

              {(() => {
                const pal = avatarPal(resultado.nombre, resultado.apellido)
                return (
                  <div
                    className="rounded-2xl p-5 flex items-center gap-4"
                    style={{ background: "#fff", border: "1px solid var(--gl-border)" }}
                  >
                    <div
                      className="h-14 w-14 rounded-full grid place-items-center text-lg font-bold shrink-0"
                      style={{ background: pal.bg, color: pal.color }}
                    >
                      {resultado.nombre[0]}{resultado.apellido[0]}
                    </div>
                    <div>
                      <div className="text-xl font-bold" style={{ color: "var(--gl-ink)", letterSpacing: "-0.01em" }}>
                        {resultado.nombre} {resultado.apellido}
                      </div>
                      <div className="text-sm mt-0.5" style={{ color: "var(--gl-ink-3)" }}>
                        {[resultado.ultimo_puesto, resultado.ubicacion].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                  </div>
                )
              })()}

              <SectionCard title="Datos extraídos">
                <div>
                  <CampoRow label="Teléfono"        value={resultado.telefono} />
                  <CampoRow label="Email"           value={resultado.email} />
                  <CampoRow label="Fecha de nac."   value={resultado.fecha_nacimiento} />
                  <CampoRow label="Ubicación"       value={resultado.ubicacion} />
                  <CampoRow label="Disponibilidad"  value={resultado.disponibilidad} />
                  <CampoRow label="Educación"       value={resultado.educacion} />
                  <CampoRow label="Pretensión"      value={resultado.pretension_salarial} />
                  <CampoRow label="Movilidad"       value={resultado.movilidad} />
                  {resultado.tipos_ganaderia.length > 0 && (
                    <CampoRow label="Ganadería"     value={resultado.tipos_ganaderia.join(", ")} />
                  )}
                  {resultado.hectareas_max && (
                    <CampoRow label="Hás. máx."     value={`${resultado.hectareas_max} ha`} />
                  )}
                  {resultado.personal_a_cargo_max && (
                    <CampoRow label="Pers. a cargo" value={`${resultado.personal_a_cargo_max}`} />
                  )}
                  {resultado.idiomas.length > 0 && (
                    <CampoRow label="Idiomas"       value={resultado.idiomas.join(", ")} />
                  )}
                </div>
              </SectionCard>

              {resultado.experiencia.length > 0 && (
                <SectionCard title="Experiencia laboral">
                  <div className="space-y-4">
                    {resultado.experiencia.map((exp, i) => (
                      <div key={i} className="pl-3.5" style={{ borderLeft: "2px solid var(--gl-border)" }}>
                        <div style={{ fontSize: 11, color: "var(--gl-olive)", fontWeight: 600, marginBottom: 2 }}>
                          {exp.desde} — {exp.hasta ?? "actual"}
                        </div>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--gl-ink)" }}>{exp.rol}</div>
                        <div style={{ fontSize: 12.5, color: "var(--gl-ink-2)", marginTop: 1 }}>{exp.empresa}</div>
                        {exp.descripcion && (
                          <p style={{ fontSize: 12.5, color: "var(--gl-ink-3)", lineHeight: 1.6, margin: "6px 0 0" }}>
                            {exp.descripcion}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {resultado.preguntas_sugeridas.length > 0 && (
                <SectionCard title="Preguntas sugeridas para la entrevista">
                  <div className="space-y-3">
                    {resultado.preguntas_sugeridas.map((p, i) => (
                      <div key={i} className="flex items-baseline gap-3">
                        <span
                          className="font-mono tabular-nums shrink-0"
                          style={{ fontSize: 11, color: "var(--gl-ink-3)", minWidth: 20 }}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <p style={{ fontSize: 13, color: "var(--gl-ink-2)", lineHeight: 1.55, margin: 0 }}>{p}</p>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {resultado.campos_faltantes.length > 0 && (
                <div
                  className="flex items-start gap-3 rounded-xl px-4 py-3"
                  style={{ background: "var(--gl-amber-bg)", border: "1px solid #e3c06e" }}
                >
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "var(--gl-amber)" }} />
                  <div>
                    <p className="text-[12px] font-semibold" style={{ color: "var(--gl-amber)" }}>
                      Campos no encontrados en el CV
                    </p>
                    <p className="text-[11.5px] mt-0.5" style={{ color: "var(--gl-amber)" }}>
                      {resultado.campos_faltantes.join(", ")} — podés completarlos editando el perfil después de guardar.
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div
                  className="flex items-start gap-3 rounded-xl px-4 py-3"
                  style={{ background: "var(--gl-red-bg)", border: "1px solid #f1aeb5" }}
                >
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "var(--gl-red)" }} />
                  <p className="text-sm" style={{ color: "var(--gl-red)" }}>{error}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={reiniciar}
                  className="inline-flex items-center gap-2 text-sm font-medium transition-colors"
                  style={{ color: "var(--gl-ink-3)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--gl-ink)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--gl-ink-3)")}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Procesar otro
                </button>

                <button
                  onClick={guardar}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-[13.5px] font-semibold transition-all disabled:opacity-70"
                  style={{
                    background: "var(--gl-olive)",
                    color:      "#fff",
                    boxShadow:  "0 2px 10px rgba(42,74,24,0.28)",
                    border:     "none",
                    cursor:     saving ? "not-allowed" : "pointer",
                  }}
                  onMouseEnter={(e) => { if (!saving) e.currentTarget.style.opacity = "0.88" }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = "1" }}
                >
                  {saving
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Guardando…</>
                    : <><ArrowRight className="h-3.5 w-3.5" /> Guardar en la base</>
                  }
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
