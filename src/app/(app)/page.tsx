"use server"

import Link from "next/link";
import { ArrowRight, AlertCircle, Sparkles, TrendingUp, UserCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

const AVATAR_HEX = [
  { bg: "#dafbe1", color: "#1a7f37" },
  { bg: "#ddf4ff", color: "#0550ae" },
  { bg: "#ffd8eb", color: "#99286e" },
  { bg: "#fff8c5", color: "#7d4e00" },
  { bg: "#eddeff", color: "#6e40c9" },
];

const STAGES = [
  { key: "preseleccionado",    short: "Presel." },
  { key: "entrevista_orka",    short: "Orka" },
  { key: "presentado_cliente", short: "Pres." },
  { key: "entrevista_cliente", short: "2ª Ent." },
  { key: "ofertado",           short: "Ofertado" },
  { key: "contratado",         short: "Contrat." },
];

export default async function Home() {
  const supabase = await createClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [
    { count: candidatosActivos },
    { count: busquedasActivas },
    { count: gestionesEnCurso },
    { data: busquedasRaw },
    { data: candidatosRaw },
    { count: sinMovimientoCount },
  ] = await Promise.all([
    supabase.from("candidatos").select("*", { count: "exact", head: true }).eq("estado", "activo"),
    supabase.from("busquedas").select("*", { count: "exact", head: true }).eq("estado", "activa"),
    supabase.from("gestiones").select("*", { count: "exact", head: true }).neq("estado", "contratado").neq("estado", "descartado"),
    supabase.from("busquedas").select("id, puesto, cliente, gestiones(estado)").eq("estado", "activa"),
    supabase.from("candidatos").select("id, nombre, apellido, ultimo_puesto, gestiones(estado)").eq("estado", "activo").order("fecha_ingreso", { ascending: false }),
    supabase.from("gestiones").select("*", { count: "exact", head: true }).not("estado", "in", "(contratado,descartado)").lt("updated_at", sevenDaysAgo),
  ]);

  type GEst = { estado: string };

  // Candidatos sin gestión activa (disponibles para asignar)
  const sinAsignar = (candidatosRaw ?? []).filter((c) => {
    const activas = ((c.gestiones as GEst[]) ?? []).filter(
      (g) => g.estado !== "contratado" && g.estado !== "descartado"
    );
    return activas.length === 0;
  });

  // Pipeline: distribución por etapa para cada búsqueda activa
  const pipeline = (busquedasRaw ?? []).map((b) => {
    const gest = (b.gestiones as GEst[]) ?? [];
    return {
      id: b.id,
      puesto: b.puesto,
      cliente: b.cliente,
      stages: STAGES.map((s) => ({
        short: s.short,
        count: gest.filter((g) => g.estado === s.key).length,
      })),
      total: gest.filter((g) => g.estado !== "descartado").length,
    };
  });

  const today = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const alertas = sinMovimientoCount ?? 0;

  return (
    <div className="px-10 py-10">

      {/* ── Header ────────────────────────────────────────────────── */}
      <header className="flex items-start justify-between gap-6 mb-10">
        <div>
          <p className="gl-eyebrow mb-2 capitalize">{today}</p>
          <h1
            className="font-display leading-[1.05] tracking-tight"
            style={{ fontSize: "clamp(2rem, 4vw, 2.75rem)", color: "var(--gl-ink)" }}
          >
            Buen día,{" "}
            <span style={{ color: "var(--gl-olive-light)" }}>Oriana</span>
          </h1>
        </div>

        {alertas > 0 && (
          <div className="flex-1 flex items-center justify-center pt-2">
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
              style={{ background: "#fff8c5", color: "#7d4e00", border: "1px solid #e6c84a" }}
            >
              <AlertCircle className="h-4 w-4 shrink-0 opacity-70" />
              {alertas} gestión{alertas !== 1 ? "es" : ""} sin movimiento hace +7 días
            </div>
          </div>
        )}

        <div className="shrink-0 mt-1">
          <Link
            href="/procesar"
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
            style={{ backgroundColor: "#2a4a18", boxShadow: "0 4px 14px rgba(42, 74, 24, 0.30)" }}
          >
            <Sparkles className="h-4 w-4" />
            Procesar CV
          </Link>
        </div>
      </header>

      {/* ── Stats ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Candidatos",  sublabel: "activos",     value: candidatosActivos ?? 0, color: "#1a7f37", bg: "#dafbe1" },
          { label: "Búsquedas",   sublabel: "abiertas",    value: busquedasActivas ?? 0,  color: "#0550ae", bg: "#ddf4ff" },
          { label: "Gestiones",   sublabel: "en curso",    value: gestionesEnCurso ?? 0,  color: "#9a6700", bg: "#fff8c5" },
          { label: "Disponibles", sublabel: "sin asignar", value: sinAsignar.length,       color: "#6e40c9", bg: "#eddeff" },
        ].map((s) => (
          <div
            key={s.label}
            className="p-5 flex flex-col gap-1.5 rounded-2xl border"
            style={{ background: "#ffffff", borderColor: "var(--gl-border)", boxShadow: "0 1px 4px rgba(13,17,23,0.04)" }}
          >
            <div
              className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-lg font-bold"
              style={{ background: s.bg, color: s.color }}
            >
              {s.value}
            </div>
            <div>
              <div className="text-[13px] font-semibold mt-1" style={{ color: "var(--gl-ink)" }}>
                {s.label}
              </div>
              <div className="text-xs" style={{ color: "var(--gl-ink-3)" }}>
                {s.sublabel}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main grid: Búsquedas + Disponibles ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">

        {/* Búsquedas activas — span 2 */}
        <div
          className="lg:col-span-2 rounded-2xl border p-6"
          style={{ background: "#ffffff", borderColor: "var(--gl-border)", boxShadow: "0 2px 8px rgba(13,17,23,0.05)" }}
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-[15px] font-bold" style={{ color: "var(--gl-ink)" }}>Búsquedas activas</h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--gl-ink-3)" }}>Posiciones abiertas ahora</p>
            </div>
            <Link
              href="/busquedas"
              className="flex items-center gap-1 text-xs font-semibold rounded-lg px-3 py-1.5 transition-colors"
              style={{ background: "var(--gl-olive-bg)", color: "var(--gl-olive)" }}
            >
              Ver todas <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-0.5">
            {busquedasRaw?.map((b) => {
              const gest = (b.gestiones as GEst[]) ?? [];
              const total = gest.filter((g) => g.estado !== "descartado").length;
              return (
                <Link
                  key={b.id}
                  href={`/busquedas/${b.id}`}
                  className="gl-row flex items-center justify-between gap-4 px-3 py-3"
                >
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-semibold truncate" style={{ color: "var(--gl-ink)" }}>
                      {b.puesto}
                    </div>
                    <div className="text-xs mt-0.5 truncate" style={{ color: "var(--gl-ink-3)" }}>
                      {b.cliente}
                    </div>
                  </div>
                  <div
                    className="shrink-0 flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{ background: "var(--gl-olive-bg)", color: "var(--gl-olive)" }}
                  >
                    <TrendingUp className="h-3 w-3" />
                    {total}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Disponibles — candidatos sin búsqueda activa */}
        <div
          className="rounded-2xl border p-6"
          style={{ background: "#ffffff", borderColor: "var(--gl-border)", boxShadow: "0 2px 8px rgba(13,17,23,0.05)" }}
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-[15px] font-bold" style={{ color: "var(--gl-ink)" }}>Disponibles</h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--gl-ink-3)" }}>Sin búsqueda asignada</p>
            </div>
            <Link
              href="/candidatos"
              className="flex items-center gap-1 text-xs font-semibold rounded-lg px-3 py-1.5 transition-colors"
              style={{ background: "var(--gl-olive-bg)", color: "var(--gl-olive)" }}
            >
              Ver base <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {sinAsignar.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <UserCheck className="h-8 w-8 mb-3" style={{ color: "var(--gl-olive-light)", opacity: 0.35 }} />
              <p className="text-sm font-medium" style={{ color: "var(--gl-ink)" }}>Todos asignados</p>
              <p className="text-xs mt-1" style={{ color: "var(--gl-ink-3)" }}>No hay candidatos libres</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {sinAsignar.slice(0, 6).map((c, i) => {
                const pal = AVATAR_HEX[i % AVATAR_HEX.length];
                return (
                  <Link
                    key={c.id}
                    href={`/candidatos/${c.id}`}
                    className="gl-row flex items-center gap-3 px-3 py-3"
                  >
                    <div
                      className="h-8 w-8 rounded-full grid place-items-center text-xs font-bold shrink-0"
                      style={{ background: pal.bg, color: pal.color }}
                    >
                      {c.nombre[0]}{c.apellido[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-semibold" style={{ color: "var(--gl-ink)" }}>
                        {c.nombre} {c.apellido}
                      </div>
                      <div className="text-xs truncate mt-0.5" style={{ color: "var(--gl-ink-3)" }}>
                        {c.ultimo_puesto ?? "—"}
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-25" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Pipeline snapshot ─────────────────────────────────────── */}
      <div
        className="rounded-2xl border p-6"
        style={{ background: "#ffffff", borderColor: "var(--gl-border)", boxShadow: "0 2px 8px rgba(13,17,23,0.05)" }}
      >
        <div className="mb-5">
          <h2 className="text-[15px] font-bold" style={{ color: "var(--gl-ink)" }}>Pipeline de búsquedas</h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--gl-ink-3)" }}>
            Candidatos por etapa en cada posición activa
          </p>
        </div>

        {pipeline.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: "var(--gl-ink-3)" }}>
            Sin búsquedas activas
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--gl-border)" }}>
                  <th
                    className="text-left pb-3 pr-8 text-[11px] font-semibold uppercase tracking-wide"
                    style={{ color: "var(--gl-ink-3)" }}
                  >
                    Posición
                  </th>
                  {STAGES.map((s) => (
                    <th
                      key={s.key}
                      className="text-center pb-3 px-3 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap"
                      style={{ color: "var(--gl-ink-3)" }}
                    >
                      {s.short}
                    </th>
                  ))}
                  <th
                    className="text-center pb-3 pl-5 text-[11px] font-semibold uppercase tracking-wide"
                    style={{ color: "var(--gl-ink-3)", borderLeft: "1px solid var(--gl-border)" }}
                  >
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {pipeline.map((row, i) => (
                  <tr
                    key={row.id}
                    style={{
                      borderBottom: i < pipeline.length - 1 ? "1px solid var(--gl-border)" : "none",
                    }}
                  >
                    <td className="py-3 pr-8">
                      <Link
                        href={`/busquedas/${row.id}`}
                        className="font-semibold hover:underline"
                        style={{ color: "var(--gl-ink)" }}
                      >
                        {row.puesto}
                      </Link>
                      <div className="text-xs mt-0.5" style={{ color: "var(--gl-ink-3)" }}>
                        {row.cliente}
                      </div>
                    </td>
                    {row.stages.map((s, si) => (
                      <td key={si} className="text-center px-3 py-3">
                        {s.count > 0 ? (
                          <span
                            className="inline-flex items-center justify-center h-6 min-w-[1.5rem] px-1.5 rounded-full text-xs font-bold"
                            style={{ background: "var(--gl-olive-bg)", color: "var(--gl-olive)" }}
                          >
                            {s.count}
                          </span>
                        ) : (
                          <span style={{ color: "var(--gl-border)" }}>—</span>
                        )}
                      </td>
                    ))}
                    <td
                      className="text-center pl-5 py-3"
                      style={{ borderLeft: "1px solid var(--gl-border)" }}
                    >
                      <span className="text-sm font-bold" style={{ color: "var(--gl-ink)" }}>
                        {row.total}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
