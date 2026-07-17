"use client";

import { Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { CATEGORIAS_GL } from "@/lib/cv/categorias";
import { HABILIDADES_GL_AREAS } from "@/lib/cv/habilidades";
import type { CriteriosV2 } from "@/lib/v2/criterios";
import { EDU_NIVELES, type Nivel, type Requisito, reqNombre } from "@/lib/v2/matching";

const CAMPOS_AGREGABLES: { label: string; nuevo: () => Requisito }[] = [
  {
    label: "Vehículo propio",
    nuevo: () => ({ campo: "vehiculo", nivel: "obligatorio", val: true }),
  },
  {
    label: "Disponible para residir",
    nuevo: () => ({ campo: "residir", nivel: "obligatorio", val: true }),
  },
  {
    label: "Licencia de conducir",
    nuevo: () => ({ campo: "licencia", nivel: "deseable", val: true }),
  },
  {
    label: "Superficie manejada (ha)",
    nuevo: () => ({ campo: "ha", nivel: "deseable", min: 1000 }),
  },
  { label: "Edad", nuevo: () => ({ campo: "edad", nivel: "deseable", min: 25, max: 55 }) },
  { label: "Nivel educativo", nuevo: () => ({ campo: "educacion", nivel: "deseable", val: 1 }) },
  { label: "Gente a cargo", nuevo: () => ({ campo: "gente", nivel: "deseable", val: 2 }) },
  { label: "Sin hijos", nuevo: () => ({ campo: "hijos", nivel: "deseable", val: false }) },
];

const mismoCampo = (a: Requisito, b: Requisito) =>
  a.campo === b.campo && (a.campo !== "hab" || b.campo !== "hab" || a.hab === b.hab);

const esNumerico = (r: Requisito) =>
  r.campo === "edad" || r.campo === "ha" || r.campo === "gente" || r.campo === "educacion";

/**
 * Editor de criterios. Cada requisito es una FILA FIJA con un interruptor explícito
 * Obligatorio/Deseable y una ✕ para sacarlo.
 *
 * Antes eran chips agrupados por nivel: al tocar uno para subirlo a Obligatorio, el chip
 * SALTABA al otro grupo y desaparecía de donde estaba — se leía como si lo hubieras borrado.
 * Además un chip no parece tocable. Acá nada se mueve de lugar, se ve qué es editable y
 * borrar es SOLO la cruz.
 */
export function CriteriosEditor({
  criterios,
  setCriterios,
}: {
  criterios: CriteriosV2;
  setCriterios: (c: CriteriosV2) => void;
}) {
  const [abrir, setAbrir] = useState<"hab" | "campo" | "cat" | null>(null);
  const [buscar, setBuscar] = useState("");

  const setReq = (i: number, r: Requisito) =>
    setCriterios({
      ...criterios,
      requisitos: criterios.requisitos.map((x, j) => (j === i ? r : x)),
    });

  const quitar = (i: number) =>
    setCriterios({ ...criterios, requisitos: criterios.requisitos.filter((_, j) => j !== i) });

  const agregar = (r: Requisito) => {
    if (criterios.requisitos.some((x) => mismoCampo(x, r))) return;
    setCriterios({ ...criterios, requisitos: [...criterios.requisitos, r] });
    setAbrir(null);
    setBuscar("");
  };

  const areasFiltradas = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    const usadas = new Set(
      criterios.requisitos.flatMap((r) => (r.campo === "hab" ? [r.hab] : [])),
    );
    return HABILIDADES_GL_AREAS.map((g) => ({
      ...g,
      habilidades: g.habilidades.filter(
        (h) => !usadas.has(h) && (!q || h.toLowerCase().includes(q)),
      ),
    })).filter((g) => g.habilidades.length > 0);
  }, [buscar, criterios]);

  /** Interruptor de nivel: el activo queda resaltado. Nada se reordena al cambiarlo. */
  const Interruptor = ({ r, i }: { r: Requisito; i: number }) => {
    const Opcion = ({ nivel, label }: { nivel: Nivel; label: string }) => {
      const activo = r.nivel === nivel;
      return (
        <button
          type="button"
          onClick={() => setReq(i, { ...r, nivel })}
          className="px-2 py-[3px] rounded-[7px] text-[11px] font-bold transition-colors"
          style={
            activo
              ? {
                  background: nivel === "obligatorio" ? "var(--gl-olive)" : "var(--gl-surface)",
                  color: nivel === "obligatorio" ? "#fff" : "var(--gl-ink)",
                  boxShadow: "0 1px 2px rgba(13,17,23,.12)",
                }
              : { background: "transparent", color: "var(--gl-ink-3)" }
          }
        >
          {label}
        </button>
      );
    };
    return (
      <span
        className="inline-flex p-[2px] rounded-[9px] shrink-0"
        style={{ background: "var(--gl-gray-bg)" }}
      >
        <Opcion nivel="obligatorio" label="Obligatorio" />
        <Opcion nivel="deseable" label="Deseable" />
      </span>
    );
  };

  /** Los requisitos con número se editan en la misma fila. */
  const Valor = ({ r, i }: { r: Requisito; i: number }) => {
    const num = (v: string) => (v === "" ? undefined : Number(v));
    const cls = "w-[68px] px-1.5 py-0.5 rounded-md border text-[12px] tabular-nums";
    const st = { borderColor: "var(--gl-border-md)", color: "var(--gl-ink)" };
    if (r.campo === "edad" || r.campo === "ha")
      return (
        <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: "var(--gl-ink-3)" }}>
          <input
            type="number"
            defaultValue={r.min ?? ""}
            placeholder="mín"
            onChange={(e) => setReq(i, { ...r, min: num(e.target.value) })}
            className={cls}
            style={st}
          />
          <span>–</span>
          <input
            type="number"
            defaultValue={r.max ?? ""}
            placeholder="máx"
            onChange={(e) => setReq(i, { ...r, max: num(e.target.value) })}
            className={cls}
            style={st}
          />
          {r.campo === "ha" ? "ha" : "años"}
        </span>
      );
    if (r.campo === "gente")
      return (
        <input
          type="number"
          defaultValue={r.val}
          onChange={(e) => setReq(i, { ...r, val: Number(e.target.value) || 0 })}
          className={cls}
          style={st}
        />
      );
    if (r.campo === "educacion")
      return (
        <select
          defaultValue={r.val}
          onChange={(e) => setReq(i, { ...r, val: Number(e.target.value) })}
          className="px-1.5 py-0.5 rounded-md border text-[12px]"
          style={st}
        >
          {EDU_NIVELES.map((n, idx) => (
            <option key={n} value={idx}>
              {n}
            </option>
          ))}
        </select>
      );
    return null;
  };

  return (
    <div>
      {/* Categorías */}
      <div className="mb-4">
        <div className="gl-eyebrow mb-2">Categorías aceptadas</div>
        <div className="flex flex-wrap gap-1.5">
          {criterios.categorias.map((c) => (
            <span
              key={c}
              className="inline-flex items-center gap-1 text-xs font-semibold pl-2.5 pr-1 py-1.5 rounded-full"
              style={{ background: "var(--gl-olive)", color: "#fff" }}
            >
              {c}
              <button
                type="button"
                onClick={() =>
                  setCriterios({
                    ...criterios,
                    categorias: criterios.categorias.filter((x) => x !== c),
                  })
                }
                title="Quitar categoría"
                className="rounded-full p-0.5 hover:opacity-70"
                style={{ background: "rgba(255,255,255,.18)" }}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => setAbrir(abrir === "cat" ? null : "cat")}
            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-full border border-dashed"
            style={{ borderColor: "var(--gl-border-md)", color: "var(--gl-ink-3)" }}
          >
            <Plus className="h-3 w-3" /> Categoría
          </button>
        </div>
        {criterios.categorias.length === 0 && (
          <p className="text-[12px] mt-1.5" style={{ color: "var(--gl-ink-3)" }}>
            Agregá al menos una categoría para empezar a rankear.
          </p>
        )}
        {abrir === "cat" && (
          <div
            className="mt-2 p-2 rounded-xl flex flex-wrap gap-1.5 max-h-44 overflow-y-auto"
            style={{ background: "var(--gl-gray-bg)", border: "1px solid var(--gl-border)" }}
          >
            {CATEGORIAS_GL.filter((c) => !criterios.categorias.includes(c)).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setCriterios({ ...criterios, categorias: [...criterios.categorias, c] });
                  setAbrir(null);
                }}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-full"
                style={{ background: "var(--gl-surface)", border: "1px solid var(--gl-border-md)" }}
              >
                + {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Requisitos — una fila por requisito, en el orden en que se cargaron */}
      <div className="gl-eyebrow mb-1">Requisitos</div>
      {criterios.requisitos.length === 0 ? (
        <p className="text-[12px] py-2" style={{ color: "var(--gl-ink-3)" }}>
          Sin requisitos. Agregá una habilidad o un requisito abajo.
        </p>
      ) : (
        <div>
          {criterios.requisitos.map((r, i) => (
            <div
              key={`${r.campo}-${r.campo === "hab" ? r.hab : i}`}
              className="py-2"
              style={{ borderTop: "1px solid var(--gl-border)" }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="text-[13px] font-semibold flex-1 min-w-0"
                  style={{ color: "var(--gl-ink)" }}
                >
                  {reqNombre(r)}
                </span>
                <Interruptor r={r} i={i} />
                <button
                  type="button"
                  onClick={() => quitar(i)}
                  title="Quitar requisito"
                  className="shrink-0 p-1 rounded-md hover:opacity-70"
                  style={{ color: "var(--gl-ink-3)" }}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {/* Los requisitos con número llevan su valor en una segunda línea propia: en la
                  misma fila no entran y el wrap quedaba como un error de layout. */}
              {esNumerico(r) && (
                <div className="mt-1.5">
                  <Valor r={r} i={i} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Agregar */}
      <div
        className="flex flex-wrap gap-1.5 pt-3 mt-1"
        style={{ borderTop: "1px solid var(--gl-border)" }}
      >
        <button
          type="button"
          onClick={() => setAbrir(abrir === "hab" ? null : "hab")}
          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-full border border-dashed"
          style={{ borderColor: "var(--gl-border-md)", color: "var(--gl-ink-3)" }}
        >
          <Plus className="h-3 w-3" /> Habilidad
        </button>
        <button
          type="button"
          onClick={() => setAbrir(abrir === "campo" ? null : "campo")}
          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-full border border-dashed"
          style={{ borderColor: "var(--gl-border-md)", color: "var(--gl-ink-3)" }}
        >
          <Plus className="h-3 w-3" /> Requisito
        </button>
      </div>

      {abrir === "hab" && (
        <div
          className="mt-3 p-3 rounded-xl"
          style={{ background: "var(--gl-gray-bg)", border: "1px solid var(--gl-border)" }}
        >
          <input
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            placeholder="buscar (manga, a caballo, riego…)"
            className="w-full mb-2 px-3 py-1.5 rounded-lg border text-[13px]"
            style={{ borderColor: "var(--gl-border-md)", background: "var(--gl-surface)" }}
          />
          <div className="max-h-56 overflow-y-auto space-y-2.5">
            {areasFiltradas.map((g) => (
              <div key={g.area}>
                <div className="gl-eyebrow mb-1.5">{g.area}</div>
                <div className="flex flex-wrap gap-1.5">
                  {g.habilidades.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => agregar({ campo: "hab", hab: h, nivel: "deseable" })}
                      className="text-xs font-semibold px-2.5 py-1.5 rounded-full"
                      style={{
                        background: "var(--gl-surface)",
                        border: "1px solid var(--gl-border-md)",
                      }}
                    >
                      + {h}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {areasFiltradas.length === 0 && (
              <p className="text-[12px]" style={{ color: "var(--gl-ink-3)" }}>
                No hay habilidades para “{buscar}”.
              </p>
            )}
          </div>
        </div>
      )}

      {abrir === "campo" && (
        <div
          className="mt-3 p-3 rounded-xl flex flex-wrap gap-1.5"
          style={{ background: "var(--gl-gray-bg)", border: "1px solid var(--gl-border)" }}
        >
          {CAMPOS_AGREGABLES.filter(
            (c) => !criterios.requisitos.some((r) => mismoCampo(r, c.nuevo())),
          ).map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => agregar(c.nuevo())}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-full"
              style={{ background: "var(--gl-surface)", border: "1px solid var(--gl-border-md)" }}
            >
              + {c.label}
            </button>
          ))}
        </div>
      )}

      <label
        className="mt-4 pt-3 flex items-center gap-2 cursor-pointer"
        style={{ borderTop: "1px solid var(--gl-border)" }}
      >
        <input
          type="checkbox"
          checked={criterios.matrimonio === true}
          onChange={(e) => setCriterios({ ...criterios, matrimonio: e.target.checked })}
          className="h-4 w-4 rounded"
          style={{ accentColor: "var(--gl-olive)" }}
        />
        <span className="text-[13px] font-semibold" style={{ color: "var(--gl-ink-2)" }}>
          Busca matrimonio / pareja
        </span>
      </label>
    </div>
  );
}
