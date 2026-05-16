"use client"

import { useState, useTransition } from "react"
import { Plus, X, Loader2, Pencil } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { updateCandidatoFields } from "@/lib/actions/candidatos"
import type { Json } from "@/lib/supabase/types"

// ── Types ────────────────────────────────────────────────────────────────────

export type Referencia = {
  nombre: string
  contacto: string
  relacion: string
  calificacion: "buena" | "mala" | null
  notas: string
}

// ── Styles ───────────────────────────────────────────────────────────────────

const OLIVE    = "#2a4a18"
const OLIVE_BG = "#eef5e8"
const INK      = "#0d1117"
const INK3     = "#8b949e"
const BORDER   = "#eaecef"
const BORDER_MD = "#d4d8de"
const SURFACE  = "#ffffff"

const inputStyle: React.CSSProperties = {
  width: "100%", border: `1px solid ${BORDER_MD}`, background: SURFACE,
  color: INK, borderRadius: "0.5rem", padding: "0.45rem 0.7rem",
  fontSize: "13px", fontFamily: "inherit", outline: "none",
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "10.5px", fontWeight: 600,
  letterSpacing: "0.08em", textTransform: "uppercase", color: INK3, marginBottom: "0.3rem",
}

const EMPTY: Referencia = { nombre: "", contacto: "", relacion: "", calificacion: null, notas: "" }

// ── Component ────────────────────────────────────────────────────────────────

export function ReferenciaInlinePanel({
  candidatoId,
  refs: initialRefs,
}: {
  candidatoId: string
  refs: Referencia[]
}) {
  const [refs, setRefs]         = useState<Referencia[]>(initialRefs)
  const [addOpen, setAddOpen]   = useState(false)
  const [editIdx, setEditIdx]   = useState<number | null>(null)
  const [form, setForm]         = useState<Referencia>(EMPTY)
  const [saving, startSave]     = useTransition()
  const [deleting, startDelete] = useTransition()

  function openAdd() { setForm(EMPTY); setEditIdx(null); setAddOpen(true) }
  function openEdit(idx: number) { setForm(refs[idx]); setEditIdx(idx); setAddOpen(true) }

  async function persist(next: Referencia[]) {
    const result = await updateCandidatoFields(candidatoId, {
      referencias: (next.length > 0 ? next : null) as unknown as Json,
    })
    if (!result.success) throw new Error(result.error)
    return next
  }

  function handleSave() {
    if (!form.nombre.trim()) return
    const entry: Referencia = {
      nombre:       form.nombre.trim(),
      contacto:     form.contacto.trim(),
      relacion:     form.relacion.trim(),
      calificacion: form.calificacion,
      notas:        form.notas.trim(),
    }
    startSave(async () => {
      try {
        const next = editIdx !== null
          ? refs.map((r, i) => i === editIdx ? entry : r)
          : [...refs, entry]
        await persist(next)
        setRefs(next)
        setForm(EMPTY)
        setEditIdx(null)
        setAddOpen(false)
        toast.success(editIdx !== null ? "Referencia actualizada" : "Referencia guardada")
      } catch {
        toast.error("No se pudo guardar la referencia")
      }
    })
  }

  function handleDelete(idx: number) {
    startDelete(async () => {
      try {
        const next = refs.filter((_, i) => i !== idx)
        await persist(next)
        setRefs(next)
        toast.success("Referencia eliminada")
      } catch {
        toast.error("No se pudo eliminar la referencia")
      }
    })
  }

  return (
    <div className="rounded-2xl border p-6" style={{ background: SURFACE, borderColor: BORDER, boxShadow: "0 2px 8px rgba(13,17,23,0.05)" }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[15px] font-bold" style={{ color: INK }}>Referencias</h2>
        <button
          onClick={openAdd}
          style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            fontSize: 12, fontWeight: 600, color: OLIVE,
            background: OLIVE_BG, border: "none", borderRadius: 6,
            padding: "4px 10px", cursor: "pointer",
          }}
        >
          <Plus style={{ width: 12, height: 12 }} />
          Agregar
        </button>
      </div>

      {/* Lista */}
      {refs.length === 0 ? (
        <p className="text-sm text-center py-4" style={{ color: INK3 }}>
          Sin referencias cargadas
        </p>
      ) : (
        <div className="space-y-3">
          {refs.map((ref, i) => {
            const borderColor = ref.calificacion === "buena" ? "#16a34a" : ref.calificacion === "mala" ? "#dc2626" : BORDER
            return (
              <div
                key={i}
                className="flex items-start justify-between gap-3"
                style={{ paddingLeft: 12, borderLeft: `2px solid ${borderColor}` }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13.5px] font-semibold" style={{ color: INK }}>{ref.nombre}</span>
                    {ref.calificacion && (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: ref.calificacion === "buena" ? "#dcfce7" : "#fee2e2",
                          color:      ref.calificacion === "buena" ? "#16a34a" : "#dc2626",
                        }}
                      >
                        {ref.calificacion === "buena" ? "Buena" : "Mala"}
                      </span>
                    )}
                  </div>
                  {ref.contacto && <div className="text-xs mt-0.5" style={{ color: INK3 }}>{ref.contacto}</div>}
                  {ref.relacion && <div className="text-xs"        style={{ color: INK3 }}>{ref.relacion}</div>}
                  {ref.notas && (
                    <div className="text-xs mt-1 italic leading-snug" style={{ color: INK3 }}>
                      "{ref.notas}"
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                  <button
                    onClick={() => openEdit(i)}
                    title="Editar referencia"
                    style={{
                      padding: 4, color: INK3, background: "transparent",
                      border: "none", cursor: "pointer", borderRadius: 4, display: "flex",
                    }}
                  >
                    <Pencil style={{ width: 12, height: 12 }} />
                  </button>
                  <button
                    onClick={() => handleDelete(i)}
                    disabled={deleting}
                    title="Eliminar referencia"
                    style={{
                      padding: 4, color: "#cf222e", background: "transparent",
                      border: "none", cursor: deleting ? "not-allowed" : "pointer",
                      borderRadius: 4, display: "flex", opacity: deleting ? 0.5 : 1,
                    }}
                  >
                    <X style={{ width: 13, height: 13 }} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Dialog de alta */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent showCloseButton={false} style={{ maxWidth: 440 }}>
          <DialogHeader>
            <DialogTitle>{editIdx !== null ? "Editar referencia" : "Agregar referencia"}</DialogTitle>
          </DialogHeader>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem", padding: "0.25rem 0" }}>

            <div>
              <label style={labelStyle}>Nombre *</label>
              <input
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Juan García"
                style={inputStyle}
                autoFocus
              />
            </div>

            <div>
              <label style={labelStyle}>Contacto</label>
              <input
                value={form.contacto}
                onChange={(e) => setForm((f) => ({ ...f, contacto: e.target.value }))}
                placeholder="221 555-1234 · juan@mail.com"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Relación laboral</label>
              <input
                value={form.relacion}
                onChange={(e) => setForm((f) => ({ ...f, relacion: e.target.value }))}
                placeholder="Propietario, administrador..."
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Notas de consulta</label>
              <textarea
                value={form.notas}
                onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
                placeholder="¿Qué dijo la referencia? Actitud, observaciones..."
                rows={3}
                style={{
                  ...inputStyle,
                  resize: "vertical",
                  lineHeight: "1.5",
                  minHeight: "72px",
                }}
              />
            </div>

            <div>
              <label style={labelStyle}>Calificación</label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {(["buena", "mala"] as const).map((cal) => {
                  const selected = form.calificacion === cal
                  const isGood   = cal === "buena"
                  return (
                    <button
                      key={cal}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, calificacion: selected ? null : cal }))}
                      style={{
                        flex: 1, padding: "0.4rem 0", fontSize: 13, fontWeight: selected ? 600 : 400,
                        borderRadius: 8, cursor: "pointer", transition: "all 0.12s",
                        border: `1px solid ${selected ? (isGood ? "#16a34a" : "#dc2626") : BORDER_MD}`,
                        background: selected ? (isGood ? "#dcfce7" : "#fee2e2") : SURFACE,
                        color: selected ? (isGood ? "#16a34a" : "#dc2626") : INK3,
                      }}
                    >
                      {isGood ? "✓ Buena" : "✗ Mala"}
                    </button>
                  )
                })}
              </div>
            </div>

          </div>

          <DialogFooter>
            <button
              onClick={() => setAddOpen(false)}
              disabled={saving}
              style={{
                padding: "0.5rem 1rem", fontSize: 13.5, fontWeight: 500,
                color: INK3, background: "transparent", border: `1px solid ${BORDER_MD}`,
                borderRadius: 8, cursor: "pointer",
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.nombre.trim()}
              style={{
                padding: "0.5rem 1.25rem", fontSize: 13.5, fontWeight: 600,
                color: "#fff", background: saving ? "#5a8a40" : OLIVE,
                border: "none", borderRadius: 8,
                cursor: saving || !form.nombre.trim() ? "not-allowed" : "pointer",
                opacity: !form.nombre.trim() ? 0.5 : 1,
                display: "inline-flex", alignItems: "center", gap: 6,
              }}
            >
              {saving
                ? <><Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> Guardando…</>
                : editIdx !== null ? "Actualizar" : "Guardar"
              }
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
