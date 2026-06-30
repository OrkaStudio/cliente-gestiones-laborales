"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Ficha } from "@/lib/v2/desde-busqueda";
import { createGestion } from "@/lib/actions/gestiones";
import {
  type BusquedaMatch,
  type CandidatoMatch,
  EDU_NIVELES,
  evalCat,
  evalReq,
  gapsDe,
  type Requisito,
  reqLabel,
  type Tier,
} from "@/lib/v2/matching";

type Row = { c: CandidatoMatch; tier: Tier; score: number };

const AVATAR = [
  { bg: "#dafbe1", c: "#1a7f37" },
  { bg: "#ddf4ff", c: "#0550ae" },
  { bg: "#ffd8eb", c: "#99286e" },
  { bg: "#fff8c5", c: "#7d4e00" },
  { bg: "#eddeff", c: "#6e40c9" },
];
const av = (s: string) => AVATAR[s.charCodeAt(0) % AVATAR.length];
const TIER_LABEL: Record<Tier, string> = {
  green: "Buen match",
  amber: "Falta confirmar",
  red: "No cumple",
};
const TIER_CLS: Record<Tier, string> = { green: "v2d-green", amber: "v2d-amber", red: "v2d-red" };

function candValTxt(c: CandidatoMatch, r: Requisito): string {
  switch (r.campo) {
    case "hab":
      return c.habilidades.includes(r.hab)
        ? "lo tiene"
        : c.habilidades.length
          ? "no figura en el CV"
          : "sin dato";
    case "vehiculo":
      return c.vehiculo == null ? "sin dato" : c.vehiculo ? "sí" : "no";
    case "residir":
      return c.residir === "sin_dato" ? "sin dato" : c.residir === "si" ? "sí" : "no";
    case "licencia":
      return c.licencia == null ? "sin dato" : c.licencia ? "sí" : "no";
    case "hijos":
      return c.hijos == null ? "sin dato" : c.hijos ? "con hijos" : "sin hijos";
    case "edad":
      return c.edad != null ? `${c.edad} años` : "sin dato";
    case "ha":
      return c.ha != null ? `${c.ha.toLocaleString("es-AR")} ha` : "sin dato";
    case "educacion":
      return c.edu != null ? EDU_NIVELES[c.edu] : "sin dato";
    case "gente":
      return c.gente != null ? `${c.gente}` : "sin dato";
    case "ganaderia":
      return c.ganaderia.length ? c.ganaderia.join(", ") : "sin dato";
    case "civil":
      return c.civil ?? "sin dato";
  }
}

const EST_CLS = { ok: "v2d-ok", no: "v2d-no", sd: "v2d-sd" } as const;

export function MatchingWorkspace({
  busqueda,
  busquedaId,
  ranked,
  enBusquedaIds,
  fichas,
  preview = false,
}: {
  busqueda: BusquedaMatch;
  busquedaId: string;
  ranked: Row[];
  enBusquedaIds: string[];
  fichas: Record<string, Ficha>;
  // En el preview local (sin auth) NO escribe en prod: simula el alta en la UI.
  preview?: boolean;
}) {
  const [q, setQ] = useState("");
  const [tierF, setTierF] = useState<"all" | Tier>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [agregados, setAgregados] = useState<Set<string>>(new Set());
  const [agregando, setAgregando] = useState<string | null>(null);
  const enBusqueda = useMemo(() => new Set(enBusquedaIds), [enBusquedaIds]);
  const yaEsta = (id: string) => enBusqueda.has(id) || agregados.has(id);

  async function onAgregar(id: string) {
    // Preview local: no toca prod, solo simula el alta en la UI.
    if (preview) {
      setAgregados((prev) => new Set(prev).add(id));
      return;
    }
    setAgregando(id);
    const res = await createGestion({ candidato_id: id, busqueda_id: busquedaId });
    setAgregando(null);
    if (res.success) setAgregados((prev) => new Set(prev).add(id));
    else alert(res.error);
  }

  // Solo para screenshots headless (no clickean): ?abrir=top abre el 1ro del ranking.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("abrir") === "top" && ranked[0]) {
      setOpenId(ranked[0].c.id);
    }
  }, [ranked]);

  const counts = useMemo(() => {
    const c = { green: 0, amber: 0, red: 0 };
    for (const r of ranked) c[r.tier]++;
    return c;
  }, [ranked]);

  const list = useMemo(
    () =>
      ranked.filter((r) => {
        if (tierF !== "all" && r.tier !== tierF) return false;
        if (q && !`${r.c.nombre} ${r.c.apellido}`.toLowerCase().includes(q.toLowerCase()))
          return false;
        return true;
      }),
    [ranked, q, tierF],
  );

  const open = ranked.find((r) => r.c.id === openId) ?? null;
  const obligatorios = busqueda.requisitos.filter((r) => r.nivel === "obligatorio");
  const deseables = busqueda.requisitos.filter((r) => r.nivel === "deseable");

  return (
    <div className="v2d-scope">
      <style>{CSS}</style>

      <div className="v2d-summary">
        <span className="v2d-sumitem">
          <b style={{ color: "var(--gl-green)" }}>{counts.green}</b> buen match
        </span>
        <span className="v2d-sumitem">
          <b style={{ color: "var(--gl-amber)" }}>{counts.amber}</b> a confirmar
        </span>
        <span className="v2d-sumitem">
          <b style={{ color: "var(--gl-ink-3)" }}>{counts.red}</b> no cumple
        </span>
        <span className="v2d-sumnote">de {ranked.length} candidatos · rankeados por encaje</span>
      </div>

      <div className="v2d-filterbar">
        <input
          className="v2d-fsearch"
          placeholder="Buscar por nombre…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="v2d-tierchips">
          {(["all", "green", "amber", "red"] as const).map((t) => (
            <button
              type="button"
              key={t}
              className={`v2d-tchip ${tierF === t ? "on" : ""}`}
              onClick={() => setTierF(t)}
            >
              {t === "all" ? "Todos" : TIER_LABEL[t]}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 && <div className="v2d-noresults">Sin candidatos con ese filtro.</div>}
      {list.slice(0, 60).map((r) => {
        const p = av(r.c.nombre);
        return (
          <div
            key={r.c.id}
            className={`v2d-crow ${r.tier === "red" ? "dim" : ""}`}
            onClick={() => setOpenId(r.c.id)}
          >
            <div className="v2d-avatar" style={{ background: p.bg, color: p.c }}>
              {r.c.nombre[0]}
              {r.c.apellido[0]}
            </div>
            <div className="v2d-meta">
              <div className="v2d-nm">
                {r.c.nombre} {r.c.apellido}
              </div>
              <div className="v2d-rsub">
                {r.c.cats.slice(0, 2).join(", ") || "sin categoría"}
                {r.c.zona ? ` · ${r.c.zona}` : ""}
              </div>
            </div>
            <span className={`v2d-badge ${TIER_CLS[r.tier]}`}>{TIER_LABEL[r.tier]}</span>
            {yaEsta(r.c.id) ? (
              <span className="v2d-enb">✓ en la búsqueda</span>
            ) : (
              <button
                type="button"
                className="v2d-addbtn"
                disabled={agregando === r.c.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onAgregar(r.c.id);
                }}
              >
                {agregando === r.c.id ? "Agregando…" : "+ Agregar"}
              </button>
            )}
          </div>
        );
      })}
      {list.length > 60 && <div className="v2d-more">+{list.length - 60} más…</div>}

      {open && (
        <>
          <div className="v2d-scrim" onClick={() => setOpenId(null)} />
          <aside className="v2d-drawer">
            <button className="v2d-dclose" onClick={() => setOpenId(null)}>
              ×
            </button>
            <div className="v2d-dhead">
              <div
                className="v2d-avatar v2d-lg"
                style={{ background: av(open.c.nombre).bg, color: av(open.c.nombre).c }}
              >
                {open.c.nombre[0]}
                {open.c.apellido[0]}
              </div>
              <div>
                <div className="v2d-dnm">
                  {open.c.nombre} {open.c.apellido}
                </div>
                <div className="v2d-drole">{open.c.cats.join(", ") || "sin categoría"}</div>
              </div>
              <span className={`v2d-badge ${TIER_CLS[open.tier]}`} style={{ marginLeft: "auto" }}>
                {TIER_LABEL[open.tier]}
              </span>
            </div>

            <div className="v2d-dsec">
              <h4>Frente a esta búsqueda</h4>
              <div className="v2d-matchlbl">Obligatorio</div>
              {(() => {
                const ce = evalCat(open.c, busqueda.acceptedCats);
                const e = (ce === "skip" ? "sd" : ce) as "ok" | "no" | "sd";
                return (
                  <ReqRow
                    estado={e}
                    label="Categoría aceptada"
                    valor={open.c.cats.join(", ") || "sin dato"}
                  />
                );
              })()}
              {obligatorios.map((r, i) => (
                <ReqRow
                  key={i}
                  estado={evalReq(open.c, r)}
                  label={reqLabel(r)}
                  valor={candValTxt(open.c, r)}
                />
              ))}
              <div className="v2d-matchlbl">Deseable</div>
              {deseables.length === 0 && <div className="v2d-rsub">Sin requisitos deseables.</div>}
              {deseables.map((r, i) => (
                <ReqRow
                  key={i}
                  estado={evalReq(open.c, r)}
                  label={reqLabel(r)}
                  valor={candValTxt(open.c, r)}
                  dese
                />
              ))}
            </div>

            <div className="v2d-dsec">
              <h4>Habilidades detectadas</h4>
              <div className="v2d-rgrid">
                {open.c.habilidades.length ? (
                  open.c.habilidades.map((h) => (
                    <span key={h} className="v2d-rchip dese">
                      {h}
                    </span>
                  ))
                ) : (
                  <span className="v2d-rsub">Ninguna detectada en el CV.</span>
                )}
              </div>
            </div>

            {(() => {
              const fch = fichas[open.c.id];
              if (!fch) return null;
              const tel = fch.telefono?.replace(/[^\d]/g, "");
              const kv: [string, string][] = [];
              if (open.c.zona) kv.push(["Ubicación", open.c.zona]);
              if (open.c.edad != null) kv.push(["Edad", `${open.c.edad} años`]);
              if (open.c.civil) kv.push(["Estado civil", open.c.civil]);
              if (open.c.hijos != null) kv.push(["Hijos", open.c.hijos ? "Sí" : "No"]);
              if (open.c.vehiculo != null)
                kv.push([
                  "Vehículo",
                  open.c.vehiculo
                    ? fch.vehiculoDetalle
                      ? `Sí — ${fch.vehiculoDetalle}`
                      : "Sí"
                    : "No",
                ]);
              if (open.c.licencia != null) kv.push(["Licencia", open.c.licencia ? "Sí" : "No"]);
              if (fch.disponibilidad) kv.push(["Disponibilidad", fch.disponibilidad]);
              if (fch.pretension) kv.push(["Pretensión", fch.pretension]);
              return (
                <>
                  {tel && (
                    <div className="v2d-dsec">
                      <h4>Contacto</h4>
                      <a
                        className="v2d-wa"
                        href={`https://wa.me/${tel}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <span className="v2d-waic">✆</span>
                        <span>
                          <span className="v2d-wal">WhatsApp</span>
                          <span className="v2d-wav">{fch.telefono}</span>
                        </span>
                      </a>
                    </div>
                  )}

                  {kv.length > 0 && (
                    <div className="v2d-dsec">
                      <h4>Ficha</h4>
                      {kv.map(([k, v]) => (
                        <div className="v2d-drow" key={k}>
                          <span className="v2d-k">{k}</span>
                          <span className="v2d-v">{v}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {fch.trayectoria.length > 0 && (
                    <div className="v2d-dsec">
                      <h4>Trayectoria</h4>
                      <div className="v2d-expstack">
                        {fch.trayectoria.map((e, i) => (
                          <ExpCard key={i} exp={e} actual={i === 0} />
                        ))}
                      </div>
                    </div>
                  )}

                  {fch.referencias.length > 0 && (
                    <div className="v2d-dsec">
                      <h4>Referencias</h4>
                      {fch.referencias.map((r, i) => (
                        <div className={`v2d-ref ${r.calif}`} key={i}>
                          <div className="v2d-reftop">
                            <span className="v2d-refde">{r.de}</span>
                            <span className={`v2d-refpill ${r.calif}`}>
                              {r.calif === "buena" ? "👍 Buena" : "👎 Mala"}
                            </span>
                          </div>
                          {r.nota && <div className="v2d-refnota">{r.nota}</div>}
                        </div>
                      ))}
                    </div>
                  )}

                  {fch.notas && (
                    <div className="v2d-dsec">
                      <h4>Notas del recruiter</h4>
                      <div className="v2d-rsub" style={{ lineHeight: 1.5 }}>
                        {fch.notas}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}

            {(() => {
              const gaps = gapsDe(open.c, busqueda);
              if (!gaps.length) return null;
              return (
                <div className="v2d-gaps">
                  <div className="v2d-gh">
                    Faltan {gaps.length} dato{gaps.length > 1 ? "s" : ""} para confirmar
                  </div>
                  <div className="v2d-gl">{gaps.map(reqLabel).join(" · ")}</div>
                  <button type="button">Preguntar por WhatsApp</button>
                </div>
              );
            })()}

            <div className="v2d-dlinks">
              {yaEsta(open.c.id) ? (
                <span className="v2d-enb" style={{ fontSize: 13 }}>
                  ✓ Ya está en la búsqueda
                </span>
              ) : (
                <button
                  type="button"
                  className="v2d-addbig"
                  disabled={agregando === open.c.id}
                  onClick={() => onAgregar(open.c.id)}
                >
                  {agregando === open.c.id ? "Agregando…" : "+ Agregar a la búsqueda"}
                </button>
              )}
              <Link href={`/candidatos/${open.c.id}`} className="v2d-verperfil">
                Ver perfil completo →
              </Link>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

function ExpCard({ exp, actual }: { exp: Ficha["trayectoria"][number]; actual: boolean }) {
  const [open, setOpen] = useState(actual);
  return (
    <div className={`v2d-exp ${open ? "open" : ""}`}>
      <div className="v2d-exphead" onClick={() => setOpen(!open)}>
        <div style={{ minWidth: 0 }}>
          <div className="v2d-exptop">
            {actual && <span className="v2d-expact">Actual</span>}
            <span className="v2d-exptitle">{exp.rol}</span>
          </div>
          <div className="v2d-expsub">
            {exp.empresa}
            {exp.lugar ? ` · ${exp.lugar}` : ""}
          </div>
          <div className="v2d-expper">{exp.periodo}</div>
        </div>
        <span className="v2d-expchev">{open ? "▾" : "▸"}</span>
      </div>
      {open && exp.descripcion && <div className="v2d-expbody">{exp.descripcion}</div>}
    </div>
  );
}

function ReqRow({
  estado,
  label,
  valor,
  dese,
}: {
  estado: "ok" | "no" | "sd";
  label: string;
  valor: string;
  dese?: boolean;
}) {
  const icon = estado === "ok" ? "✓" : estado === "no" ? "✕" : "?";
  return (
    <div className="v2d-drow">
      <span className="v2d-k">
        <span className={`v2d-est ${EST_CLS[estado]}`}>{icon}</span> {label}
        {dese && <span className="v2d-dchip">deseable</span>}
      </span>
      <span className={`v2d-v ${estado === "sd" ? "sd" : ""}`}>{valor}</span>
    </div>
  );
}

const CSS = `
.v2d-scope{--gl-green:#1a7f37;--gl-green-bg:#dafbe1;--gl-amber:#9a6700;--gl-amber-bg:#fff8c5;--gl-red:#cf222e;--gl-red-bg:#ffebe9;--gl-gray-bg:#f6f8fa}
.v2d-scope *{box-sizing:border-box}
.v2d-summary{display:flex;align-items:center;gap:1.2rem;flex-wrap:wrap;font-size:13px;color:var(--gl-ink-2);padding-bottom:1rem}
.v2d-sumitem b{font-size:15px;font-variant-numeric:tabular-nums}
.v2d-sumnote{color:var(--gl-ink-3);font-size:12px;margin-left:auto}
.v2d-filterbar{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;padding-bottom:1rem;border-bottom:1px solid var(--gl-border)}
.v2d-fsearch{flex:1;min-width:150px;border:1px solid var(--gl-border-md);border-radius:.6rem;padding:.5rem .75rem;font-size:13px;outline:none;font-family:inherit}
.v2d-fsearch:focus{border-color:var(--gl-olive);box-shadow:0 0 0 3px var(--gl-olive-bg)}
.v2d-tierchips{display:inline-flex;gap:.3rem;flex-wrap:wrap}
.v2d-tchip{border:1px solid var(--gl-border-md);background:#fff;color:var(--gl-ink-3);border-radius:999px;padding:.34rem .7rem;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit}
.v2d-tchip.on{background:var(--gl-olive);color:#fff;border-color:var(--gl-olive)}
.v2d-noresults,.v2d-more{padding:1.2rem;text-align:center;color:var(--gl-ink-3);font-size:13px}
.v2d-crow{display:flex;gap:.75rem;align-items:center;padding:.75rem .5rem;border-top:1px solid var(--gl-border);cursor:pointer;border-radius:.75rem;margin:0 -.5rem}
.v2d-crow:hover{background:var(--gl-bg)}
.v2d-crow.dim{opacity:.6}
.v2d-avatar{flex-shrink:0;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;text-transform:uppercase}
.v2d-avatar.v2d-lg{width:52px;height:52px;font-size:16px}
.v2d-meta{flex:1;min-width:0}
.v2d-nm{font-weight:600;font-size:13.5px;color:var(--gl-ink);display:flex;align-items:center;gap:.5rem;flex-wrap:wrap}
.v2d-enb{font-size:10.5px;font-weight:600;color:var(--gl-olive)}
.v2d-rsub{font-size:12px;color:var(--gl-ink-3);margin-top:.15rem}
.v2d-badge{font-size:10.5px;padding:.16rem .55rem;border-radius:999px;font-weight:600;white-space:nowrap}
.v2d-green{background:var(--gl-green-bg);color:var(--gl-green)}
.v2d-amber{background:var(--gl-amber-bg);color:var(--gl-amber)}
.v2d-red{background:var(--gl-red-bg);color:var(--gl-red)}
.v2d-scrim{position:fixed;inset:0;background:rgba(13,17,23,.32);z-index:55}
.v2d-drawer{position:fixed;top:0;right:0;height:100vh;width:min(520px,94vw);background:#fff;box-shadow:-8px 0 44px rgba(13,17,23,.16);z-index:60;overflow-y:auto}
.v2d-dclose{position:absolute;top:.95rem;right:1.1rem;width:32px;height:32px;border:none;border-radius:50%;background:var(--gl-bg);color:var(--gl-ink-2);font-size:19px;cursor:pointer}
.v2d-dhead{padding:1.6rem 3.2rem 1.3rem 1.6rem;display:flex;gap:1rem;align-items:center;border-bottom:1px solid var(--gl-border)}
.v2d-dnm{font-size:19px;font-weight:700;line-height:1.15;color:var(--gl-ink)}
.v2d-drole{font-size:12.5px;color:var(--gl-ink-3);margin-top:2px}
.v2d-dsec{padding:1.2rem 1.6rem;border-bottom:1px solid var(--gl-border)}
.v2d-dsec h4{font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--gl-ink-3);margin-bottom:.8rem}
.v2d-matchlbl{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--gl-ink-3);margin:.85rem 0 .4rem}
.v2d-matchlbl:first-of-type{margin-top:0}
.v2d-drow{display:flex;justify-content:space-between;gap:.6rem;font-size:13px;padding:.4rem 0;border-bottom:1px dashed var(--gl-border)}
.v2d-drow:last-child{border-bottom:none}
.v2d-k{color:var(--gl-ink-2);display:inline-flex;align-items:center;gap:.4rem}
.v2d-v{font-weight:600;text-align:right;color:var(--gl-ink)}
.v2d-v.sd{color:var(--gl-amber)}
.v2d-est{display:inline-grid;place-items:center;width:18px;height:18px;border-radius:50%;font-size:11px;font-weight:700;flex-shrink:0}
.v2d-ok{background:var(--gl-green-bg);color:var(--gl-green)}
.v2d-no{background:var(--gl-red-bg);color:var(--gl-red)}
.v2d-sd{background:var(--gl-amber-bg);color:var(--gl-amber)}
.v2d-dchip{font-size:9.5px;font-weight:600;padding:.05rem .35rem;border-radius:999px;background:var(--gl-gray-bg);color:var(--gl-ink-3);margin-left:.35rem}
.v2d-rgrid{display:flex;flex-wrap:wrap;gap:.4rem}
.v2d-rchip{display:inline-flex;padding:.36rem .64rem;border-radius:999px;font-size:12px;font-weight:600;line-height:1}
.v2d-rchip.dese{background:var(--gl-olive-bg);color:var(--gl-olive)}
.v2d-gaps{margin:1.2rem 1.6rem;padding:.95rem 1rem;background:var(--gl-amber-bg);border:1px solid rgba(154,103,0,.28);border-radius:.875rem}
.v2d-gh{font-size:12px;font-weight:700;color:var(--gl-amber);margin-bottom:.45rem}
.v2d-gl{font-size:12.5px;color:var(--gl-amber);line-height:1.45;margin-bottom:.7rem}
.v2d-gaps button{width:100%;background:#fff;border:1px solid rgba(154,103,0,.28);color:var(--gl-amber);border-radius:.6rem;padding:.55rem;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit}
.v2d-dlinks{padding:1.1rem 1.6rem;display:flex;flex-direction:column;gap:.7rem;align-items:flex-start}
.v2d-verperfil{font-size:13px;font-weight:600;color:var(--gl-olive);text-decoration:none}
.v2d-addbtn{flex-shrink:0;display:inline-flex;align-items:center;gap:.25rem;padding:.4rem .7rem;font-size:12px;font-weight:600;color:#fff;background:var(--gl-olive);border:none;border-radius:.6rem;cursor:pointer;white-space:nowrap;font-family:inherit}
.v2d-addbtn:hover{filter:brightness(1.07)}
.v2d-addbtn:disabled{opacity:.6;cursor:default}
.v2d-addbig{width:100%;padding:.6rem;font-size:13.5px;font-weight:600;color:#fff;background:var(--gl-olive);border:none;border-radius:.7rem;cursor:pointer;font-family:inherit}
.v2d-addbig:hover{filter:brightness(1.07)}
.v2d-addbig:disabled{opacity:.6;cursor:default}
.v2d-wa{display:flex;align-items:center;gap:.7rem;padding:.6rem .7rem;border:1px solid var(--gl-border);border-radius:.7rem;text-decoration:none}
.v2d-waic{width:32px;height:32px;border-radius:.5rem;display:grid;place-items:center;flex-shrink:0;background:var(--gl-green-bg);color:var(--gl-green);font-size:15px}
.v2d-wal{display:block;font-size:9.5px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--gl-ink-3)}
.v2d-wav{display:block;font-size:13px;color:var(--gl-ink);margin-top:1px;font-family:ui-monospace,Menlo,monospace}
.v2d-expstack{display:flex;flex-direction:column;gap:.5rem}
.v2d-exp{border:1px solid var(--gl-border);border-radius:10px;overflow:hidden;background:#fff}
.v2d-exp.open{border-color:var(--gl-olive-bg)}
.v2d-exphead{padding:.7rem .9rem;display:flex;align-items:flex-start;justify-content:space-between;gap:10px;cursor:pointer;user-select:none}
.v2d-exphead:hover{background:var(--gl-bg)}
.v2d-exptop{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.v2d-expact{font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--gl-olive);background:var(--gl-olive-bg);padding:2px 7px;border-radius:20px}
.v2d-exptitle{font-size:13.5px;font-weight:700;color:var(--gl-ink)}
.v2d-expsub{font-size:12px;color:var(--gl-ink-3);margin-top:2px}
.v2d-expper{font-size:11px;color:var(--gl-ink-3);margin-top:1px;font-variant-numeric:tabular-nums}
.v2d-expchev{color:var(--gl-ink-3);font-size:11px;flex-shrink:0;padding-top:3px}
.v2d-expbody{padding:.5rem .9rem .8rem;border-top:1px solid var(--gl-border);font-size:12.5px;color:var(--gl-ink-2);line-height:1.5}
.v2d-ref{position:relative;padding:.6rem .75rem .6rem .9rem;border:1px solid var(--gl-border);border-radius:.7rem;margin-bottom:.5rem;overflow:hidden}
.v2d-ref:last-child{margin-bottom:0}
.v2d-ref::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px}
.v2d-ref.buena::before{background:var(--gl-green)}
.v2d-ref.mala::before{background:var(--gl-red)}
.v2d-reftop{display:flex;align-items:center;justify-content:space-between;gap:.5rem}
.v2d-refde{font-size:12.5px;font-weight:600;color:var(--gl-ink)}
.v2d-refpill{font-size:10px;font-weight:700;padding:.16rem .5rem;border-radius:999px;white-space:nowrap}
.v2d-refpill.buena{background:var(--gl-green-bg);color:var(--gl-green)}
.v2d-refpill.mala{background:var(--gl-red-bg);color:var(--gl-red)}
.v2d-refnota{font-size:12px;color:var(--gl-ink-2);margin-top:.35rem;line-height:1.4;font-style:italic}
`;
