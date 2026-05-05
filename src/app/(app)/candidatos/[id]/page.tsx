import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, MessageCircle, BookOpen, MapPin, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CVProcesadoEditor } from "@/components/app/cv-procesado-editor";
import { PreguntasSugeridas } from "@/components/app/preguntas-sugeridas";
import { CandidatoSheet } from "@/components/app/candidato-sheet";
import { AsignarBusquedaDialog } from "@/components/app/asignar-busqueda-dialog";

const AVATAR_HEX = [
  { bg: "#dafbe1", color: "#1a7f37" },
  { bg: "#ddf4ff", color: "#0550ae" },
  { bg: "#ffd8eb", color: "#99286e" },
  { bg: "#fff8c5", color: "#7d4e00" },
  { bg: "#eddeff", color: "#6e40c9" },
];

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

function calcAge(fechaNac: string): number | null {
  if (!fechaNac) return null;
  const birth = new Date(fechaNac);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function calcYearsExp(exp: Array<{ desde: string }>) {
  if (!exp?.length) return null;
  const years = exp.map((e) => parseInt(e.desde?.substring(0, 4)) || new Date().getFullYear());
  return new Date().getFullYear() - Math.min(...years);
}

function calcCompleteness(c: Record<string, unknown>, exp: unknown[]) {
  const checks = [
    !!c.email, !!c.telefono, !!c.educacion, !!c.disponibilidad,
    !!c.fecha_nacimiento, !!c.pretension_salarial,
    Array.isArray(c.idiomas) && (c.idiomas as unknown[]).length > 0,
    !!c.notas_recruiter, exp?.length > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

// Convierte número argentino a URL de WhatsApp
function waUrl(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("54")) return `https://wa.me/${digits}`;
  if (digits.startsWith("0"))  return `https://wa.me/54${digits.slice(1)}`;
  return `https://wa.me/54${digits}`;
}

const CARD = {
  background: "#ffffff",
  borderColor: "var(--gl-border)",
  boxShadow: "0 2px 8px rgba(13,17,23,0.05)",
} as const;

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

  const yearsExp         = calcYearsExp(experiencia ?? []);
  const completeness     = calcCompleteness(candidato, experiencia ?? []);
  const inBaseSince      = candidato.fecha_ingreso?.substring(0, 7) ?? "—";
  const edad             = candidato.fecha_nacimiento ? calcAge(candidato.fecha_nacimiento) : null;
  const gestionesActivas = gestionesData?.filter(
    (g) => g.estado !== "contratado" && g.estado !== "descartado"
  ).length ?? 0;

  const avatarPal = AVATAR_HEX[
    (candidato.nombre.charCodeAt(0) + candidato.apellido.charCodeAt(0)) % AVATAR_HEX.length
  ];

  const estadoBadge = candidato.estado === "activo"
    ? { bg: "#dafbe1", color: "#1a7f37" }
    : { bg: "#f6f8fa", color: "#57606a" };

  // Stats que van en el header (sólo los que tienen valor)
  const headerStats = [
    { label: "En base desde",    value: inBaseSince },
    yearsExp != null && { label: "Años de exp.",     value: `${yearsExp}` },
    { label: "Empleadores",      value: `${experiencia?.length ?? 0}` },
    { label: "Gestiones activas", value: `${gestionesActivas}`, accent: gestionesActivas > 0 },
  ].filter(Boolean) as { label: string; value: string; accent?: boolean }[];

  return (
    <div className="px-10 py-10 space-y-5">

      {/* Back */}
      <Link
        href="/candidatos"
        className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
        style={{ color: "var(--gl-ink-3)" }}
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Candidatos
      </Link>

      {/* ── Header card ──────────────────────────────────────────── */}
      <div className="rounded-2xl border p-6" style={CARD}>
        <div className="flex items-start justify-between gap-6">

          {/* Avatar + info */}
          <div className="flex items-start gap-5">
            <div
              className="h-16 w-16 rounded-full grid place-items-center text-xl font-bold shrink-0"
              style={{ background: avatarPal.bg, color: avatarPal.color }}
            >
              {candidato.nombre[0]}{candidato.apellido[0]}
            </div>
            <div>
              <h1
                className="font-display leading-tight"
                style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", color: "var(--gl-ink)" }}
              >
                {candidato.nombre} {candidato.apellido}
              </h1>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                {candidato.ultimo_puesto && (
                  <span className="text-sm" style={{ color: "var(--gl-ink-3)" }}>
                    {candidato.ultimo_puesto}
                  </span>
                )}
                {candidato.ubicacion && (
                  <>
                    <span style={{ color: "var(--gl-border)" }}>·</span>
                    <span className="flex items-center gap-1 text-sm" style={{ color: "var(--gl-ink-3)" }}>
                      <MapPin className="h-3 w-3 shrink-0" />
                      {candidato.ubicacion}
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span
                  className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                  style={{ background: estadoBadge.bg, color: estadoBadge.color }}
                >
                  {candidato.estado}
                </span>
                {candidato.idiomas?.map((lang: string) => (
                  <span
                    key={lang}
                    className="text-[11px] font-medium px-2.5 py-0.5 rounded-full"
                    style={{ background: "var(--gl-olive-bg)", color: "var(--gl-olive)" }}
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

        {/* Stats strip + completeness */}
        <div className="mt-6 pt-5 space-y-4" style={{ borderTop: "1px solid var(--gl-border)" }}>

          {/* Stats en fila */}
          <div className="flex items-center gap-6 flex-wrap">
            {headerStats.map((s, i) => (
              <div key={i} className="flex flex-col gap-0.5">
                <span className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: "var(--gl-ink-3)" }}>
                  {s.label}
                </span>
                <span
                  className="text-[15px] font-bold tabular-nums"
                  style={{ color: s.accent ? "var(--gl-olive)" : "var(--gl-ink)" }}
                >
                  {s.value}
                </span>
              </div>
            ))}
          </div>

          {/* Completeness bar */}
          <div className="flex items-center gap-3">
            <span className="text-[10.5px] font-semibold uppercase tracking-wide shrink-0 w-28" style={{ color: "var(--gl-ink-3)" }}>
              Perfil completo
            </span>
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--gl-border)" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${completeness}%`, background: "var(--gl-olive)" }}
              />
            </div>
            <span className="text-xs font-bold tabular-nums shrink-0" style={{ color: "var(--gl-olive)" }}>
              {completeness}%
            </span>
          </div>
        </div>
      </div>

      {/* ── Main grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Izquierda: gestiones + trayectoria + notas ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Gestiones */}
          <div className="rounded-2xl border p-6" style={CARD}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-[15px] font-bold" style={{ color: "var(--gl-ink)" }}>Gestiones</h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--gl-ink-3)" }}>
                  Búsquedas en las que participa
                </p>
              </div>
              {(gestionesData?.length ?? 0) > 0 && (
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: "var(--gl-olive-bg)", color: "var(--gl-olive)" }}
                >
                  {gestionesData!.length} total
                </span>
              )}
            </div>

            {!gestionesData?.length ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <TrendingUp className="h-8 w-8 mb-3" style={{ color: "var(--gl-olive)", opacity: 0.3 }} />
                <p className="text-sm font-medium" style={{ color: "var(--gl-ink)" }}>Sin gestiones</p>
                <p className="text-xs mt-1" style={{ color: "var(--gl-ink-3)" }}>
                  Asigná este candidato a una búsqueda activa.
                </p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {gestionesData.map((g) => {
                  const stageIdx     = STAGES.findIndex((s) => s.key === g.estado);
                  const isDescartado = g.estado === "descartado";
                  const dias         = diasDesde(g.updated_at);
                  const busq         = g.busquedas as { id: string; puesto: string; cliente: string } | null;

                  return (
                    <Link
                      key={g.id}
                      href={busq ? `/busquedas/${busq.id}` : "#"}
                      className="gl-row flex items-center justify-between gap-4 px-3 py-4"
                      style={{ opacity: isDescartado ? 0.4 : 1 }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-[13.5px] font-semibold truncate" style={{ color: "var(--gl-ink)" }}>
                          {busq?.puesto ?? "—"}
                        </div>
                        <div className="text-xs mt-0.5 truncate" style={{ color: "var(--gl-ink-3)" }}>
                          {busq?.cliente}
                        </div>

                        {/* Stage track */}
                        {!isDescartado && stageIdx >= 0 && (
                          <div className="flex items-center gap-0.5 mt-2.5">
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
                                    height: 1, width: 14,
                                    background: i < stageIdx ? "var(--gl-olive)" : "var(--gl-border)",
                                    opacity: i < stageIdx ? 0.35 : 1,
                                  }} />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0 space-y-1.5">
                        <span
                          className="text-[10.5px] font-semibold px-2 py-0.5 rounded-md block whitespace-nowrap"
                          style={{
                            background: isDescartado ? "#f6f8fa" : "var(--gl-olive-bg)",
                            color:      isDescartado ? "var(--gl-ink-3)" : "var(--gl-olive)",
                            textDecoration: isDescartado ? "line-through" : "none",
                          }}
                        >
                          {STAGES.find((s) => s.key === g.estado)?.label ?? g.estado}
                        </span>
                        <div className="text-[11px] tabular-nums font-mono" style={{ color: "var(--gl-ink-3)" }}>
                          {dias}d sin cambio
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Trayectoria */}
          {experiencia && experiencia.length > 0 && (
            <div className="rounded-2xl border p-6" style={CARD}>
              <h2 className="text-[15px] font-bold mb-5" style={{ color: "var(--gl-ink)" }}>Trayectoria</h2>
              <div className="space-y-0.5">
                {experiencia.map((exp, i) => (
                  <div
                    key={exp.id}
                    className="flex gap-4 py-4"
                    style={{ borderTop: "1px solid var(--gl-border)" }}
                  >
                    <div className="flex flex-col items-center pt-1.5 shrink-0">
                      <div
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{
                          background: i === 0 ? "var(--gl-olive)" : "var(--gl-border)",
                        }}
                      />
                      {i < experiencia.length - 1 && (
                        <div className="flex-1 w-px mt-2" style={{ background: "var(--gl-border)", minHeight: "1.5rem" }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pb-2">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[14px] font-bold" style={{ color: "var(--gl-ink)" }}>
                          {exp.rol}
                        </span>
                        <span className="text-xs font-mono tabular-nums shrink-0" style={{ color: "var(--gl-ink-3)" }}>
                          {exp.desde} — {exp.hasta ?? "actual"}
                        </span>
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
                ))}
              </div>
            </div>
          )}

          {/* Notas del recruiter */}
          {candidato.notas_recruiter && (
            <div className="rounded-2xl border p-6" style={CARD}>
              <h2 className="text-[15px] font-bold mb-4" style={{ color: "var(--gl-ink)" }}>
                Notas internas
              </h2>
              <p
                className="text-sm leading-relaxed pl-4"
                style={{ color: "var(--gl-ink-3)", borderLeft: "3px solid var(--gl-olive)" }}
              >
                {candidato.notas_recruiter}
              </p>
            </div>
          )}
        </div>

        {/* ── Derecha: contacto + perfil ── */}
        <div className="space-y-5">

          {/* Contacto */}
          {(candidato.email || candidato.telefono) && (
            <div className="rounded-2xl border p-6" style={CARD}>
              <h2 className="text-[15px] font-bold mb-4" style={{ color: "var(--gl-ink)" }}>Contacto</h2>
              <div className="space-y-2">
                {candidato.email && (
                  <a
                    href={`mailto:${candidato.email}`}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl"
                    style={{ background: "var(--gl-surface)", border: "1px solid var(--gl-border)" }}
                  >
                    <div className="h-8 w-8 rounded-lg grid place-items-center shrink-0" style={{ background: "#ddf4ff" }}>
                      <Mail className="h-3.5 w-3.5" style={{ color: "#0550ae" }} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: "var(--gl-ink-3)" }}>
                        Email
                      </div>
                      <div className="text-sm truncate mt-0.5" style={{ color: "var(--gl-ink)" }}>
                        {candidato.email}
                      </div>
                    </div>
                  </a>
                )}
                {candidato.telefono && (
                  <a
                    href={waUrl(candidato.telefono)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-3 py-3 rounded-xl"
                    style={{ background: "var(--gl-surface)", border: "1px solid var(--gl-border)" }}
                  >
                    <div className="h-8 w-8 rounded-lg grid place-items-center shrink-0" style={{ background: "#dafbe1" }}>
                      <MessageCircle className="h-3.5 w-3.5" style={{ color: "#1a7f37" }} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: "var(--gl-ink-3)" }}>
                        WhatsApp
                      </div>
                      <div className="text-sm font-mono mt-0.5" style={{ color: "var(--gl-ink)" }}>
                        {candidato.telefono}
                      </div>
                    </div>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Perfil */}
          {(candidato.pretension_salarial || candidato.disponibilidad || candidato.educacion || candidato.fecha_nacimiento) && (
            <div className="rounded-2xl border p-6" style={CARD}>
              <h2 className="text-[15px] font-bold mb-4" style={{ color: "var(--gl-ink)" }}>Perfil</h2>
              <div className="space-y-0.5">
                {candidato.pretension_salarial && (
                  <div className="flex items-center justify-between gap-3 py-3" style={{ borderBottom: "1px solid var(--gl-border)" }}>
                    <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--gl-ink-3)" }}>
                      Pretensión
                    </span>
                    <span className="text-sm font-bold" style={{ color: "var(--gl-olive)" }}>
                      {candidato.pretension_salarial}
                    </span>
                  </div>
                )}
                {candidato.disponibilidad && (
                  <div className="flex items-center justify-between gap-3 py-3" style={{ borderBottom: "1px solid var(--gl-border)" }}>
                    <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--gl-ink-3)" }}>
                      Disponib.
                    </span>
                    <span className="text-sm text-right" style={{ color: "var(--gl-ink)" }}>
                      {candidato.disponibilidad}
                    </span>
                  </div>
                )}
                {candidato.fecha_nacimiento && edad != null && (
                  <div className="flex items-center justify-between gap-3 py-3" style={{ borderBottom: "1px solid var(--gl-border)" }}>
                    <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--gl-ink-3)" }}>
                      Edad
                    </span>
                    <span className="text-sm font-semibold" style={{ color: "var(--gl-ink)" }}>
                      {edad} años
                    </span>
                  </div>
                )}
                {candidato.educacion && (
                  <div className="py-3">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <BookOpen className="h-3.5 w-3.5" style={{ color: "var(--gl-ink-3)" }} />
                      <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--gl-ink-3)" }}>
                        Educación
                      </span>
                    </div>
                    <p className="text-sm leading-snug" style={{ color: "var(--gl-ink)" }}>
                      {candidato.educacion}
                    </p>
                  </div>
                )}
              </div>
            </div>
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
