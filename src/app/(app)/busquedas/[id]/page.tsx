import { ArrowLeft, Calendar, Lock, MapPin, Users } from "lucide-react";
import { unstable_cache } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BorrarGestionButton } from "@/components/app/borrar-gestion-button";
import { CandidatosTabs } from "@/components/app/candidatos-tabs";
import { CerrarBusquedaButton } from "@/components/app/cerrar-busqueda-button";
import { CriteriosPanel } from "@/components/app/criterios-panel";
import { CriteriosProvider } from "@/components/app/criterios-provider";
import { GestionEstadoSelect } from "@/components/app/gestion-estado-select";
import { MatchingWorkspace } from "@/components/app/matching-workspace";
import { NotasBusquedaInline } from "@/components/app/notas-busqueda-inline";
import { SumarCandidatoDialog } from "@/components/app/sumar-candidato-dialog";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { borradorDesdeBusqueda, parseCriterios } from "@/lib/v2/criterios";
import { candidatoDesdeRow, fichasDesdeRows } from "@/lib/v2/desde-busqueda";

const AVATAR_HEX = [
  { bg: "#dafbe1", color: "#1a7f37" },
  { bg: "#ddf4ff", color: "#0550ae" },
  { bg: "#ffd8eb", color: "#99286e" },
  { bg: "#fff8c5", color: "#7d4e00" },
  { bg: "#eddeff", color: "#6e40c9" },
];

const STAGES = [
  { key: "preseleccionado", label: "Preseleccionado" },
  { key: "entrevista_orka", label: "Entrevista GL" },
  { key: "presentado_cliente", label: "Presentado" },
  { key: "entrevista_cliente", label: "2ª Entrevista" },
  { key: "ofertado", label: "Ofertado" },
  { key: "contratado", label: "Contratado" },
];

function calcDaysOpen(fecha: string) {
  if (!fecha) return 0;
  return Math.floor((Date.now() - new Date(fecha).getTime()) / 86_400_000);
}

function formatDate(iso: string | null) {
  if (!iso) return "";
  const d = iso.split("T")[0].split("-");
  return `${d[2]}/${d[1]}/${d[0]}`;
}

function diasDesde(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

const CARD = {
  background: "#ffffff",
  borderColor: "var(--gl-border)",
  boxShadow: "0 2px 8px rgba(13,17,23,0.05)",
} as const;

export default async function BusquedaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // En dev con bypass de auth no hay sesión → las lecturas anon están bloqueadas (fix PII).
  // Sólo en ese caso leemos con el service client para poder construir/ver la V2 en local.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const devNoAuth =
    process.env.NODE_ENV === "development" && process.env.GL_DEV_NO_AUTH === "1" && !user;
  const reader = devNoAuth ? createServiceClient() : supabase;

  // Datos base de la búsqueda: estables → cacheados con tag por ID
  const getBusqueda = unstable_cache(
    async () => {
      const svc = createServiceClient();
      const { data } = await svc.from("busquedas").select("*").eq("id", id).single();
      return data;
    },
    [`busqueda-${id}`],
    { tags: [`busqueda-${id}`], revalidate: 120 },
  );

  // Gestiones y candidatos activos: cambian frecuentemente → sin cache
  const [busqueda, { data: gestionesData }, { data: candidatosActivos }] = await Promise.all([
    getBusqueda(),
    reader
      .from("gestiones")
      .select("*, candidatos(id, nombre, apellido, ultimo_puesto)")
      .eq("busqueda_id", id)
      .order("updated_at", { ascending: false }),
    reader
      .from("candidatos")
      .select(
        "id, nombre, apellido, ultimo_puesto, ubicacion, estado, fecha_nacimiento, educacion, hectareas_max, personal_a_cargo_max, tipos_ganaderia, vehiculo_propio, licencia_conducir, estado_civil, hijos, categorias, cv_procesado_texto, telefono, disponibilidad, pretension_salarial, vehiculo_detalle, perfil_laboral, notas_recruiter, referencias, pareja_declarada, habilidades, residir, residir_zona_preferida",
      )
      .eq("estado", "activo")
      .order("apellido"),
  ]);

  if (!busqueda) notFound();

  // ── Matching V2. Los criterios GUARDADOS mandan; si la búsqueda todavía no tiene
  // (las viejas, cargadas en V1), se deriva un borrador del brief y la recruiter lo
  // confirma desde el panel. El ranking se calcula en el cliente para que el embudo
  // se mueva en vivo al editar un chip.
  const criteriosGuardados = parseCriterios(busqueda.criterios);
  const criteriosV2 = criteriosGuardados ?? borradorDesdeBusqueda(busqueda);
  const candidatosV2 = (candidatosActivos ?? []).map(candidatoDesdeRow);
  const enBusquedaIds = (gestionesData ?? [])
    .map((g) => (g.candidatos as { id: string } | null)?.id ?? "")
    .filter(Boolean);

  // Ficha + trayectoria reales para el drawer (experiencia_laboral de los activos).
  const { data: expData } = await reader
    .from("experiencia_laboral")
    .select(
      "candidato_id, rol, empresa, desde, hasta, ubicacion, descripcion, nombre_propietario, dimension_establecimiento, personal_a_cargo, en_blanco, ingresos_actuales, beneficios, motivo_cambio_o_salida",
    )
    .in(
      "candidato_id",
      (candidatosActivos ?? []).map((c) => c.id),
    )
    .order("orden");
  const fichas = fichasDesdeRows(candidatosActivos ?? [], expData ?? []);

  const daysOpen = calcDaysOpen(busqueda.fecha_ultimo_activado ?? busqueda.fecha_apertura);
  const descartados = gestionesData?.filter((g) => g.estado === "descartado").length ?? 0;
  const contratados = gestionesData?.filter((g) => g.estado === "contratado").length ?? 0;
  const activos = (gestionesData?.length ?? 0) - descartados;

  // "Temporario" (pedido de Andrea): alguien cubre el puesto por día mientras la búsqueda
  // SIGUE abierta. La búsqueda no cambia de estado — se avisa acá con el nombre de quién
  // la está cubriendo, que es el dato que se perdía si lo guardábamos como estado de la búsqueda.
  const cubriendo = (gestionesData ?? [])
    .filter((g) => g.estado === "temporario")
    .map((g) => {
      const c = g.candidatos as { nombre: string; apellido: string } | null;
      return c ? `${c.nombre} ${c.apellido}` : null;
    })
    .filter((n): n is string => n !== null);

  const funnel = STAGES.map((s) => ({
    ...s,
    count: gestionesData?.filter((g) => g.estado === s.key).length ?? 0,
  })).filter((s) => s.count > 0);
  const maxCount = Math.max(...funnel.map((s) => s.count), 1);

  const headerTitulo = busqueda.cliente?.trim() ? busqueda.cliente : busqueda.puesto;
  const headerSubtitulo = busqueda.cliente?.trim() ? busqueda.puesto : null;
  const headerPal = AVATAR_HEX[headerTitulo.charCodeAt(0) % AVATAR_HEX.length];

  const estadoBadge = busqueda.estado === "activa" ? "gl-badge-green" : "gl-badge-gray";
  const editable = busqueda.estado === "activa" || busqueda.estado === "pausada";

  const headerStats = [
    { label: "Días abierta", value: `${daysOpen}`, accent: daysOpen > 30 },
    { label: "En gestión", value: `${activos}` },
    // Antes contaba `requisitos[]` (el array V1 de texto): decía "0 requisitos" en búsquedas
    // con el brief lleno. Ahora cuenta los criterios reales del matching.
    { label: "Requisitos", value: `${criteriosV2.requisitos.length + criteriosV2.categorias.length}` },
    { label: "Descartados", value: `${descartados}` },
  ];

  // "Datos" de la posición: movidos al header (antes vivían en un card suelto abajo).
  const datosPos = [
    busqueda.reporte_directo && { label: "Reporte directo", value: busqueda.reporte_directo },
    busqueda.rango_salarial && {
      label: "Rango salarial",
      value: busqueda.rango_salarial,
      accent: true,
    },
    (busqueda.edad_minima != null || busqueda.edad_maxima != null) && {
      label: "Edad",
      value:
        busqueda.edad_minima != null && busqueda.edad_maxima != null
          ? `${busqueda.edad_minima}–${busqueda.edad_maxima} años`
          : busqueda.edad_maxima != null
            ? `hasta ${busqueda.edad_maxima} años`
            : `desde ${busqueda.edad_minima} años`,
    },
    busqueda.nivel_educacion && { label: "Educación", value: busqueda.nivel_educacion },
    busqueda.estado_civil && { label: "Estado civil", value: busqueda.estado_civil },
    busqueda.disponibilidad_viaje != null && {
      label: "Disp. a viajar",
      value: busqueda.disponibilidad_viaje ? "Sí" : "No",
    },
    busqueda.movilidad_requerida != null && {
      label: "Movilidad propia",
      value: busqueda.movilidad_requerida ? "Sí" : "No",
    },
  ].filter(Boolean) as { label: string; value: string; accent?: boolean }[];

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
              {headerTitulo[0].toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span
                  className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${estadoBadge}`}
                >
                  {busqueda.estado}
                </span>
                {contratados > 0 && (
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full gl-badge-green">
                    {contratados} contratado{contratados > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold leading-tight" style={{ color: "var(--gl-ink)" }}>
                {headerTitulo}
              </h1>
              <div className="flex items-center gap-2 flex-wrap mt-1.5">
                {headerSubtitulo && (
                  <span className="text-sm font-medium" style={{ color: "var(--gl-ink-3)" }}>
                    {headerSubtitulo}
                  </span>
                )}
                {busqueda.ubicacion && (
                  <>
                    <span style={{ color: "var(--gl-border)" }}>·</span>
                    <span
                      className="flex items-center gap-1 text-sm"
                      style={{ color: "var(--gl-ink-3)" }}
                    >
                      <MapPin className="h-3 w-3 shrink-0" />
                      {busqueda.ubicacion}
                    </span>
                  </>
                )}
                {busqueda.fecha_apertura && (
                  <>
                    <span style={{ color: "var(--gl-border)" }}>·</span>
                    <span
                      className="flex items-center gap-1 text-sm"
                      style={{ color: "var(--gl-ink-3)" }}
                    >
                      <Calendar className="h-3 w-3 shrink-0" />
                      {formatDate(busqueda.fecha_apertura)}
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
                <CerrarBusquedaButton
                  busquedaId={busqueda.id}
                  puesto={busqueda.puesto}
                  cliente={busqueda.cliente}
                  hayContratado={contratados > 0}
                  gestiones={(gestionesData ?? [])
                    .filter((g) => g.estado !== "descartado" && g.estado !== "contratado")
                    .map((g) => ({
                      id: g.id,
                      candidatos: g.candidatos as {
                        id: string;
                        nombre: string;
                        apellido: string;
                        ultimo_puesto: string | null;
                      } | null,
                    }))}
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
          {cubriendo.length > 0 && (
            <div
              className="w-full -mt-1 mb-1 px-3 py-2 rounded-xl text-[13px] font-semibold"
              style={{ background: "var(--gl-amber-bg)", color: "var(--gl-amber)" }}
            >
              Cubierta temporalmente por {cubriendo.join(", ")} — la búsqueda sigue abierta.
            </div>
          )}
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

        {/* Datos de la posición — al principio, junto al header */}
        {datosPos.length > 0 && (
          <div
            className="mt-4 pt-4 flex items-center gap-x-8 gap-y-3 flex-wrap"
            style={{ borderTop: "1px solid var(--gl-border)" }}
          >
            {datosPos.map((d, i) => (
              <div key={i} className="flex flex-col gap-0.5">
                <span className="gl-eyebrow">{d.label}</span>
                <span
                  className="text-[13.5px] font-semibold"
                  style={{ color: d.accent ? "var(--gl-olive)" : "var(--gl-ink)" }}
                >
                  {d.value}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Main grid ─────────────────────────────────────────────── */}
      {/* El provider envuelve las DOS columnas: el panel de criterios (derecha) y la lista
          de sugeridos (izquierda) comparten estado, así el embudo se recalcula en vivo. */}
      <CriteriosProvider
        busquedaId={busqueda.id}
        puesto={busqueda.puesto}
        cliente={busqueda.cliente}
        criteriosIniciales={criteriosV2}
        esBorrador={criteriosGuardados === null}
        candidatos={candidatosV2}
        preview={devNoAuth}
      >
      {/* Brief a lo ancho y colapsable: es CONTEXTO, no algo que se mire todo el tiempo.
          Antes empujaba los requisitos hacia abajo, lejos de los candidatos. */}
      {busqueda.descripcion && (
        <details open className="rounded-2xl border p-6" style={CARD}>
          <summary className="cursor-pointer text-[15px] font-bold" style={{ color: "var(--gl-ink)" }}>
            Brief
          </summary>
          <p className="text-sm leading-relaxed mt-3" style={{ color: "var(--gl-ink-3)" }}>
            {busqueda.descripcion}
          </p>
        </details>
      )}

      {/* ── Zona de trabajo: los requisitos y los candidatos, uno al lado del otro y a la
          misma altura. Tocás un requisito y ves cambiar la lista sin que se mueva nada. */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
        <div className="lg:col-span-2 lg:sticky lg:top-6">
          <CriteriosPanel />
        </div>
        <div className="lg:col-span-3 space-y-5">
          {/* Pipeline — arriba de los candidatos, mismo ancho que la lista */}
          {funnel.length > 0 && (
            <div className="rounded-2xl border p-5" style={CARD}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[15px] font-bold" style={{ color: "var(--gl-ink)" }}>
                  Pipeline
                </h2>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full gl-badge-olive">
                  {activos} activo{activos !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="space-y-0">
                {funnel.map((stage) => (
                  <div
                    key={stage.key}
                    className="flex items-center gap-4 py-2.5"
                    style={{ borderTop: "1px solid var(--gl-border)" }}
                  >
                    <span className="gl-eyebrow shrink-0 w-36" style={{ color: "var(--gl-ink-3)" }}>
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
                          background:
                            stage.key === "contratado" ? "var(--gl-green)" : "var(--gl-olive)",
                        }}
                      />
                    </div>
                    <span
                      className="text-[13px] font-bold tabular-nums shrink-0 w-5 text-right"
                      style={{
                        color: stage.key === "contratado" ? "var(--gl-green)" : "var(--gl-olive)",
                      }}
                    >
                      {stage.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Candidatos — En la búsqueda / Sugeridos */}
          <div>
            <CandidatosTabs
              enBusquedaCount={gestionesData?.length ?? 0}
              sugeridos={
                <MatchingWorkspace
                  busquedaId={busqueda.id}
                  enBusquedaIds={enBusquedaIds}
                  fichas={fichas}
                />
              }
              enBusqueda={
                !gestionesData?.length ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Users
                      className="h-8 w-8 mb-3"
                      style={{ color: "var(--gl-olive)", opacity: 0.3 }}
                    />
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
                      const stageLabel = STAGES.find((s) => s.key === estado)?.label ?? estado;
                      const stageIdx = STAGES.findIndex((s) => s.key === estado);
                      const dias = diasDesde(updated_at);
                      const c = cand as {
                        id: string;
                        nombre: string;
                        apellido: string;
                        ultimo_puesto: string | null;
                      } | null;
                      const avatarPal = c
                        ? AVATAR_HEX[
                            (c.nombre.charCodeAt(0) + c.apellido.charCodeAt(0)) % AVATAR_HEX.length
                          ]
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
                                {(c.nombre ?? "?")[0]}
                                {(c.apellido ?? "?")[0]}
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
                                            width: i === stageIdx ? 8 : 6,
                                            height: i === stageIdx ? 8 : 6,
                                            background:
                                              i <= stageIdx
                                                ? "var(--gl-olive)"
                                                : "var(--gl-border)",
                                            opacity: i < stageIdx ? 0.4 : 1,
                                          }}
                                        />
                                        {i < STAGES.length - 1 && (
                                          <div
                                            style={{
                                              height: 1,
                                              width: 12,
                                              background:
                                                i < stageIdx
                                                  ? "var(--gl-olive)"
                                                  : "var(--gl-border)",
                                              opacity: i < stageIdx ? 0.35 : 1,
                                            }}
                                          />
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
                              <span
                                className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-md block whitespace-nowrap ${stageBadgeCls}`}
                              >
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
                          {editable && c && (
                            <BorrarGestionButton
                              gestionId={gId}
                              busquedaId={id}
                              candidatoId={c.id}
                              nombre={`${c.nombre} ${c.apellido}`}
                            />
                          )}
                        </div>
                      );
                    })}
                    <div style={{ borderTop: "1px solid var(--gl-border)" }} />
                  </div>
                )
              }
            />
          </div>
        </div>
      </div>

      {/* Notas internas — a lo ancho, debajo de la zona de trabajo */}
      <NotasBusquedaInline busquedaId={busqueda.id} notas={busqueda.notas_internas ?? null} />
      </CriteriosProvider>
    </div>
  );
}
