import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Calendar, Users, Target, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SumarCandidatoDialog } from "@/components/app/sumar-candidato-dialog";
import { GestionEstadoSelect } from "@/components/app/gestion-estado-select";

const AVATAR_HEX = [
  { bg: "#dafbe1", color: "#1a7f37" },
  { bg: "#ddf4ff", color: "#0550ae" },
  { bg: "#ffd8eb", color: "#99286e" },
  { bg: "#fff8c5", color: "#7d4e00" },
  { bg: "#eddeff", color: "#6e40c9" },
];

const STAGES = [
  { key: "preseleccionado",    label: "Preseleccionado" },
  { key: "entrevista_orka",    label: "Entrevista GL" },
  { key: "presentado_cliente", label: "Presentado" },
  { key: "entrevista_cliente", label: "2ª Entrevista" },
  { key: "ofertado",           label: "Ofertado" },
  { key: "contratado",         label: "Contratado" },
];

function calcDaysOpen(fecha: string) {
  if (!fecha) return 0;
  return Math.floor((Date.now() - new Date(fecha).getTime()) / 86_400_000);
}

function diasDesde(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

const CARD = {
  background: "#ffffff",
  borderColor: "var(--gl-border)",
  boxShadow: "0 2px 8px rgba(13,17,23,0.05)",
} as const;

export default async function BusquedaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: busqueda }, { data: gestionesData }, { data: candidatosActivos }] =
    await Promise.all([
      supabase.from("busquedas").select("*").eq("id", id).single(),
      supabase
        .from("gestiones")
        .select("*, candidatos(id, nombre, apellido, ultimo_puesto)")
        .eq("busqueda_id", id)
        .order("updated_at", { ascending: false }),
      supabase
        .from("candidatos")
        .select("id, nombre, apellido, ultimo_puesto, ubicacion, estado")
        .eq("estado", "activo")
        .order("apellido"),
    ]);

  if (!busqueda) notFound();

  const daysOpen    = calcDaysOpen(busqueda.fecha_apertura);
  const descartados = gestionesData?.filter((g) => g.estado === "descartado").length ?? 0;
  const contratados = gestionesData?.filter((g) => g.estado === "contratado").length ?? 0;
  const activos     = (gestionesData?.length ?? 0) - descartados;

  const funnel = STAGES.map((s) => ({
    ...s,
    count: gestionesData?.filter((g) => g.estado === s.key).length ?? 0,
  })).filter((s) => s.count > 0);
  const maxCount = Math.max(...funnel.map((s) => s.count), 1);

  const puestoChar = busqueda.puesto.charCodeAt(0);
  const headerPal  = AVATAR_HEX[puestoChar % AVATAR_HEX.length];

  const estadoBadge  = busqueda.estado === "activa" ? "gl-badge-green" : "gl-badge-gray"
  const editable     = busqueda.estado === "activa" || busqueda.estado === "pausada"

  const headerStats = [
    { label: "Días abierta", value: `${daysOpen}`,                        accent: daysOpen > 30 },
    { label: "En gestión",   value: `${activos}` },
    { label: "Requisitos",   value: `${busqueda.requisitos?.length ?? 0}` },
    { label: "Descartados",  value: `${descartados}` },
  ];

  return (
    <div className="px-10 py-10 space-y-5">

      {/* Back */}
      <Link
        href="/busquedas"
        className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
        style={{ color: "var(--gl-ink-3)" }}
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Búsquedas
      </Link>

      {/* ── Header card ──────────────────────────────────────────── */}
      <div className="rounded-2xl border p-6" style={CARD}>
        <div className="flex items-start justify-between gap-6">

          {/* Ícono + info */}
          <div className="flex items-start gap-5">
            <div
              className="h-14 w-14 rounded-2xl grid place-items-center text-xl font-bold shrink-0"
              style={{ background: headerPal.bg, color: headerPal.color }}
            >
              {busqueda.puesto[0].toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${estadoBadge}`}>
                  {busqueda.estado}
                </span>
                {contratados > 0 && (
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full gl-badge-green">
                    {contratados} contratado{contratados > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold leading-tight" style={{ color: "var(--gl-ink)" }}>
                {busqueda.puesto}
              </h1>
              <div className="flex items-center gap-2 flex-wrap mt-1.5">
                <span className="text-sm font-medium" style={{ color: "var(--gl-ink-3)" }}>
                  {busqueda.cliente}
                </span>
                {busqueda.ubicacion && (
                  <>
                    <span style={{ color: "var(--gl-border)" }}>·</span>
                    <span className="flex items-center gap-1 text-sm" style={{ color: "var(--gl-ink-3)" }}>
                      <MapPin className="h-3 w-3 shrink-0" />
                      {busqueda.ubicacion}
                    </span>
                  </>
                )}
                {busqueda.fecha_apertura && (
                  <>
                    <span style={{ color: "var(--gl-border)" }}>·</span>
                    <span className="flex items-center gap-1 text-sm" style={{ color: "var(--gl-ink-3)" }}>
                      <Calendar className="h-3 w-3 shrink-0" />
                      {busqueda.fecha_apertura}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex gap-2 shrink-0 items-center">
            {editable ? (
              <>
                <Link href={`/busquedas/${busqueda.id}/editar`} className="gl-btn-secondary">
                  Editar
                </Link>
                <SumarCandidatoDialog
                  busquedaId={busqueda.id}
                  busquedaPuesto={busqueda.puesto}
                  candidatos={candidatosActivos ?? []}
                  gestionesExistentes={(gestionesData ?? [])
                    .map((g) => (g.candidatos as { id: string } | null)?.id ?? "")
                    .filter(Boolean)}
                />
              </>
            ) : (
              <div
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
                style={{ background: "var(--gl-gray-bg)", color: "var(--gl-ink-3)" }}
              >
                <Lock style={{ width: 11, height: 11 }} />
                Búsqueda {busqueda.estado}
              </div>
            )}
          </div>
        </div>

        {/* Stats strip */}
        <div
          className="mt-5 pt-5 flex items-center gap-8 flex-wrap"
          style={{ borderTop: "1px solid var(--gl-border)" }}
        >
          {headerStats.map((s, i) => (
            <div key={i} className="flex flex-col gap-0.5">
              <span className="gl-eyebrow">{s.label}</span>
              <span
                className="text-[15px] font-bold tabular-nums"
                style={{ color: s.accent ? "var(--gl-olive)" : "var(--gl-ink)" }}
              >
                {s.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Izquierda: pipeline + candidatos ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Pipeline */}
          <div className="rounded-2xl border p-6" style={CARD}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-[15px] font-bold" style={{ color: "var(--gl-ink)" }}>
                  Pipeline
                </h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--gl-ink-3)" }}>
                  Distribución de candidatos por etapa
                </p>
              </div>
              {funnel.length > 0 && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full gl-badge-olive">
                  {activos} activo{activos !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {funnel.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Target className="h-8 w-8 mb-3" style={{ color: "var(--gl-olive)", opacity: 0.3 }} />
                <p className="text-sm font-medium" style={{ color: "var(--gl-ink)" }}>
                  Sin candidatos en pipeline
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--gl-ink-3)" }}>
                  Sumá un candidato a esta búsqueda para ver el pipeline.
                </p>
              </div>
            ) : (
              <div className="space-y-0">
                {funnel.map((stage) => (
                  <div
                    key={stage.key}
                    className="flex items-center gap-4 py-3.5"
                    style={{ borderTop: "1px solid var(--gl-border)" }}
                  >
                    <span
                      className="gl-eyebrow shrink-0 w-36"
                      style={{ color: "var(--gl-ink-3)" }}
                    >
                      {stage.label}
                    </span>
                    <div
                      className="flex-1 h-1.5 rounded-full overflow-hidden"
                      style={{ background: "var(--gl-border)" }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(stage.count / maxCount) * 100}%`,
                          background: stage.key === "contratado"
                            ? "var(--gl-green)"
                            : "var(--gl-olive)",
                        }}
                      />
                    </div>
                    <span
                      className="text-[13px] font-bold tabular-nums shrink-0 w-5 text-right"
                      style={{
                        color: stage.key === "contratado"
                          ? "var(--gl-green)"
                          : "var(--gl-olive)",
                      }}
                    >
                      {stage.count}
                    </span>
                  </div>
                ))}
                <div style={{ borderTop: "1px solid var(--gl-border)" }} />
              </div>
            )}
          </div>

          {/* Candidatos */}
          <div className="rounded-2xl border p-6" style={CARD}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-[15px] font-bold" style={{ color: "var(--gl-ink)" }}>
                  Candidatos
                </h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--gl-ink-3)" }}>
                  Todos los que participaron en esta búsqueda
                </p>
              </div>
              {(gestionesData?.length ?? 0) > 0 && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full gl-badge-olive">
                  {gestionesData!.length} total
                </span>
              )}
            </div>

            {!gestionesData?.length ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Users className="h-8 w-8 mb-3" style={{ color: "var(--gl-olive)", opacity: 0.3 }} />
                <p className="text-sm font-medium" style={{ color: "var(--gl-ink)" }}>
                  Sin candidatos
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--gl-ink-3)" }}>
                  Sumá candidatos activos a esta búsqueda.
                </p>
              </div>
            ) : (
              <div className="space-y-0">
                {gestionesData.map(({ id: gId, candidatos: cand, estado, updated_at }) => {
                  const isDescartado = estado === "descartado";
                  const isContratado = estado === "contratado";
                  const stageLabel   = STAGES.find((s) => s.key === estado)?.label ?? estado;
                  const stageIdx     = STAGES.findIndex((s) => s.key === estado);
                  const dias         = diasDesde(updated_at);
                  const c            = cand as {
                    id: string;
                    nombre: string;
                    apellido: string;
                    ultimo_puesto: string | null;
                  } | null;
                  const avatarPal    = c
                    ? AVATAR_HEX[(c.nombre.charCodeAt(0) + c.apellido.charCodeAt(0)) % AVATAR_HEX.length]
                    : AVATAR_HEX[0];

                  const stageBadgeCls = isDescartado
                    ? "gl-badge-gray"
                    : isContratado
                      ? "gl-badge-green"
                      : "gl-badge-olive";

                  return (
                    <div
                      key={gId}
                      className="flex items-center gap-3 py-3"
                      style={{
                        borderTop: "1px solid var(--gl-border)",
                        opacity: isDescartado ? 0.5 : 1,
                      }}
                    >
                      {c ? (
                        <Link
                          href={`/candidatos/${c.id}`}
                          className="gl-row flex items-center gap-3 flex-1 min-w-0 px-2 py-2 -mx-2"
                        >
                          <div
                            className="h-9 w-9 rounded-full grid place-items-center text-sm font-bold shrink-0"
                            style={{ background: avatarPal.bg, color: avatarPal.color }}
                          >
                            {c.nombre[0]}{c.apellido[0]}
                          </div>
                          <div className="min-w-0">
                            <div
                              className="text-[13.5px] font-semibold truncate"
                              style={{ color: "var(--gl-ink)" }}
                            >
                              {c.nombre} {c.apellido}
                            </div>
                            {c.ultimo_puesto && (
                              <div
                                className="text-xs mt-0.5 truncate"
                                style={{ color: "var(--gl-ink-3)" }}
                              >
                                {c.ultimo_puesto}
                              </div>
                            )}
                            {/* Stage track */}
                            {!isDescartado && stageIdx >= 0 && (
                              <div className="flex items-center gap-0.5 mt-2">
                                {STAGES.map((stage, i) => (
                                  <div key={stage.key} className="flex items-center gap-0.5">
                                    <div
                                      className="rounded-full"
                                      style={{
                                        width:      i === stageIdx ? 8 : 6,
                                        height:     i === stageIdx ? 8 : 6,
                                        background: i <= stageIdx ? "var(--gl-olive)" : "var(--gl-border)",
                                        opacity:    i < stageIdx ? 0.4 : 1,
                                      }}
                                    />
                                    {i < STAGES.length - 1 && (
                                      <div style={{
                                        height: 1, width: 12,
                                        background: i < stageIdx ? "var(--gl-olive)" : "var(--gl-border)",
                                        opacity: i < stageIdx ? 0.35 : 1,
                                      }} />
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </Link>
                      ) : (
                        <div className="flex-1" />
                      )}

                      <div className="text-right shrink-0 space-y-1.5 ml-2">
                        {c ? (
                          <GestionEstadoSelect
                            gestionId={gId}
                            candidatoId={c.id}
                            busquedaId={id}
                            estado={estado}
                            locked={!editable}
                          />
                        ) : (
                          <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-md block whitespace-nowrap ${stageBadgeCls}`}>
                            {stageLabel}
                          </span>
                        )}
                        <div
                          className="text-[11px] tabular-nums font-mono"
                          style={{ color: "var(--gl-ink-3)" }}
                        >
                          {dias}d sin cambio
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div style={{ borderTop: "1px solid var(--gl-border)" }} />
              </div>
            )}
          </div>
        </div>

        {/* ── Derecha: brief + requisitos + datos ── */}
        <div className="space-y-5">

          {/* Brief */}
          {busqueda.descripcion && (
            <div className="rounded-2xl border p-6" style={CARD}>
              <h2 className="text-[15px] font-bold mb-3" style={{ color: "var(--gl-ink)" }}>
                Brief
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: "var(--gl-ink-3)" }}>
                {busqueda.descripcion}
              </p>
            </div>
          )}

          {/* Requisitos */}
          {busqueda.requisitos?.length > 0 && (
            <div className="rounded-2xl border p-6" style={CARD}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[15px] font-bold" style={{ color: "var(--gl-ink)" }}>
                  Requisitos
                </h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full gl-badge-olive">
                  {busqueda.requisitos.length}
                </span>
              </div>
              <div className="space-y-0">
                {busqueda.requisitos.map((r: string, i: number) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 py-2.5"
                    style={{ borderTop: "1px solid var(--gl-border)" }}
                  >
                    <span
                      className="font-mono text-[10.5px] tabular-nums shrink-0 mt-0.5 font-semibold"
                      style={{ color: "var(--gl-border)" }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-sm" style={{ color: "var(--gl-ink)" }}>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Datos */}
          <div className="rounded-2xl border p-6" style={CARD}>
            <h2 className="text-[15px] font-bold mb-4" style={{ color: "var(--gl-ink)" }}>
              Datos
            </h2>
            <div className="space-y-0">
              {busqueda.rango_salarial && (
                <div
                  className="flex items-center justify-between gap-3 py-3"
                  style={{ borderBottom: "1px solid var(--gl-border)" }}
                >
                  <span className="gl-eyebrow">Rango salarial</span>
                  <span className="text-sm font-bold" style={{ color: "var(--gl-olive)" }}>
                    {busqueda.rango_salarial}
                  </span>
                </div>
              )}
              <div
                className="flex items-center justify-between gap-3 py-3"
                style={{ borderBottom: "1px solid var(--gl-border)" }}
              >
                <span className="gl-eyebrow">Apertura</span>
                <span className="text-sm font-mono tabular-nums" style={{ color: "var(--gl-ink)" }}>
                  {busqueda.fecha_apertura}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 py-3">
                <span className="gl-eyebrow">Tiempo abierta</span>
                <span
                  className="text-sm font-bold tabular-nums"
                  style={{ color: daysOpen > 30 ? "var(--gl-olive)" : "var(--gl-ink)" }}
                >
                  {daysOpen}d
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
