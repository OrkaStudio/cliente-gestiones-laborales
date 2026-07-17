"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCriterios } from "@/components/app/criterios-provider";
import type { Ficha } from "@/lib/v2/desde-busqueda";
import { createGestion } from "@/lib/actions/gestiones";
import {
  type BusquedaMatch,
  type CandidatoMatch,
  EDU_NIVELES,
  evalCat,
  evalReq,
  gapsDe,
  motivoDe,
  motivoDesglose,
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
    case "pareja":
      return c.pareja === true ? "viene en pareja" : "sin dato";
  }
}

const EST_CLS = { ok: "v2d-ok", no: "v2d-no", sd: "v2d-sd" } as const;

/** El hueco de dato, convertido en la pregunta que hay que hacerle al candidato. */
function preguntaDe(r: Requisito): string {
  switch (r.campo) {
    case "hab":
      return `¿Tenés experiencia en ${r.hab.toLowerCase()}?`;
    case "residir":
      return "¿Estarías dispuesto a vivir en el campo?";
    case "vehiculo":
      return "¿Tenés vehículo propio?";
    case "licencia":
      return "¿Tenés licencia de conducir?";
    case "ha":
      return "¿De qué tamaño eran los campos que manejaste (en hectáreas)?";
    case "gente":
      return "¿Cuánta gente tuviste a cargo?";
    case "educacion":
      return "¿Qué nivel de estudios tenés?";
    case "edad":
      return "¿Cuál es tu fecha de nacimiento?";
    case "ganaderia":
      return "¿Con qué tipo de ganadería trabajaste?";
    case "civil":
      return "¿Cuál es tu estado civil?";
    case "hijos":
      return "¿Tenés hijos?";
    case "pareja":
      return "¿Venís en pareja? ¿Tu pareja también estaría buscando trabajo en el campo?";
  }
}

export function MatchingWorkspace({
  busquedaId,
  enBusquedaIds,
  fichas,
}: {
  busquedaId: string;
  enBusquedaIds: string[];
  fichas: Record<string, Ficha>;
}) {
  // Los criterios y el ranking vienen del contexto: así, cuando la recruiter toca un chip
  // en el panel de la derecha, esta lista se re-rankea en el momento.
  const { busqueda, ranked, preview } = useCriterios();
  const [q, setQ] = useState("");
  const [expandida, setExpandida] = useState(false);
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

      {/* La lista scrollea DENTRO de su card: con 179 candidatos estiraba la página hasta
          dejar los requisitos fuera de pantalla, y ahí se perdía el efecto de editarlos. */}
      <div
        className="overflow-y-auto -mx-1 px-1"
        style={{ maxHeight: expandida ? "none" : 520 }}
      >
      {list.length === 0 && <div className="v2d-noresults">Sin candidatos con ese filtro.</div>}
      {list.slice(0, expandida ? list.length : 60).map((r) => {
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
              {/* Buen match: el encaje completo (Cumple / A confirmar / No cumple) para decidir
                  a quién llamar. Ámbar y rojo: la línea de motivo de siempre, con su color. */}
              {r.tier === "green" ? (
                <DesgloseLineas c={r.c} busqueda={busqueda} />
              ) : (
                <div
                  className="text-[12px] mt-0.5"
                  style={{ color: r.tier === "red" ? "var(--gl-ink-3)" : "var(--gl-amber)" }}
                >
                  {motivoDe(r.c, busqueda)}
                </div>
              )}
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
      </div>

      {list.length > 6 && (
        <button
          type="button"
          onClick={() => setExpandida((v) => !v)}
          className="w-full mt-2 py-2 text-[12px] font-bold rounded-xl"
          style={{ background: "var(--gl-gray-bg)", color: "var(--gl-ink-2)" }}
        >
          {expandida ? "Achicar la lista ↑" : `Ver los ${list.length} ↓`}
        </button>
      )}

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
                  {/* Sección "Contacto" quitada: el WhatsApp del candidato ya está en el
                      botón "Preguntar por WhatsApp" (abajo) y en "+ Agregar". Mostrarlo
                      también acá era repetir. */}
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
                        <div className="v2d-ref" key={i}>
                          <div className="v2d-reftop">
                            <span className="v2d-refde">{r.nombre}</span>
                            {r.relacion && <span className="v2d-dchip">{r.relacion}</span>}
                          </div>
                          {r.contacto && (
                            <a
                              className="v2d-refcont"
                              href={`https://wa.me/${r.contacto.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {r.contacto}
                            </a>
                          )}
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
              // El botón no hacía nada. Ahora abre el chat con las preguntas ya escritas:
              // el motor sabe QUÉ falta, y el teléfono ya lo tenemos. Ese es el loop que hoy
              // hacen a mano.
              const tel = (fichas[open.c.id]?.telefono ?? "").replace(/\D/g, "");
              const preguntas = gaps.map((g) => `· ${preguntaDe(g)}`).join("\n");
              const msg = `Hola ${open.c.nombre}! Te escribo de Gestiones Laborales por una búsqueda de ${busqueda.puesto}. Para avanzar necesitaría confirmar:\n${preguntas}\n\nGracias!`;
              return (
                <div className="v2d-gaps">
                  <div className="v2d-gh">
                    Faltan {gaps.length} dato{gaps.length > 1 ? "s" : ""} para confirmar
                  </div>
                  <div className="v2d-gl">{gaps.map(reqLabel).join(" · ")}</div>
                  {tel ? (
                    <a
                      href={`https://wa.me/${tel}?text=${encodeURIComponent(msg)}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ display: "block", textAlign: "center", textDecoration: "none" }}
                    >
                      <button type="button">Preguntar por WhatsApp</button>
                    </a>
                  ) : (
                    <button type="button" disabled title="El candidato no tiene teléfono cargado">
                      Sin teléfono cargado
                    </button>
                  )}
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

  // Todo esto ya estaba en la tabla `experiencia_laboral` y el drawer lo tiraba a la basura.
  // El tamaño del campo es el requisito de hectáreas; el motivo de salida es lo primero que
  // quiere saber una recruiter antes de llamar.
  const detalle: [string, string][] = [];
  if (exp.dimension) detalle.push(["Campo", exp.dimension]);
  if (exp.personalACargo) detalle.push(["Gente a cargo", exp.personalACargo]);
  if (exp.propietario) detalle.push(["Dueño", exp.propietario]);
  if (exp.enBlanco != null) detalle.push(["En blanco", exp.enBlanco ? "Sí" : "No"]);
  if (exp.ingresos) detalle.push(["Sueldo", exp.ingresos]);
  if (exp.beneficios) detalle.push(["Beneficios", exp.beneficios]);

  return (
    <div className={`v2d-exp ${open ? "open" : ""}`}>
      <div className="v2d-exphead" onClick={() => setOpen(!open)}>
        <div style={{ minWidth: 0 }}>
          <div className="v2d-exptop">
            {actual && <span className="v2d-expact">Actual</span>}
            {/* 13% de las experiencias no tienen puesto cargado: que el campo haga de título
                en vez de dejar el renglón vacío. */}
            <span className="v2d-exptitle">{exp.rol !== "—" ? exp.rol : exp.empresa}</span>
          </div>
          <div className="v2d-expsub">
            {exp.rol !== "—" ? exp.empresa : ""}
            {exp.rol !== "—" && exp.lugar ? " · " : ""}
            {exp.lugar ?? ""}
          </div>
          {(exp.periodo || exp.antiguedad) && (
            <div className="v2d-expper">
              {exp.periodo ?? ""}
              {/* La permanencia es la señal, no la fecha: cambiar cada 8 meses dice algo. */}
              {exp.periodo && exp.antiguedad ? " · " : ""}
              {exp.antiguedad ?? ""}
            </div>
          )}
        </div>
        <span className="v2d-expchev">{open ? "▾" : "▸"}</span>
      </div>
      {open && (
        <div className="v2d-expbody">
          {detalle.length > 0 && (
            <div className="v2d-expkv">
              {detalle.map(([k, v]) => (
                <div key={k}>
                  <span>{k}</span>
                  <b>{v}</b>
                </div>
              ))}
            </div>
          )}
          {exp.descripcion && <p style={{ margin: 0 }}>{exp.descripcion}</p>}
          {exp.motivoSalida && (
            <p className="v2d-expsalida">
              <span>Por qué se fue</span>
              {exp.motivoSalida}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

const capitalizar = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * El encaje del candidato contra la búsqueda para BUEN MATCH: qué falta CONFIRMAR (ámbar) y qué
 * NO CUMPLE (rojo). No listamos lo que cumple — eso ya lo dice el badge "Buen match"; la lista
 * sirve para ver qué le falta a cada uno. Formato de una línea por estado: "Estado · Ítem, Ítem"
 * (con mayúscula inicial), coloreada según su estado. Sin nada pendiente ni roto, "Cumple todo".
 */
function DesgloseLineas({ c, busqueda }: { c: CandidatoMatch; busqueda: BusquedaMatch }) {
  const g = motivoDesglose(c, busqueda);
  const lineas = [
    { lbl: "A confirmar", items: g.confirmar, color: "var(--gl-amber)" },
    { lbl: "No cumple", items: g.noCumple, color: "var(--gl-red)" },
  ].filter((x) => x.items.length > 0);
  return (
    <div className="v2d-desg">
      {lineas.length === 0 ? (
        <div className="v2d-dgline" style={{ color: "var(--gl-green)" }}>
          Cumple todo
        </div>
      ) : (
        lineas.map((x) => (
          <div className="v2d-dgline" key={x.lbl} style={{ color: x.color }}>
            {x.lbl} · {x.items.map(capitalizar).join(", ")}
          </div>
        ))
      )}
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
.v2d-desg{margin-top:.2rem;display:flex;flex-direction:column;gap:1px}
.v2d-dgline{font-size:12px;line-height:1.4}
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
.v2d-expkv{display:grid;grid-template-columns:1fr 1fr;gap:.35rem .8rem;margin:.15rem 0 .6rem}
.v2d-expkv > div{display:flex;flex-direction:column}
.v2d-expkv span{font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--gl-ink-3)}
.v2d-expkv b{font-size:12.5px;color:var(--gl-ink);font-weight:600}
.v2d-expsalida{margin:.6rem 0 0;padding:.5rem .65rem;background:var(--gl-amber-bg);border-radius:.5rem;color:var(--gl-amber);font-size:12px;line-height:1.45}
.v2d-expsalida span{display:block;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-bottom:.15rem}
.v2d-refcont{display:inline-block;margin-top:.3rem;font-size:12.5px;font-weight:600;color:var(--gl-olive);text-decoration:none}
.v2d-refcont:hover{text-decoration:underline}
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
