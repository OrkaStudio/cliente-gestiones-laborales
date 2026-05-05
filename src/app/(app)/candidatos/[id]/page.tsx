import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone, BookOpen, Clock, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CVProcesadoEditor } from "@/components/app/cv-procesado-editor";
import { PreguntasSugeridas } from "@/components/app/preguntas-sugeridas";
import { CandidatoSheet } from "@/components/app/candidato-sheet";
import { AsignarBusquedaDialog } from "@/components/app/asignar-busqueda-dialog";

const STAGES = [
  { key: "preseleccionado",    label: "Preseleccionado" },
  { key: "entrevista_orka",    label: "Entrevista Orka" },
  { key: "presentado_cliente", label: "Presentado" },
  { key: "entrevista_cliente", label: "2ª Entrevista" },
  { key: "ofertado",           label: "Ofertado" },
  { key: "contratado",         label: "Contratado" },
];

function diasDesde(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function calcYearsExp(exp: Array<{ desde: string; hasta: string | null }>) {
  if (!exp?.length) return 0;
  const years = exp.map((e) => parseInt(e.desde?.substring(0, 4)) || new Date().getFullYear());
  return new Date().getFullYear() - Math.min(...years);
}

function calcCompleteness(c: Record<string, unknown>, exp: unknown[]) {
  const checks = [
    !!c.email,
    !!c.telefono,
    !!c.educacion,
    !!c.disponibilidad,
    !!c.fecha_nacimiento,
    !!c.pretension_salarial,
    Array.isArray(c.idiomas) && (c.idiomas as unknown[]).length > 0,
    !!c.notas_recruiter,
    exp?.length > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export default async function CandidatoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: candidato }, { data: experiencia }, { data: gestionesData }, { data: busquedasActivas }] =
    await Promise.all([
      supabase.from("candidatos").select("*").eq("id", id).single(),
      supabase.from("experiencia_laboral").select("*").eq("candidato_id", id).order("orden"),
      supabase.from("gestiones").select("*, busquedas(id, puesto, cliente)").eq("candidato_id", id),
      supabase.from("busquedas").select("id, puesto, cliente, ubicacion, fecha_apertura, estado").eq("estado", "activa").order("fecha_apertura", { ascending: false }),
    ]);

  if (!candidato) notFound();

  const yearsExp       = calcYearsExp(experiencia ?? []);
  const completeness   = calcCompleteness(candidato, experiencia ?? []);
  const inBaseSince    = candidato.fecha_ingreso?.substring(0, 7) ?? "—";
  const gestionesActivas = gestionesData?.filter(
    (g) => g.estado !== "contratado" && g.estado !== "descartado"
  ).length ?? 0;

  const missingFields = [
    !candidato.email           && "email",
    !candidato.telefono        && "teléfono",
    !candidato.educacion       && "educación",
    !candidato.disponibilidad  && "disponibilidad",
    !candidato.pretension_salarial && "pretensión",
  ].filter(Boolean) as string[];

  return (
    <div className="px-10 py-12">
      <Link
        href="/candidatos"
        className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-[var(--agro-ink-soft)] hover:text-[var(--agro-ink)] mb-10 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Candidatos
      </Link>

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="pb-8 border-b agro-rule">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="h-16 w-16 shrink-0 rounded-full grid place-items-center border agro-rule font-display text-xl">
              {candidato.nombre[0]}{candidato.apellido[0]}
            </div>
            <div>
              <h1 className="font-display text-4xl leading-tight">
                {candidato.nombre} {candidato.apellido}
              </h1>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {candidato.ultimo_puesto && (
                  <span className="text-sm text-[var(--agro-ink-soft)] italic">
                    {candidato.ultimo_puesto}
                  </span>
                )}
                {candidato.ubicacion && (
                  <>
                    <span className="text-[var(--agro-ink-soft)] opacity-40">·</span>
                    <span className="flex items-center gap-1 text-sm text-[var(--agro-ink-soft)]">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {candidato.ubicacion}
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <span
                  className={`text-[10px] uppercase tracking-[0.2em] ${
                    candidato.estado === "activo"
                      ? "text-[var(--agro-olive)]"
                      : "text-[var(--agro-ink-soft)]"
                  }`}
                >
                  {candidato.estado}
                </span>
                {candidato.idiomas?.map((lang: string) => (
                  <span
                    key={lang}
                    className="text-[10px] uppercase tracking-[0.2em] text-[var(--agro-ink-soft)] border agro-rule px-2 py-0.5 rounded-full"
                  >
                    {lang}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex gap-2 shrink-0">
            <CandidatoSheet candidato={candidato} />
            <AsignarBusquedaDialog
              candidatoId={candidato.id}
              candidatoNombre={`${candidato.nombre} ${candidato.apellido}`}
              busquedas={busquedasActivas ?? []}
              gestionesExistentes={(gestionesData ?? [])
                .map((g) => (g.busquedas as { id: string } | null)?.id ?? "")
                .filter(Boolean)}
            />
          </div>
        </div>

        {/* Completeness bar */}
        <div className="mt-6 space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--agro-ink-soft)] shrink-0 w-16">
              Perfil
            </span>
            <div className="flex-1 h-px bg-[var(--agro-rule)] relative overflow-visible">
              <div
                className="absolute top-0 left-0 h-px bg-[var(--agro-olive)] transition-all"
                style={{ width: `${completeness}%` }}
              />
            </div>
            <span className="font-mono text-[11px] tabular-nums text-[var(--agro-ink-soft)] shrink-0">
              {completeness}%
            </span>
          </div>
          {missingFields.length > 0 && (
            <p className="text-[11px] text-[var(--agro-ink-soft)] pl-[4.75rem]">
              Falta: {missingFields.join(", ")}
            </p>
          )}
        </div>
      </header>

      {/* ── Quick stats ─────────────────────────────────────────── */}
      <section
        style={{
          display: "flex",
          gap: "clamp(2rem, 5vw, 4rem)",
          borderBottom: "1px solid var(--agro-rule)",
          flexWrap: "wrap",
          paddingBottom: "0.25rem",
        }}
      >
        <QuickStat label="Años exp."        value={yearsExp > 0 ? `${yearsExp}` : "—"} />
        <QuickStat label="Empleadores"      value={`${experiencia?.length ?? 0}`} />
        <QuickStat label="En base desde"    value={inBaseSince} />
        <QuickStat
          label="Gestiones activas"
          value={`${gestionesActivas}`}
          accent={gestionesActivas > 0}
        />
      </section>

      {/* ── Content grid ────────────────────────────────────────── */}
      <div className="grid gap-16 lg:grid-cols-3 mt-12">

        {/* ── Izquierda: gestiones + trayectoria + notas ── */}
        <div className="lg:col-span-2 space-y-14">

          {/* Gestiones */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--agro-ink-soft)]">
                Gestiones · {gestionesData?.length ?? 0}
              </div>
            </div>

            {!gestionesData?.length ? (
              <div className="py-10 text-center border-t agro-rule">
                <p className="text-sm text-[var(--agro-ink-soft)]">
                  Sin gestiones — asigná este candidato a una búsqueda activa.
                </p>
              </div>
            ) : (
              <div className="space-y-px">
                {gestionesData.map((g) => {
                  const stageIdx   = STAGES.findIndex((s) => s.key === g.estado);
                  const isDescartado = g.estado === "descartado";
                  const dias       = diasDesde(g.updated_at);
                  const busq       = g.busquedas as { id: string; puesto: string; cliente: string } | null;

                  return (
                    <Link
                      key={g.id}
                      href={busq ? `/busquedas/${busq.id}` : "#"}
                      className={`group block border-t agro-rule py-5 ${isDescartado ? "opacity-40" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="font-display text-xl group-hover:text-[var(--agro-olive)] transition-colors leading-tight">
                            {busq?.puesto ?? "—"}
                          </div>
                          <div className="text-sm text-[var(--agro-ink-soft)] italic mt-1">
                            {busq?.cliente}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div
                            className={`text-[10px] uppercase tracking-[0.15em] ${
                              isDescartado
                                ? "line-through text-[var(--agro-ink-soft)]"
                                : g.estado === "contratado"
                                  ? "text-[var(--agro-olive)]"
                                  : "text-[var(--agro-ink-soft)]"
                            }`}
                          >
                            {STAGES.find((s) => s.key === g.estado)?.label ?? g.estado}
                          </div>
                          <div className="flex items-center gap-1 justify-end mt-1.5">
                            <Clock className="h-2.5 w-2.5 text-[var(--agro-ink-soft)] opacity-50" />
                            <span className="font-mono text-[11px] tabular-nums text-[var(--agro-ink-soft)]">
                              {dias}d
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Stage track */}
                      {!isDescartado && stageIdx >= 0 && (
                        <div className="flex items-center gap-0.5 mt-4">
                          {STAGES.map((stage, i) => (
                            <div key={stage.key} className="flex items-center gap-0.5">
                              <div
                                className={`rounded-full transition-all ${
                                  i < stageIdx
                                    ? "h-1.5 w-1.5 bg-[var(--agro-olive-soft)]"
                                    : i === stageIdx
                                      ? "h-2.5 w-2.5 bg-[var(--agro-olive)]"
                                      : "h-1.5 w-1.5 bg-[var(--agro-rule)]"
                                }`}
                              />
                              {i < STAGES.length - 1 && (
                                <div
                                  className={`h-px w-5 ${
                                    i < stageIdx
                                      ? "bg-[var(--agro-olive-soft)]"
                                      : "bg-[var(--agro-rule)]"
                                  }`}
                                />
                              )}
                            </div>
                          ))}
                          <span className="ml-3 text-[10px] uppercase tracking-[0.15em] text-[var(--agro-ink-soft)]">
                            {stageIdx + 1} / {STAGES.length}
                          </span>
                        </div>
                      )}
                    </Link>
                  );
                })}
                <div className="border-t agro-rule" />
              </div>
            )}
          </section>

          {/* Trayectoria */}
          {experiencia && experiencia.length > 0 ? (
            <section>
              <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--agro-ink-soft)] mb-6">
                Trayectoria
              </div>
              <div className="relative">
                <div className="absolute left-[4px] top-3 bottom-3 w-px bg-[var(--agro-rule)]" />
                <div className="space-y-px">
                  {experiencia.map((exp, i) => (
                    <div key={exp.id} className="relative pl-8 py-5 border-t agro-rule">
                      <div
                        className={`absolute left-0 top-[26px] h-2.5 w-2.5 rounded-full border z-10 ${
                          i === 0
                            ? "bg-[var(--agro-olive)] border-[var(--agro-olive)]"
                            : "bg-[var(--agro-paper)] border-[var(--agro-rule)]"
                        }`}
                      />
                      <div className="flex items-baseline justify-between gap-3">
                        <h3 className="font-display text-lg">{exp.rol}</h3>
                        <span className="font-mono text-[11px] tabular-nums text-[var(--agro-ink-soft)] shrink-0">
                          {exp.desde} — {exp.hasta ?? "actual"}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--agro-olive)] mt-1 italic">{exp.empresa}</p>
                      {exp.descripcion && (
                        <p className="text-sm text-[var(--agro-ink-soft)] leading-relaxed mt-2">
                          {exp.descripcion}
                        </p>
                      )}
                    </div>
                  ))}
                  <div className="border-t agro-rule" />
                </div>
              </div>
            </section>
          ) : null}

          {/* Notas del recruiter */}
          {candidato.notas_recruiter && (
            <section>
              <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--agro-ink-soft)] mb-4">
                Notas del recruiter
              </div>
              <p className="text-sm leading-relaxed text-[var(--agro-ink-soft)] border-l-2 border-[var(--agro-olive)] pl-4">
                {candidato.notas_recruiter}
              </p>
            </section>
          )}
        </div>

        {/* ── Derecha: contacto + perfil ── */}
        <div className="space-y-10">

          {/* Contacto */}
          {(candidato.email || candidato.telefono) && (
            <section>
              <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--agro-ink-soft)] mb-4">
                Contacto
              </div>
              <div className="space-y-px">
                {candidato.email && (
                  <div className="flex items-center gap-3 py-3 border-b agro-rule">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-[var(--agro-ink-soft)]" />
                    <a
                      href={`mailto:${candidato.email}`}
                      className="text-sm hover:text-[var(--agro-olive)] transition-colors truncate"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {candidato.email}
                    </a>
                  </div>
                )}
                {candidato.telefono && (
                  <div className="flex items-center gap-3 py-3 border-b agro-rule">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-[var(--agro-ink-soft)]" />
                    <a
                      href={`tel:${candidato.telefono}`}
                      className="text-sm font-mono hover:text-[var(--agro-olive)] transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {candidato.telefono}
                    </a>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Perfil */}
          {(candidato.educacion || candidato.disponibilidad || candidato.fecha_nacimiento || candidato.pretension_salarial) && (
            <section>
              <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--agro-ink-soft)] mb-4">
                Perfil
              </div>
              <div className="space-y-px">
                {candidato.pretension_salarial && (
                  <div className="flex items-baseline justify-between gap-3 py-2.5 border-b agro-rule">
                    <span className="text-[11px] uppercase tracking-[0.15em] text-[var(--agro-ink-soft)] shrink-0">
                      Pretensión
                    </span>
                    <span className="text-sm font-medium text-right text-[var(--agro-olive)]">
                      {candidato.pretension_salarial}
                    </span>
                  </div>
                )}
                {candidato.disponibilidad && (
                  <div className="flex items-baseline justify-between gap-3 py-2.5 border-b agro-rule">
                    <span className="text-[11px] uppercase tracking-[0.15em] text-[var(--agro-ink-soft)] shrink-0">
                      Disponib.
                    </span>
                    <span className="text-sm text-right">{candidato.disponibilidad}</span>
                  </div>
                )}
                {candidato.educacion && (
                  <div className="py-2.5 border-b agro-rule">
                    <div className="flex items-center gap-2 mb-1">
                      <BookOpen className="h-3 w-3 text-[var(--agro-ink-soft)]" />
                      <span className="text-[11px] uppercase tracking-[0.15em] text-[var(--agro-ink-soft)]">
                        Educación
                      </span>
                    </div>
                    <p className="text-sm leading-snug pl-5">{candidato.educacion}</p>
                  </div>
                )}
                {candidato.fecha_nacimiento && (
                  <div className="flex items-baseline justify-between gap-3 py-2.5 border-b agro-rule">
                    <span className="text-[11px] uppercase tracking-[0.15em] text-[var(--agro-ink-soft)] shrink-0">
                      Nacimiento
                    </span>
                    <span className="font-mono text-sm text-right">{candidato.fecha_nacimiento}</span>
                  </div>
                )}
              </div>
            </section>
          )}

        </div>
      </div>

      {/* CV Procesado GL — editable */}
      <section className="mt-16 pt-12 border-t agro-rule">
        <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--agro-ink-soft)] mb-6">
          CV Procesado GL
        </div>
        <CVProcesadoEditor
          candidatoId={candidato.id}
          initialTexto={(candidato as { cv_procesado_texto?: string | null }).cv_procesado_texto ?? null}
        />
      </section>

      {/* Preguntas sugeridas */}
      <section className="mt-12 pt-12 border-t agro-rule">
        <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--agro-ink-soft)] mb-6">
          Preguntas sugeridas para la entrevista
        </div>
        <PreguntasSugeridas
          preguntas={(candidato as { preguntas_sugeridas?: string[] }).preguntas_sugeridas ?? []}
        />
      </section>
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
    <div style={{ paddingTop: "1.5rem", paddingBottom: "1.5rem" }}>
      <div
        className="font-display tabular-nums leading-none"
        style={{
          fontSize: "clamp(2rem, 3.5vw, 2.5rem)",
          letterSpacing: "-0.03em",
          color: accent ? "var(--agro-olive)" : "var(--agro-ink)",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: "10px",
          fontWeight: 600,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--agro-ink-soft)",
          marginTop: "0.375rem",
        }}
      >
        {label}
      </div>
    </div>
  );
}
