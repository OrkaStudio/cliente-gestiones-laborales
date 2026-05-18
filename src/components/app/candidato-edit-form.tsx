"use client"

import { useState, useTransition, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, Loader2, Save, ChevronDown } from "lucide-react"
import { updateCandidatoFields, eliminarCandidato } from "@/lib/actions/candidatos"
import type { Tables } from "@/lib/supabase/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

type Candidato = Tables<"candidatos">

// ─── Estilos base ─────────────────────────────────────────────────────────────

const OLIVE      = "#2a4a18"
const OLIVE_BG   = "#eef5e8"
const INK        = "#0d1117"
const INK3       = "#8b949e"
const BORDER     = "#eaecef"
const BORDER_MD  = "#d4d8de"
const SURFACE    = "#ffffff"

const inputStyle: React.CSSProperties = {
  width:        "100%",
  border:       `1px solid ${BORDER_MD}`,
  background:   SURFACE,
  color:        INK,
  borderRadius: "0.5rem",
  padding:      "0.5rem 0.75rem",
  fontSize:     "13.5px",
  fontFamily:   "inherit",
  outline:      "none",
  transition:   "border-color 0.15s, box-shadow 0.15s",
}

const labelStyle: React.CSSProperties = {
  display:       "block",
  fontSize:      "11px",
  fontWeight:    600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color:         INK3,
  marginBottom:  "0.375rem",
}

// ─── Componentes base ─────────────────────────────────────────────────────────

function Field({
  label, value, onChange, type = "text", placeholder, hint, multiline, required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  hint?: string
  multiline?: boolean
  required?: boolean
}) {
  const focusStyle = {
    borderColor: OLIVE,
    boxShadow:   `0 0 0 3px ${OLIVE_BG}`,
  }
  const blurStyle = {
    borderColor: BORDER_MD,
    boxShadow:   "none",
  }

  const sharedProps = {
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
    placeholder,
    required,
    style: inputStyle,
    onFocus:  (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => Object.assign(e.currentTarget.style, focusStyle),
    onBlur:   (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => Object.assign(e.currentTarget.style, blurStyle),
  }

  return (
    <div>
      <label style={labelStyle}>
        {label}
        {required && <span style={{ color: OLIVE, marginLeft: 2 }}>*</span>}
      </label>
      {multiline
        ? <textarea {...sharedProps} rows={3} style={{ ...inputStyle, resize: "vertical", minHeight: 80 }} />
        : <input   {...sharedProps} type={type} />
      }
      {hint && <p style={{ fontSize: 11, color: INK3, marginTop: 3 }}>{hint}</p>}
    </div>
  )
}

function BoolField({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean | null) => void }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <select
        value={value === true ? "si" : value === false ? "no" : ""}
        onChange={(e) => onChange(e.target.value === "si" ? true : e.target.value === "no" ? false : null)}
        style={inputStyle}
        onFocus={(e) => Object.assign(e.currentTarget.style, { borderColor: OLIVE, boxShadow: `0 0 0 3px ${OLIVE_BG}` })}
        onBlur={(e)  => Object.assign(e.currentTarget.style, { borderColor: BORDER_MD, boxShadow: "none" })}
      >
        <option value="">Sin datos</option>
        <option value="si">Sí</option>
        <option value="no">No</option>
      </select>
    </div>
  )
}

function Row({ children, cols = 2 }: { children: React.ReactNode; cols?: number }) {
  return <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: "0.75rem" }}>{children}</div>
}

function AccordionCard({
  title, summary, description, defaultOpen = true, children,
}: {
  title: string
  summary?: string
  description?: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ background: SURFACE, border: `1px solid ${BORDER_MD}`, borderRadius: 14, boxShadow: "0 1px 4px rgba(13,17,23,0.04)", overflow: "hidden" }}>
      <div
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0.875rem 1.25rem", cursor: "pointer", userSelect: "none",
          background: open ? SURFACE : "#f9fafb",
          borderBottom: open ? `1px solid ${BORDER}` : "none",
          transition: "background 0.15s",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: open ? OLIVE : INK3, transition: "color 0.15s" }}>
            {title}
          </span>
          {!open && summary && (
            <span style={{ fontSize: 12.5, color: INK3, marginLeft: "0.75rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {summary}
            </span>
          )}
        </div>
        <ChevronDown style={{ width: 15, height: 15, color: INK3, flexShrink: 0, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
      </div>
      {open && (
        <div style={{ padding: "1.25rem 1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          {description && (
            <div style={{ fontSize: 12, color: INK3, background: "#fffbeb", border: "1px solid #f0c000", borderRadius: 8, padding: "0.6rem 0.875rem", lineHeight: 1.5 }}>
              {description}
            </div>
          )}
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Categorías rurales ───────────────────────────────────────────────────────

const CATEGORIAS_GL = [
  // Gestión / Dirección
  "Administrador Rural", "Ingeniero Agrónomo", "Veterinario",
  "Contador/a Público/a Agro", "Asistente Administrativo/Contable Agro",
  // Encargados
  "Encargado General", "Encargado de Ganadería", "Encargado de Agricultura",
  "Encargado de Maquinarias", "Encargado Agrícola-Ganadero", "Encargado de Tambo",
  // Capataces
  "Capataz de Ganadería", "Capataz de Agricultura", "Capataz de Maquinarias",
  // Operarios
  "Tambero", "Inseminador", "Cabañero", "Tractorista",
  "Mecánico Tractorista", "Mixero", "Criancero o Guachero",
  // General
  "Peón General", "Puestero", "Caseros",
]

function ChipsField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string[]
  onChange: (v: string[]) => void
}) {
  function toggle(cat: string) {
    onChange(value.includes(cat) ? value.filter((c) => c !== cat) : [...value, cat])
  }

  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", marginTop: "0.25rem" }}>
        {CATEGORIAS_GL.map((cat) => {
          const selected = value.includes(cat)
          return (
            <button
              key={cat}
              type="button"
              onClick={() => toggle(cat)}
              style={{
                padding: "0.3rem 0.65rem",
                fontSize: "12px",
                fontWeight: selected ? 600 : 400,
                borderRadius: "99px",
                border: `1px solid ${selected ? OLIVE : BORDER_MD}`,
                background: selected ? OLIVE_BG : SURFACE,
                color: selected ? OLIVE : INK3,
                cursor: "pointer",
                transition: "all 0.12s",
                userSelect: "none",
              }}
            >
              {cat}
            </button>
          )
        })}
      </div>
      {value.length === 0 && (
        <p style={{ fontSize: 11, color: INK3, marginTop: 4 }}>Seleccioná las categorías que puede aplicar este candidato.</p>
      )}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

const B_FIELDS = new Set<keyof Candidato>([
  "disponibilidad", "pretension_salarial", "educacion", "perfil_laboral",
  "idiomas", "tipos_ganaderia", "ultimo_puesto", "estado_civil", "hijos",
  "movilidad", "vehiculo_propio", "licencia_conducir", "muebles_propios", "animales",
])

export function CandidatoEditForm({
  candidato: initial,
}: {
  candidato: Candidato
}) {
  const router  = useRouter()
  const [saving, startSave] = useTransition()

  const [c, setC]         = useState<Candidato>(initial)
  const [dirty, setDirty] = useState(false)
  const [bDirty, setBDirty] = useState(false)
  const dirtyRef = useRef(false)
  const [confirmState, setConfirmState] = useState<{ open: boolean; onConfirm: () => void }>({ open: false, onConfirm: () => {} })
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, startDelete] = useTransition()

  const askConfirm = useCallback((onConfirm: () => void) => {
    setConfirmState((s) => s.open ? s : { open: true, onConfirm })
  }, [])

  function markDirty() { setDirty(true); dirtyRef.current = true }
  function clearDirty() { setDirty(false); dirtyRef.current = false }

  const setField = useCallback(<K extends keyof Candidato>(key: K, val: Candidato[K]) => {
    setC((prev) => ({ ...prev, [key]: val }))
    markDirty()
    if (B_FIELDS.has(key)) setBDirty(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Bloquear navegación con cambios sin guardar ──

  // Intercepta cierre/recarga del browser (no SPA navigation)
  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = "" }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [dirty])

  // Intercepta botón Atrás del browser (popstate)
  useEffect(() => {
    if (!dirty) return
    window.history.pushState(null, "", window.location.href)
    function handlePopState() {
      if (!dirtyRef.current) return
      window.history.pushState(null, "", window.location.href)
      askConfirm(() => { clearDirty(); router.back() })
    }
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [dirty, router, askConfirm]) // eslint-disable-line react-hooks/exhaustive-deps

  // Intercepta clicks en links del sidebar / breadcrumbs (SPA navigation)
  useEffect(() => {
    if (!dirty) return
    function handleLinkClick(e: MouseEvent) {
      // Solo click izquierdo sin modificadores
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const anchor = (e.target as Element).closest("a[href]") as HTMLAnchorElement | null
      if (!anchor) return
      // Solo misma origen, diferente ruta
      try {
        const url = new URL(anchor.href, window.location.origin)
        if (url.origin !== window.location.origin) return
        if (url.pathname === window.location.pathname) return
      } catch { return }

      // Detener el evento antes de que Next.js lo procese (capture phase)
      e.preventDefault()
      e.stopPropagation()
      const href = anchor.href
      askConfirm(() => { clearDirty(); router.push(href) })
    }
    document.addEventListener("click", handleLinkClick, true)
    return () => document.removeEventListener("click", handleLinkClick, true)
  }, [dirty, router, askConfirm]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Guardar ──
  function handleSave() {
    startSave(async () => {
      const result = await updateCandidatoFields(c.id, {
        nombre: c.nombre, apellido: c.apellido, email: c.email, telefono: c.telefono,
        fecha_nacimiento: c.fecha_nacimiento, domicilio_completo: c.domicilio_completo,
        lugar_nacimiento: c.lugar_nacimiento, dni: c.dni, estado: c.estado,
        categorias: c.categorias ?? [],
        // Campos B
        estado_civil: c.estado_civil, hijos: c.hijos,
        vehiculo_propio: c.vehiculo_propio, licencia_conducir: c.licencia_conducir,
        muebles_propios: c.muebles_propios, animales: c.animales,
        educacion: c.educacion, perfil_laboral: c.perfil_laboral,
        pretension_salarial: c.pretension_salarial, disponibilidad: c.disponibilidad,
        movilidad: c.movilidad, tipos_ganaderia: c.tipos_ganaderia,
        idiomas: c.idiomas, ultimo_puesto: c.ultimo_puesto,
      })

      if (!result.success) {
        toast.error(`Error guardando: ${result.error}`)
        return
      }

      if (bDirty) {
        toast.info("Guardado. Si el CV debe reflejar estos cambios, actualizalo desde la ficha del candidato.")
      } else {
        toast.success("Datos guardados")
      }
      clearDirty()
      setBDirty(false)
      router.push(`/candidatos/${c.id}`)
      router.refresh()
    })
  }

  function handleCancel() {
    if (dirtyRef.current) { askConfirm(() => { clearDirty(); router.push(`/candidatos/${c.id}`) }); return }
    router.push(`/candidatos/${c.id}`)
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", background: "var(--gl-bg)" }}>

      {/* Top bar sticky */}
      <div style={{
        position:       "sticky", top: 0, zIndex: 30,
        background:     SURFACE, borderBottom: `1px solid ${BORDER}`,
        boxShadow:      "0 2px 12px rgba(13,17,23,0.06)",
        padding:        "0.875rem 2rem",
        display:        "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button
            type="button"
            onClick={handleCancel}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: INK3, background: "transparent", border: "none", cursor: "pointer", padding: "4px 0" }}
          >
            <ArrowLeft style={{ width: 14, height: 14 }} />
            Cancelar
          </button>
          <div style={{ width: 1, height: 18, background: BORDER }} />
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: OLIVE, lineHeight: 1 }}>Editando perfil</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: INK, marginTop: 2 }}>{c.nombre} {c.apellido}</div>
          </div>
        </div>

        {dirty && (
          <span style={{ fontSize: 12, color: INK3, fontStyle: "italic" }}>Cambios sin guardar</span>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "0.5rem 1.25rem", fontSize: 13.5, fontWeight: 600,
            color: "#fff", background: saving ? "#5a8a40" : OLIVE,
            border: "none", borderRadius: 10, cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.8 : 1, boxShadow: "0 2px 8px rgba(42,74,24,0.25)",
          }}
        >
          {saving
            ? <><Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> Guardando…</>
            : <><Save style={{ width: 14, height: 14 }} /> Guardar</>
          }
        </button>
      </div>

      {/* Contenido */}
      <div style={{ padding: "1.75rem 2rem 6rem", display: "flex", flexDirection: "column", gap: "1rem" }}>

        {/* Sección A — Datos de identificación */}
        <AccordionCard title="Datos de identificación" summary={`${c.nombre} ${c.apellido}${c.telefono ? " · " + c.telefono : ""}`}>
          <Row cols={4}>
            <Field label="Nombre"   value={c.nombre}   onChange={(v) => setField("nombre", v)}   required />
            <Field label="Apellido" value={c.apellido} onChange={(v) => setField("apellido", v)} required />
            <Field label="Fecha de nacimiento" value={c.fecha_nacimiento ?? ""} onChange={(v) => setField("fecha_nacimiento", v || null)} type="date" />
            <Field label="DNI" value={c.dni ?? ""} onChange={(v) => setField("dni", v || null)} placeholder="Sin puntos" />
          </Row>
          <Row cols={4}>
            <Field label="Email"    value={c.email    ?? ""} onChange={(v) => setField("email",    v || null)} type="email" placeholder="juan@mail.com" />
            <Field label="Teléfono" value={c.telefono ?? ""} onChange={(v) => setField("telefono", v || null)} placeholder="221 555-1234" />
            <Field label="Domicilio completo" value={c.domicilio_completo ?? ""} onChange={(v) => setField("domicilio_completo", v || null)} placeholder="Calle, número, localidad" />
            <Field label="Lugar de nacimiento" value={c.lugar_nacimiento ?? ""} onChange={(v) => setField("lugar_nacimiento", v || null)} placeholder="Ciudad y provincia" />
          </Row>
          <Row>
            <div>
              <label style={labelStyle}>Estado</label>
              <select
                value={c.estado ?? "activo"}
                onChange={(e) => setField("estado", e.target.value as "activo" | "inactivo")}
                style={inputStyle}
                onFocus={(e) => Object.assign(e.currentTarget.style, { borderColor: OLIVE, boxShadow: `0 0 0 3px ${OLIVE_BG}` })}
                onBlur={(e)  => Object.assign(e.currentTarget.style, { borderColor: BORDER_MD, boxShadow: "none" })}
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
            <div />
          </Row>
          <ChipsField
            label="Categorías que puede aplicar"
            value={c.categorias ?? []}
            onChange={(v) => setField("categorias", v)}
          />
        </AccordionCard>

        {/* Sección B — Ajustes manuales */}
        <AccordionCard
          title="Ajustes manuales"
          summary="Disponibilidad, pretensión, formación…"
          description="Estos campos los actualiza la IA con las respuestas del candidato. Editá manualmente solo si necesitás corregir algo — al guardar se te recordará actualizar el CV."
          defaultOpen={false}
        >
          <Row cols={4}>
            <Field label="Último puesto"     value={c.ultimo_puesto       ?? ""} onChange={(v) => setField("ultimo_puesto",       v || null)} placeholder="Capataz de campo" />
            <Field label="Disponibilidad"    value={c.disponibilidad      ?? ""} onChange={(v) => setField("disponibilidad",      v || null)} placeholder="Inmediata" />
            <Field label="Pretensión salarial" value={c.pretension_salarial ?? ""} onChange={(v) => setField("pretension_salarial", v || null)} placeholder="$800.000" />
            <Field label="Estado civil"      value={c.estado_civil        ?? ""} onChange={(v) => setField("estado_civil",        v || null)} placeholder="Soltero, casado..." />
          </Row>
          <Row cols={4}>
            <Field label="Hijos" value={c.hijos ?? ""} onChange={(v) => setField("hijos", v || null)} placeholder="2 hijos, 5 y 8 años" />
            <BoolField label="Movilidad a campo"   value={c.movilidad}          onChange={(v) => setField("movilidad",          v)} />
            <BoolField label="Vehículo propio"     value={c.vehiculo_propio}    onChange={(v) => setField("vehiculo_propio",    v)} />
            <BoolField label="Licencia de conducir" value={c.licencia_conducir}  onChange={(v) => setField("licencia_conducir",  v)} />
          </Row>
          <Field label="Educación / Formación" value={c.educacion ?? ""} onChange={(v) => setField("educacion", v || null)} placeholder="Técnico agropecuario" />
          <Field label="Perfil laboral" value={c.perfil_laboral ?? ""} onChange={(v) => setField("perfil_laboral", v || null)} multiline placeholder="Resumí el perfil profesional del candidato..." />
          <Row>
            <Field label="Idiomas (separar con comas)" value={(c.idiomas ?? []).join(", ")} onChange={(v) => setField("idiomas", v ? v.split(",").map((s) => s.trim()).filter(Boolean) : [])} placeholder="Español, Inglés" />
            <Field label="Tipos de ganadería" value={(c.tipos_ganaderia ?? []).join(", ")} onChange={(v) => setField("tipos_ganaderia", v ? v.split(",").map((s) => s.trim()).filter(Boolean) : [])} placeholder="Bovina, tambo, mixto..." />
          </Row>
          <Row>
            <Field label="Muebles propios" value={c.muebles_propios ?? ""} onChange={(v) => setField("muebles_propios", v || null)} placeholder="Mesa, sillas, camas..." />
            <Field label="Animales"        value={c.animales        ?? ""} onChange={(v) => setField("animales",        v || null)} placeholder="Perro, gato..." />
          </Row>
        </AccordionCard>

      </div>

      {/* Zona de peligro */}
      <div style={{ marginTop: 32, padding: "20px 24px", borderRadius: 12, border: "1.5px solid #fecdd3", background: "#fff5f5" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#dc2626", marginBottom: 8 }}>
          Zona de peligro
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: INK }}>Eliminar candidato</div>
            <div style={{ fontSize: 12, color: INK3, marginTop: 2 }}>
              Se eliminan el perfil, la experiencia y todas las gestiones asociadas. Esta acción no se puede deshacer.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            style={{
              padding: "0.5rem 1rem", fontSize: 13, fontWeight: 600,
              color: "#dc2626", background: "transparent",
              border: "1.5px solid #dc2626", borderRadius: 8, cursor: "pointer",
              whiteSpace: "nowrap", flexShrink: 0,
            }}
          >
            Eliminar
          </button>
        </div>
      </div>

      {/* Confirmación al salir con cambios sin guardar */}
      <Dialog
        open={confirmState.open}
        onOpenChange={(open) => { if (!open) setConfirmState((s) => ({ ...s, open: false })) }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Cambios sin guardar</DialogTitle>
            <DialogDescription>
              Tenés cambios sin guardar en el perfil. Si salís ahora, se van a perder.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setConfirmState((s) => ({ ...s, open: false }))}
              style={{
                padding: "0.5rem 1rem", fontSize: 13.5, fontWeight: 500,
                color: INK3, background: "transparent", border: `1px solid ${BORDER_MD}`,
                borderRadius: 8, cursor: "pointer",
              }}
            >
              Seguir editando
            </button>
            <button
              onClick={() => { setConfirmState((s) => ({ ...s, open: false })); confirmState.onConfirm() }}
              style={{
                padding: "0.5rem 1rem", fontSize: 13.5, fontWeight: 600,
                color: "#fff", background: "#cf222e",
                border: "none", borderRadius: 8, cursor: "pointer",
              }}
            >
              Salir sin guardar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmación de borrado */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>¿Eliminar candidato?</DialogTitle>
            <DialogDescription>
              Se va a eliminar el perfil de <strong>{initial.nombre} {initial.apellido}</strong> junto con toda su experiencia y gestiones. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
              style={{
                padding: "0.5rem 1rem", fontSize: 13.5, fontWeight: 500,
                color: INK3, background: "transparent", border: `1px solid ${BORDER_MD}`,
                borderRadius: 8, cursor: "pointer",
              }}
            >
              Cancelar
            </button>
            <button
              disabled={deleting}
              onClick={() => {
                startDelete(async () => {
                  const res = await eliminarCandidato(initial.id)
                  if (res.success) {
                    clearDirty()
                    router.push("/candidatos")
                  } else {
                    toast.error("No se pudo eliminar el candidato")
                    setDeleteOpen(false)
                  }
                })
              }}
              style={{
                padding: "0.5rem 1rem", fontSize: 13.5, fontWeight: 600,
                color: "#fff", background: deleting ? "#ef4444" : "#dc2626",
                border: "none", borderRadius: 8, cursor: deleting ? "not-allowed" : "pointer",
                opacity: deleting ? 0.7 : 1,
              }}
            >
              {deleting ? "Eliminando…" : "Sí, eliminar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
