import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle, MapPin, TrendingUp, FileText, ArrowLeft, ThumbsUp, ThumbsDown } from "lucide-react";
import { CopyEmailButton } from "@/components/app/copy-email-button";
import { createClient } from "@/lib/supabase/server";
import { WhatsappMessagePanel } from "@/components/app/whatsapp-message-panel";
import { AsignarBusquedaDialog } from "@/components/app/asignar-busqueda-dialog";
import { CandidatoStickyBar } from "@/components/app/candidato-sticky-bar";
import { CandidatoEstadoToggle } from "@/components/app/candidato-estado-toggle";
import { GestionEstadoSelect } from "@/components/app/gestion-estado-select";
import { waUrl } from "@/lib/cv/utils"
import { ReferenciaInlinePanel } from "@/components/app/referencia-inline-panel"
import type { Referencia } from "@/components/app/referencia-inline-panel"
import { FichaEditablePanel } from "@/components/app/ficha-editable-panel"
import { NotasRecruiterInline } from "@/components/app/notas-recruiter-inline"
import { CategoriasInlinePanel } from "@/components/app/categorias-inline-panel"

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

function calcYearsExp(exp: Array<{ desde: string | null }>) {
  if (!exp?.length) return null;
  const years = exp.map((e) => parseInt(e.desde?.substring(0, 4) ?? "") || new Date().getFullYear());
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
      supabase.from("candidatos").select("*, respuestas_candidato").eq("id", id).single(),
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
    ((candidato.nombre.charCodeAt(0) || 0) + (candidato.apellido.charCodeAt(0) || 0)) % AVATAR_HEX.length
  ];

  // Stats que van en el header (sólo los que tienen valor)
  const headerStats = [
    { label: "En base desde",    value: inBaseSince },
    yearsExp != null && { label: "Años de exp.",     value: `${yearsExp}` },
    { label: "Empleadores",      value: `${experiencia?.length ?? 0}` },
    { label: "Gestiones activas", value: `${gestionesActivas}`, accent: gestionesActivas > 0 },
  ].filter(Boolean) as { label: string; value: string; accent?: boolean }[];

  return (
    <>
    <CandidatoStickyBar
      nombre={candidato.nombre}
      apellido={candidato.apellido}
      avatarBg={avatarPal.bg}
      avatarColor={avatarPal.color}
      ultimoPuesto={candidato.ultimo_puesto ?? null}
      candidatoId={candidato.id}
      hasCv={true}
    />
    <div className="px-10 py-10 space-y-5">

      {/* Back */}
      <Link
        href="/candidatos"
        className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
        style={{ color: "var(--gl-ink-3)", textDecoration: "none" }}
        onMouseEnter={undefined}
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Candidatos
      </Link>

      {/* ── Header card ──────────────────────────────────────────── */}
      <div id="profile-header" className="rounded-2xl border p-6" style={CARD}>
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
                className="text-2xl font-bold leading-tight"
                style={{ color: "var(--gl-ink)" }}
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
                {candidato.fecha_consultado && (
                  <span
                    className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                    style={{ background: "#dafbe1", color: "#1a7f37" }}
                  >
                    Consultado
                  </span>
                )}
                {candidato.idiomas?.map((lang: string) => (
                  <span
                    key={lang}
                    className="text-[11px] font-medium px-2.5 py-0.5 rounded-full"
                    style={{ background: "var(--gl-olive-bg)", color: "var(--gl-olive)" }}
                  >
                    {lang}
                  </span>
                ))}
                {/* Indicador de referencias */}
                {(() => {
                  const refs = (candidato.referencias as { calificacion: "buena" | "mala" | null }[] | null) ?? []
                  const buenas = refs.filter(r => r?.calificacion === "buena").length
                  const malas  = refs.filter(r => r?.calificacion === "mala").length
                  if (!buenas && !malas) return null
                  return (
                    <span className="flex items-center gap-2">
                      {buenas > 0 && (
                        <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: "#16a34a" }}>
                          <ThumbsUp className="h-3 w-3" />
                          {buenas}
                        </span>
                      )}
                      {malas > 0 && (
                        <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: "#dc2626" }}>
                          <ThumbsDown className="h-3 w-3" />
                          {malas}
                        </span>
                      )}
                    </span>
                  )
                })()}
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <CandidatoEstadoToggle
              candidatoId={candidato.id}
              estadoInicial={candidato.estado as "activo" | "inactivo"}
            />
            <Link
              href={`/candidatos/${candidato.id}/cv`}
              style={{
                display:        "inline-flex",
                alignItems:     "center",
                gap:            "0.375rem",
                padding:        "0.5rem 1rem",
                fontSize:       "13.5px",
                fontWeight:     600,
                color:          "var(--gl-olive)",
                background:     "transparent",
                border:         "1.5px solid rgba(42,74,24,0.4)",
                borderRadius:   "0.75rem",
                textDecoration: "none",
                whiteSpace:     "nowrap",
                transition:     "all 0.15s",
              }}
            >
              <FileText style={{ width: 14, height: 14 }} />
              Ver CV
            </Link>
            <Link
              href={`/candidatos/${candidato.id}/editar`}
              style={{
                display:        "inline-flex",
                alignItems:     "center",
                gap:            "0.375rem",
                padding:        "0.5rem 1rem",
                fontSize:       "13.5px",
                fontWeight:     600,
                color:          "var(--gl-ink-3)",
                background:     "transparent",
                border:         "1.5px solid var(--gl-border)",
                borderRadius:   "0.75rem",
                textDecoration: "none",
                whiteSpace:     "nowrap",
                transition:     "all 0.15s",
              }}
            >
              Datos del candidato
            </Link>
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

      {/* ── Categorías a aplicar ──────────────────────────────────── */}
      <CategoriasInlinePanel
        candidatoId={candidato.id}
        initialCategorias={(candidato.categorias as string[] | null) ?? []}
      />

      {/* ── Ficha editable ────────────────────────────────────────── */}
      <FichaEditablePanel
        candidatoId={candidato.id}
        disponibilidad={candidato.disponibilidad ?? null}
        pretension_salarial={candidato.pretension_salarial ?? null}
        movilidad={candidato.movilidad ?? null}
        vehiculo_propio={candidato.vehiculo_propio ?? null}
        licencia_conducir={candidato.licencia_conducir ?? null}
        estado_civil={candidato.estado_civil ?? null}
        hijos={candidato.hijos ?? null}
        edad={edad}
      />

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
              <div className="flex items-center gap-2">
                {(gestionesData?.length ?? 0) > 0 && (
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: "var(--gl-olive-bg)", color: "var(--gl-olive)" }}
                  >
                    {gestionesData!.length} total
                  </span>
                )}
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
                    <div
                      key={g.id}
                      className="gl-row flex items-center justify-between gap-4 px-3 py-4"
                      style={{ opacity: isDescartado ? 0.5 : 1 }}
                    >
                      <div className="flex-1 min-w-0">
                        {busq ? (
                          <Link href={`/busquedas/${busq.id}`} style={{ textDecoration: "none" }}>
                            <div className="text-[13.5px] font-semibold truncate hover:underline" style={{ color: "var(--gl-ink)" }}>
                              {busq.puesto}
                            </div>
                            <div className="text-xs mt-0.5 truncate" style={{ color: "var(--gl-ink-3)" }}>
                              {busq.cliente}
                            </div>
                          </Link>
                        ) : (
                          <div className="text-[13.5px] font-semibold truncate" style={{ color: "var(--gl-ink)" }}>—</div>
                        )}


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
                        <GestionEstadoSelect
                          gestionId={g.id}
                          candidatoId={candidato.id}
                          busquedaId={busq?.id ?? ""}
                          estado={g.estado}
                        />
                        <div className="text-[11px] tabular-nums font-mono" style={{ color: "var(--gl-ink-3)" }}>
                          {dias}d sin cambio
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notas del recruiter */}
          <NotasRecruiterInline
            candidatoId={candidato.id}
            notas={candidato.notas_recruiter ?? null}
          />
        </div>

        {/* ── Derecha: contacto + perfil ── */}
        <div className="space-y-5">

          {/* Contacto */}
          {(candidato.email || candidato.telefono || candidato.domicilio_completo || candidato.ubicacion) && (
            <div className="rounded-2xl border p-6" style={CARD}>
              <h2 className="text-[15px] font-bold mb-4" style={{ color: "var(--gl-ink)" }}>Contacto</h2>
              <div className="space-y-2">
                {candidato.email && (
                  <CopyEmailButton email={candidato.email} />
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
                {(candidato.domicilio_completo ?? candidato.ubicacion) && (
                  <div
                    className="flex items-start gap-3 px-3 py-3 rounded-xl"
                    style={{ background: "var(--gl-surface)", border: "1px solid var(--gl-border)" }}
                  >
                    <div className="h-8 w-8 rounded-lg grid place-items-center shrink-0" style={{ background: "var(--gl-olive-bg)" }}>
                      <MapPin className="h-3.5 w-3.5" style={{ color: "var(--gl-olive)" }} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: "var(--gl-ink-3)" }}>
                        Domicilio
                      </div>
                      <div className="text-sm mt-0.5 leading-snug" style={{ color: "var(--gl-ink)" }}>
                        {candidato.domicilio_completo ?? candidato.ubicacion}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Formación */}
          {candidato.educacion && (
            <div className="rounded-2xl border p-6" style={CARD}>
              <h2 className="text-[15px] font-bold mb-3" style={{ color: "var(--gl-ink)" }}>Formación</h2>
              <p className="text-sm leading-relaxed" style={{ color: "var(--gl-ink-3)" }}>
                {candidato.educacion}
              </p>
            </div>
          )}

          {/* Referencias */}
          <ReferenciaInlinePanel
            candidatoId={candidato.id}
            refs={(candidato.referencias as Referencia[] | null) ?? []}
          />

        </div>
      </div>

      {/* WhatsApp */}
      <section className="mt-12 pt-12 border-t" style={{ borderColor: "var(--gl-border)" }}>
        <div className="text-[10px] uppercase tracking-[0.22em] mb-6" style={{ color: "var(--gl-ink-3)" }}>
          Contacto WhatsApp
        </div>
        <WhatsappMessagePanel
          candidatoId={candidato.id}
          nombre={candidato.nombre}
          telefono={candidato.telefono}
          preguntas_sugeridas={candidato.preguntas_sugeridas ?? []}
          fecha_consultado={candidato.fecha_consultado ?? null}
          mensaje_whatsapp={candidato.mensaje_whatsapp ?? null}
          initialRespuestas={(candidato as { respuestas_candidato?: unknown }).respuestas_candidato as { pregunta: string; respuesta: string }[] | null}
        />
      </section>
    </div>
    </>
  );
}
