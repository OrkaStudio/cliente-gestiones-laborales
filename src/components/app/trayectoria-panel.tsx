"use client"

import { useState, useTransition } from "react"
import { Pencil, Trash2, Plus, X, Save, Check } from "lucide-react"
import {
  updateExperienciaFields,
  addExperiencia,
  deleteExperiencia,
} from "@/lib/actions/candidatos"

interface Exp {
  id: string
  rol:         string | null
  empresa:     string | null
  desde:       string | null
  hasta:       string | null
  descripcion: string | null
}

interface Props {
  candidatoId:  string
  experiencia:  Exp[]
}

type ExpDraft = Omit<Exp, "id">

const EMPTY_DRAFT: ExpDraft = {
  rol:         "",
  empresa:     "",
  desde:       "",
  hasta:       "",
  descripcion: "",
}

const CARD = {
  background:  "#ffffff",
  borderColor: "var(--gl-border)",
  boxShadow:   "0 2px 8px rgba(13,17,23,0.05)",
} as const

function ExpForm({
  draft,
  onChange,
  onSave,
  onCancel,
  isPending,
  saveLabel,
}: {
  draft:    ExpDraft
  onChange: (d: ExpDraft) => void
  onSave:   () => void
  onCancel: () => void
  isPending: boolean
  saveLabel: string
}) {
  function field(key: keyof ExpDraft, label: string, opts?: { placeholder?: string; type?: string; textarea?: boolean }) {
    return (
      <div>
        <label className="text-[10.5px] font-semibold uppercase tracking-wide block mb-1" style={{ color: "var(--gl-ink-3)" }}>
          {label}
        </label>
        {opts?.textarea ? (
          <textarea
            value={draft[key] ?? ""}
            onChange={(e) => onChange({ ...draft, [key]: e.target.value })}
            rows={3}
            placeholder={opts.placeholder}
            className="w-full rounded-xl px-3 py-2 text-sm outline-none"
            style={{
              background:  "var(--gl-surface)",
              border:      "1px solid var(--gl-border)",
              color:       "var(--gl-ink)",
              fontFamily:  "inherit",
              lineHeight:  1.5,
              resize:      "vertical",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--gl-olive)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--gl-border)")}
          />
        ) : (
          <input
            type={opts?.type ?? "text"}
            value={draft[key] ?? ""}
            onChange={(e) => onChange({ ...draft, [key]: e.target.value })}
            placeholder={opts?.placeholder}
            className="w-full rounded-xl px-3 py-2 text-sm outline-none"
            style={{
              background:  "var(--gl-surface)",
              border:      "1px solid var(--gl-border)",
              color:       "var(--gl-ink)",
              fontFamily:  "inherit",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--gl-olive)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--gl-border)")}
          />
        )}
      </div>
    )
  }

  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-3"
      style={{ background: "var(--gl-surface)", border: "1px solid var(--gl-border)" }}
    >
      <div className="grid grid-cols-2 gap-3">
        {field("rol",     "Cargo / Rol",             { placeholder: "Ej: Capataz general" })}
        {field("empresa", "Empresa / Establecimiento", { placeholder: "Ej: Estancia La Pampa" })}
        {field("desde",   "Desde (año)",              { placeholder: "Ej: 2019" })}
        {field("hasta",   "Hasta (año o vacío = actual)", { placeholder: "Ej: 2023" })}
      </div>
      {field("descripcion", "Descripción de tareas", { textarea: true, placeholder: "Descripción breve de responsabilidades..." })}

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium"
          style={{ background: "#fff", border: "1px solid var(--gl-border)", color: "var(--gl-ink-3)" }}
        >
          <X className="h-3 w-3" />
          Cancelar
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={isPending || !draft.rol?.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold"
          style={{
            background: "var(--gl-olive)",
            color:      "#fff",
            border:     "none",
            opacity:    isPending || !draft.rol?.trim() ? 0.5 : 1,
            cursor:     isPending || !draft.rol?.trim() ? "not-allowed" : "pointer",
          }}
        >
          <Save className="h-3 w-3" />
          {isPending ? "Guardando…" : saveLabel}
        </button>
      </div>
    </div>
  )
}

export function TrayectoriaPanel({ candidatoId, experiencia: initial }: Props) {
  const [items,     setItems]     = useState<Exp[]>(initial)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<ExpDraft>(EMPTY_DRAFT)
  const [adding,    setAdding]    = useState(false)
  const [addDraft,  setAddDraft]  = useState<ExpDraft>(EMPTY_DRAFT)
  const [deleteId,  setDeleteId]  = useState<string | null>(null)
  const [isPending, startTrans]   = useTransition()
  const [savedId,   setSavedId]   = useState<string | null>(null)

  function openEdit(exp: Exp) {
    setEditingId(exp.id)
    setEditDraft({ rol: exp.rol, empresa: exp.empresa, desde: exp.desde, hasta: exp.hasta, descripcion: exp.descripcion })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditDraft(EMPTY_DRAFT)
  }

  function saveEdit(id: string) {
    const payload = {
      rol:         editDraft.rol?.trim()         || undefined,
      empresa:     editDraft.empresa?.trim()     || undefined,
      desde:       editDraft.desde?.trim()       || null,
      hasta:       editDraft.hasta?.trim()       || null,
      descripcion: editDraft.descripcion?.trim() || null,
    }
    const display = {
      rol:         editDraft.rol?.trim()         || null,
      empresa:     editDraft.empresa?.trim()     || null,
      desde:       editDraft.desde?.trim()       || null,
      hasta:       editDraft.hasta?.trim()       || null,
      descripcion: editDraft.descripcion?.trim() || null,
    }
    setItems((prev) => prev.map((e) => e.id === id ? { ...e, ...display } : e))
    setEditingId(null)
    setSavedId(id)
    setTimeout(() => setSavedId(null), 2000)
    startTrans(async () => { await updateExperienciaFields(id, candidatoId, payload) })
  }

  function confirmDelete(id: string) {
    setItems((prev) => prev.filter((e) => e.id !== id))
    setDeleteId(null)
    startTrans(async () => { await deleteExperiencia(id, candidatoId) })
  }

  function saveAdd() {
    const payload = {
      rol:         addDraft.rol?.trim()         ?? "",
      empresa:     addDraft.empresa?.trim()     ?? "",
      desde:       addDraft.desde?.trim()       || null,
      hasta:       addDraft.hasta?.trim()       || null,
      descripcion: addDraft.descripcion?.trim() || null,
    }
    const tempId = `temp-${Date.now()}`
    setItems((prev) => [...prev, { id: tempId, rol: payload.rol || null, empresa: payload.empresa || null, desde: payload.desde, hasta: payload.hasta, descripcion: payload.descripcion }])
    setAdding(false)
    setAddDraft(EMPTY_DRAFT)
    startTrans(async () => {
      const result = await addExperiencia(candidatoId, payload)
      if (result.success) {
        setItems((prev) => prev.map((e) => e.id === tempId ? { ...e, id: result.id } : e))
      }
    })
  }

  return (
    <div className="rounded-2xl border p-6" style={CARD}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[15px] font-bold" style={{ color: "var(--gl-ink)" }}>Trayectoria</h2>
        {!adding && (
          <button
            type="button"
            onClick={() => { setAdding(true); setAddDraft(EMPTY_DRAFT) }}
            className="flex items-center gap-1.5 text-[11.5px] font-semibold px-3 py-1.5 rounded-xl transition-opacity hover:opacity-70"
            style={{ background: "var(--gl-olive-bg)", color: "var(--gl-olive)", border: "none" }}
          >
            <Plus className="h-3.5 w-3.5" />
            Agregar
          </button>
        )}
      </div>

      {items.length === 0 && !adding && (
        <div className="py-6 text-center text-sm" style={{ color: "var(--gl-ink-3)" }}>
          Sin experiencia registrada
        </div>
      )}

      <div className="space-y-0.5">
        {items.map((exp, i) => {
          if (editingId === exp.id) {
            return (
              <div key={exp.id} className="py-3" style={{ borderTop: i > 0 ? "1px solid var(--gl-border)" : undefined }}>
                <ExpForm
                  draft={editDraft}
                  onChange={setEditDraft}
                  onSave={() => saveEdit(exp.id)}
                  onCancel={cancelEdit}
                  isPending={isPending}
                  saveLabel="Guardar cambios"
                />
              </div>
            )
          }

          return (
            <div
              key={exp.id}
              className="group flex gap-4 py-4"
              style={{ borderTop: i > 0 ? "1px solid var(--gl-border)" : undefined }}
            >
              {/* Timeline dot */}
              <div className="flex flex-col items-center pt-1.5 shrink-0">
                <div
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ background: i === 0 ? "var(--gl-olive)" : "var(--gl-border)" }}
                />
                {i < items.length - 1 && (
                  <div className="flex-1 w-px mt-2" style={{ background: "var(--gl-border)", minHeight: "1.5rem" }} />
                )}
              </div>

              <div className="flex-1 min-w-0 pb-2">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[14px] font-bold" style={{ color: "var(--gl-ink)" }}>
                    {exp.rol ?? "—"}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    {(exp.desde || exp.hasta) && (
                      <span className="text-xs font-mono tabular-nums" style={{ color: "var(--gl-ink-3)" }}>
                        {exp.desde ?? "?"} — {exp.hasta ?? "actual"}
                      </span>
                    )}

                    {/* Acciones — visible en hover */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {savedId === exp.id && (
                        <Check className="h-3.5 w-3.5" style={{ color: "#1a7f37" }} />
                      )}
                      <button
                        type="button"
                        onClick={() => openEdit(exp)}
                        className="p-1 rounded-md hover:opacity-70"
                        style={{ color: "var(--gl-ink-3)" }}
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {deleteId === exp.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => confirmDelete(exp.id)}
                            className="px-2 py-0.5 rounded-md text-[11px] font-semibold"
                            style={{ background: "#ffebe9", color: "#cf222e", border: "none" }}
                          >
                            Confirmar
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteId(null)}
                            className="p-1 rounded-md hover:opacity-70"
                            style={{ color: "var(--gl-ink-3)" }}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteId(exp.id)}
                          className="p-1 rounded-md hover:opacity-70"
                          style={{ color: "var(--gl-ink-3)" }}
                          title="Eliminar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-sm mt-0.5 font-medium" style={{ color: "var(--gl-olive)" }}>
                  {exp.empresa}
                </div>
                {exp.descripcion && (
                  <p className="text-sm mt-2 leading-relaxed" style={{ color: "var(--gl-ink-3)" }}>
                    {exp.descripcion}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {adding && (
        <div className={items.length > 0 ? "mt-4 pt-4" : ""} style={{ borderTop: items.length > 0 ? "1px solid var(--gl-border)" : undefined }}>
          <ExpForm
            draft={addDraft}
            onChange={setAddDraft}
            onSave={saveAdd}
            onCancel={() => { setAdding(false); setAddDraft(EMPTY_DRAFT) }}
            isPending={isPending}
            saveLabel="Agregar experiencia"
          />
        </div>
      )}
    </div>
  )
}
