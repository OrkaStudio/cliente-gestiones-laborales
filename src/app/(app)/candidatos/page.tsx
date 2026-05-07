import Link from "next/link";
import { Search, Users, MapPin, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CandidatoSheet } from "@/components/app/candidato-sheet";

const AVATAR_HEX = [
  { bg: "#dafbe1", color: "#1a7f37" },
  { bg: "#ddf4ff", color: "#0550ae" },
  { bg: "#ffd8eb", color: "#99286e" },
  { bg: "#fff8c5", color: "#7d4e00" },
  { bg: "#eddeff", color: "#6e40c9" },
];

const STAGE_LABEL: Record<string, string> = {
  preseleccionado:    "Preseleccionado",
  entrevista_orka:    "Entrevista GL",
  presentado_cliente: "Presentado",
  entrevista_cliente: "2ª Entrevista",
  ofertado:           "Ofertado",
  contratado:         "Contratado",
};

const STAGE_ORDER = [
  "preseleccionado", "entrevista_orka", "presentado_cliente",
  "entrevista_cliente", "ofertado", "contratado",
];

function estadoBadge(estado: string) {
  const map: Record<string, { bg: string; color: string }> = {
    activo:   { bg: "#dafbe1", color: "#1a7f37" },
    inactivo: { bg: "#f6f8fa", color: "#57606a" },
  };
  return map[estado] ?? { bg: "#f6f8fa", color: "#57606a" };
}

type GestionRaw = { estado: string; busquedas: { puesto: string } | null };

function mejorGestion(gestiones: GestionRaw[]) {
  const activas = gestiones.filter((g) => g.estado !== "descartado" && g.estado !== "contratado");
  if (activas.length === 0) return null;
  return activas.sort(
    (a, b) => STAGE_ORDER.indexOf(b.estado) - STAGE_ORDER.indexOf(a.estado)
  )[0];
}

export default async function CandidatosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("candidatos")
    .select("*, gestiones(estado, busquedas(puesto))")
    .order("fecha_ingreso", { ascending: false })
    .limit(300);

  if (q?.trim()) {
    const term = q.trim();
    query = query.or(
      `nombre.ilike.%${term}%,apellido.ilike.%${term}%,ultimo_puesto.ilike.%${term}%,ubicacion.ilike.%${term}%`
    );
  }

  const { data: candidatos } = await query;

  const total = candidatos?.length ?? 0;
  const activos = candidatos?.filter((c) => c.estado === "activo").length ?? 0;

  return (
    <div className="px-10 py-10">

      {/* Header */}
      <header className="mb-6">
        <p className="gl-eyebrow mb-2">Base de candidatos</p>
        <div className="flex items-center justify-between gap-4">
          <h1
            className="font-display tracking-tight leading-none"
            style={{ fontSize: "clamp(2rem, 4vw, 2.75rem)", color: "var(--gl-ink)" }}
          >
            {total} persona{total !== 1 ? "s" : ""}
          </h1>
          <div className="flex items-center gap-3">
            <span
              className="text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{ background: "#dafbe1", color: "#1a7f37" }}
            >
              {activos} activo{activos !== 1 ? "s" : ""}
            </span>
            <CandidatoSheet />
          </div>
        </div>
      </header>

      {/* Buscador — form GET, filtra en servidor */}
      <form action="/candidatos" method="GET" className="mb-7">
        <div
          className="flex items-center gap-2.5 rounded-lg px-3.5 py-2.5"
          style={{
            background: "var(--gl-surface)",
            border: "1px solid var(--gl-border)",
            maxWidth: "360px",
          }}
        >
          <Search className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--gl-ink-3)" }} />
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar por nombre, puesto o ubicación..."
            autoComplete="off"
            className="bg-transparent text-[13px] flex-1 outline-none"
            style={{ color: "var(--gl-ink)" }}
          />
          {q && (
            <Link
              href="/candidatos"
              className="text-[11px] font-medium shrink-0"
              style={{ color: "var(--gl-ink-3)" }}
            >
              Limpiar
            </Link>
          )}
        </div>
      </form>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">

        {/* Empty state */}
        {total === 0 && (
          <div
            className="flex flex-col items-center text-center py-20"
            style={{ gridColumn: "1 / -1" }}
          >
            <div
              className="h-13 w-13 rounded-full grid place-items-center mb-5"
              style={{ background: "var(--gl-olive-bg)" }}
            >
              <Users className="h-6 w-6" style={{ color: "var(--gl-olive)" }} />
            </div>
            <h3
              className="font-display mb-1.5"
              style={{ fontSize: "1.375rem", color: "var(--gl-ink)" }}
            >
              {q ? `Sin resultados para "${q}"` : "Sin candidatos todavía"}
            </h3>
            <p className="text-sm mb-6" style={{ color: "var(--gl-ink-3)" }}>
              {q
                ? "Probá con otro término o limpiá el filtro."
                : "Agregá el primero para empezar a gestionar la base."}
            </p>
            {!q && <CandidatoSheet />}
          </div>
        )}

        {candidatos?.map((c, i) => {
          const pal = AVATAR_HEX[i % AVATAR_HEX.length];
          const badge = estadoBadge(c.estado);
          const mes = c.fecha_ingreso?.substring(0, 7) ?? "";
          const gestion = mejorGestion((c.gestiones as GestionRaw[]) ?? []);

          return (
            <Link
              key={c.id}
              href={`/candidatos/${c.id}`}
              className="gl-card-link flex flex-col gap-0 p-6"
            >
              {/* ── Top: avatar + datos principales ── */}
              <div className="flex items-start gap-3.5 mb-4">
                <div
                  className="h-11 w-11 rounded-full grid place-items-center text-sm font-bold shrink-0"
                  style={{ background: pal.bg, color: pal.color }}
                >
                  {c.nombre[0]}{c.apellido[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="text-[14px] font-bold leading-tight"
                    style={{ color: "var(--gl-ink)" }}
                  >
                    {c.nombre} {c.apellido}
                  </div>
                  {c.ultimo_puesto && (
                    <div
                      className="text-[12.5px] mt-0.5 truncate"
                      style={{ color: "var(--gl-ink-3)" }}
                    >
                      {c.ultimo_puesto}
                    </div>
                  )}
                  {c.ubicacion && (
                    <div className="flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3 shrink-0" style={{ color: "var(--gl-ink-3)" }} />
                      <span
                        className="text-[11.5px] truncate"
                        style={{ color: "var(--gl-ink-3)" }}
                      >
                        {c.ubicacion}
                      </span>
                    </div>
                  )}
                </div>
                <span
                  className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                  style={badge}
                >
                  {c.estado}
                </span>
              </div>

              {/* ── Gestión activa ── */}
              {gestion ? (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg mb-4"
                  style={{ background: "var(--gl-olive-bg)" }}
                >
                  <span
                    className="text-[11px] font-semibold shrink-0"
                    style={{ color: "var(--gl-olive)" }}
                  >
                    {STAGE_LABEL[gestion.estado] ?? gestion.estado}
                  </span>
                  <span className="text-[11px]" style={{ color: "var(--gl-ink-3)" }}>·</span>
                  <span
                    className="text-[11px] truncate"
                    style={{ color: "var(--gl-ink-3)" }}
                  >
                    {gestion.busquedas?.puesto ?? "—"}
                  </span>
                </div>
              ) : (
                <div className="mb-4" />
              )}

              {/* ── Footer ── */}
              <div
                className="flex items-center justify-between gap-3 pt-3 border-t mt-auto"
                style={{ borderColor: "var(--gl-border)" }}
              >
                {/* Izquierda: idiomas */}
                <div className="flex items-center gap-1 flex-wrap min-w-0">
                  {c.idiomas?.slice(0, 2).map((lang: string) => (
                    <span
                      key={lang}
                      style={{
                        fontSize: "11px",
                        padding: "2px 8px",
                        borderRadius: "6px",
                        background: "var(--gl-olive-bg)",
                        color: "var(--gl-olive)",
                      }}
                    >
                      {lang}
                    </span>
                  ))}
                </div>

                {/* Derecha: teléfono o fecha */}
                <div className="flex items-center gap-2 shrink-0">
                  {c.telefono ? (
                    <span
                      className="flex items-center gap-1 font-mono text-[11px]"
                      style={{ color: "var(--gl-ink-3)" }}
                    >
                      <Phone className="h-2.5 w-2.5" />
                      {c.telefono}
                    </span>
                  ) : mes ? (
                    <span
                      className="font-mono text-[11px]"
                      style={{ color: "var(--gl-ink-3)" }}
                    >
                      {mes}
                    </span>
                  ) : null}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
