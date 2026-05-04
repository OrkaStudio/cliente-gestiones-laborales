import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BusquedaSheet } from "@/components/app/busqueda-sheet";
import { SumarCandidatoDialog } from "@/components/app/sumar-candidato-dialog";

const STAGES = [
  { key: "preseleccionado",    label: "Preseleccionado" },
  { key: "entrevista_orka",    label: "Entrevista Orka" },
  { key: "presentado_cliente", label: "Presentado" },
  { key: "entrevista_cliente", label: "2ª Entrevista" },
  { key: "ofertado",           label: "Ofertado" },
  { key: "contratado",         label: "Contratado" },
];

function calcDaysOpen(fecha: string) {
  if (!fecha) return 0;
  return Math.floor((Date.now() - new Date(fecha).getTime()) / 86_400_000);
}

export default async function BusquedaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: busqueda }, { data: gestionesData }, { data: candidatosActivos }] = await Promise.all([
    supabase.from("busquedas").select("*").eq("id", id).single(),
    supabase
      .from("gestiones")
      .select("*, candidatos(id, nombre, apellido, ultimo_puesto)")
      .eq("busqueda_id", id),
    supabase
      .from("candidatos")
      .select("id, nombre, apellido, ultimo_puesto, ubicacion, estado")
      .eq("estado", "activo")
      .order("apellido"),
  ]);

  if (!busqueda) notFound();

  const daysOpen = calcDaysOpen(busqueda.fecha_apertura);
  const descartados = gestionesData?.filter((g) => g.estado === "descartado").length ?? 0;
  const activos = (gestionesData?.length ?? 0) - descartados;

  // Funnel: solo los stages con candidatos, excluye descartados
  const funnel = STAGES.map((s) => ({
    ...s,
    count: gestionesData?.filter((g) => g.estado === s.key).length ?? 0,
  })).filter((s) => s.count > 0);

  const maxCount = Math.max(...funnel.map((s) => s.count), 1);

  return (
    <div className="px-12 py-14 max-w-5xl">
      <Link
        href="/busquedas"
        className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-[var(--agro-ink-soft)] hover:text-[var(--agro-ink)] mb-10 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Búsquedas
      </Link>

      {/* Header */}
      <header className="pb-10 border-b agro-rule">
        <div className="flex items-start justify-between gap-6">
          <div>
            <span
              className={`text-[10px] uppercase tracking-[0.2em] ${
                busqueda.estado === "activa"
                  ? "text-[var(--agro-olive)]"
                  : "text-[var(--agro-ink-soft)]"
              }`}
            >
              {busqueda.estado}
            </span>
            <h1 className="font-display text-4xl mt-2 leading-tight">{busqueda.puesto}</h1>
            <p className="text-sm text-[var(--agro-ink-soft)] mt-2 italic">
              {busqueda.cliente}
              {busqueda.ubicacion ? ` · ${busqueda.ubicacion}` : ""}
              {` · abierta ${busqueda.fecha_apertura}`}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <BusquedaSheet busqueda={busqueda} />
            <SumarCandidatoDialog
              busquedaId={busqueda.id}
              busquedaPuesto={busqueda.puesto}
              candidatos={candidatosActivos ?? []}
              gestionesExistentes={(gestionesData ?? []).map((g) => (g.candidatos as { id: string } | null)?.id ?? "").filter(Boolean)}
            />
          </div>
        </div>
      </header>

      {/* Quick stats */}
      <section className="grid grid-cols-4 border-b agro-rule">
        <QuickStat label="Días abierta" value={`${daysOpen}`} accent />
        <QuickStat label="En gestión"   value={`${activos}`} />
        <QuickStat label="Requisitos"   value={`${busqueda.requisitos?.length ?? 0}`} />
        <QuickStat label="Descartados"  value={`${descartados}`} />
      </section>

      {/* Main grid */}
      <div className="grid gap-16 lg:grid-cols-3 mt-12">
        {/* Left — pipeline + candidatos */}
        <div className="lg:col-span-2 space-y-12">

          {/* Pipeline funnel */}
          {funnel.length > 0 ? (
            <section>
              <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--agro-ink-soft)] mb-4">
                Pipeline
              </div>
              <div className="space-y-px">
                {funnel.map((stage) => (
                  <div
                    key={stage.key}
                    className="flex items-center gap-4 py-3 border-t agro-rule"
                  >
                    <span className="text-[11px] uppercase tracking-[0.15em] text-[var(--agro-ink-soft)] w-36 shrink-0">
                      {stage.label}
                    </span>
                    <div className="flex-1 h-1 bg-[var(--agro-rule)] overflow-hidden">
                      <div
                        className="h-full bg-[var(--agro-olive)] transition-all"
                        style={{ width: `${(stage.count / maxCount) * 100}%` }}
                      />
                    </div>
                    <span className="font-display text-xl tabular-nums text-[var(--agro-olive)] w-5 text-right">
                      {stage.count}
                    </span>
                  </div>
                ))}
                <div className="border-t agro-rule" />
              </div>
            </section>
          ) : null}

          {/* Candidatos */}
          <section>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--agro-ink-soft)] mb-4">
              Candidatos · {gestionesData?.length ?? 0}
            </div>
            <div className="space-y-px">
              {gestionesData?.map(({ id: gId, candidatos: cand, estado, updated_at }) => {
                const stageIdx = STAGES.findIndex((s) => s.key === estado);
                const isDescartado = estado === "descartado";
                return (
                  <div
                    key={gId}
                    className={`flex items-center justify-between gap-6 py-4 border-t agro-rule ${
                      isDescartado ? "opacity-40" : ""
                    }`}
                  >
                    {cand ? (
                      <Link
                        href={`/candidatos/${cand.id}`}
                        className="flex items-start gap-4 flex-1 min-w-0 hover:text-[var(--agro-olive)] transition-colors group"
                      >
                        <div className="h-9 w-9 shrink-0 rounded-full grid place-items-center border agro-rule font-display text-sm mt-0.5">
                          {cand.nombre[0]}{cand.apellido[0]}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm group-hover:text-[var(--agro-olive)] transition-colors">
                            {cand.nombre} {cand.apellido}
                          </div>
                          <div className="text-xs text-[var(--agro-ink-soft)] italic mt-0.5 truncate">
                            {cand.ultimo_puesto}
                          </div>
                          {/* Stage track */}
                          {!isDescartado && stageIdx >= 0 ? (
                            <div className="flex items-center gap-0.5 mt-2">
                              {STAGES.map((stage, i) => (
                                <div key={stage.key} className="flex items-center gap-0.5">
                                  <div
                                    className={`rounded-full ${
                                      i < stageIdx
                                        ? "h-1 w-1 bg-[var(--agro-olive-soft)]"
                                        : i === stageIdx
                                          ? "h-1.5 w-1.5 bg-[var(--agro-olive)]"
                                          : "h-1 w-1 bg-[var(--agro-rule)]"
                                    }`}
                                  />
                                  {i < STAGES.length - 1 && (
                                    <div
                                      className={`h-px w-2.5 ${
                                        i < stageIdx
                                          ? "bg-[var(--agro-olive-soft)]"
                                          : "bg-[var(--agro-rule)]"
                                      }`}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </Link>
                    ) : (
                      <span className="text-[var(--agro-ink-soft)]">—</span>
                    )}

                    <div className="text-right shrink-0">
                      <div
                        className={`text-[10px] uppercase tracking-[0.18em] ${
                          isDescartado
                            ? "text-[var(--agro-ink-soft)] line-through"
                            : estado === "contratado"
                              ? "text-[var(--agro-olive)]"
                              : "text-[var(--agro-ink-soft)]"
                        }`}
                      >
                        {STAGES.find((s) => s.key === estado)?.label ?? estado}
                      </div>
                      <div className="font-mono text-[11px] tabular-nums text-[var(--agro-ink-soft)] mt-1">
                        {updated_at.slice(0, 10)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="border-t agro-rule" />
            </div>
          </section>
        </div>

        {/* Right — brief, requisitos, datos */}
        <div className="space-y-10">
          {busqueda.descripcion ? (
            <section>
              <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--agro-ink-soft)] mb-4">
                Brief
              </div>
              <p className="text-sm leading-relaxed text-[var(--agro-ink-soft)]">
                {busqueda.descripcion}
              </p>
            </section>
          ) : null}

          {busqueda.requisitos?.length > 0 ? (
            <section>
              <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--agro-ink-soft)] mb-4">
                Requisitos · {busqueda.requisitos.length}
              </div>
              <div className="space-y-px">
                {busqueda.requisitos.map((r: string, i: number) => (
                  <div key={r} className="flex items-baseline gap-3 py-2.5 border-t agro-rule">
                    <span className="font-mono text-[10px] tabular-nums text-[var(--agro-rule)] w-4 shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-sm">{r}</span>
                  </div>
                ))}
                <div className="border-t agro-rule" />
              </div>
            </section>
          ) : null}

          <section>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--agro-ink-soft)] mb-4">
              Datos
            </div>
            <div className="space-y-px">
              {busqueda.rango_salarial ? (
                <div className="flex items-baseline justify-between gap-3 py-2.5 border-b agro-rule">
                  <span className="text-[11px] uppercase tracking-[0.15em] text-[var(--agro-ink-soft)]">
                    Rango
                  </span>
                  <span className="text-sm">{busqueda.rango_salarial}</span>
                </div>
              ) : null}
              <div className="flex items-baseline justify-between gap-3 py-2.5 border-b agro-rule">
                <span className="text-[11px] uppercase tracking-[0.15em] text-[var(--agro-ink-soft)]">
                  Apertura
                </span>
                <span className="font-mono text-sm tabular-nums">{busqueda.fecha_apertura}</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function QuickStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="border-r agro-rule last:border-r-0 px-5 py-5 first:pl-0">
      <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--agro-ink-soft)]">
        {label}
      </div>
      <div
        className={`font-display text-3xl tabular-nums mt-1.5 leading-none ${
          accent ? "text-[var(--agro-olive)]" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
