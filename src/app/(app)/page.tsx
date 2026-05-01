import Link from "next/link";
import { ArrowRight, Sparkles, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

const AVATAR_PALETTE = [
  { bg: "var(--av-4-bg)", color: "var(--av-4-c)" },
  { bg: "var(--av-1-bg)", color: "var(--av-1-c)" },
  { bg: "var(--av-2-bg)", color: "var(--av-2-c)" },
  { bg: "var(--av-3-bg)", color: "var(--av-3-c)" },
  { bg: "var(--av-5-bg)", color: "var(--av-5-c)" },
];

// Hardcoded since CSS vars don't render inline in RSC for avatars
const AVATAR_HEX = [
  { bg: "#dafbe1", color: "#1a7f37" },
  { bg: "#ddf4ff", color: "#0550ae" },
  { bg: "#ffd8eb", color: "#99286e" },
  { bg: "#fff8c5", color: "#7d4e00" },
  { bg: "#eddeff", color: "#6e40c9" },
];

export default async function Home() {
  const supabase = await createClient();

  const [
    { count: candidatosActivos },
    { count: busquedasActivas },
    { count: gestionesEnCurso },
    { data: busquedasData },
    { data: candidatosData },
  ] = await Promise.all([
    supabase.from("candidatos").select("*", { count: "exact", head: true }).eq("estado", "activo"),
    supabase.from("busquedas").select("*", { count: "exact", head: true }).eq("estado", "activa"),
    supabase.from("gestiones").select("*", { count: "exact", head: true }).neq("estado", "contratado").neq("estado", "descartado"),
    supabase.from("busquedas").select("*, gestiones(id)").eq("estado", "activa"),
    supabase.from("candidatos").select("*").eq("estado", "activo").order("fecha_ingreso", { ascending: false }).limit(5),
  ]);

  const today = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="px-8 py-10 max-w-5xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 mb-10">
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

      {/* ── Stats ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Candidatos", sublabel: "activos",     value: candidatosActivos ?? 0, color: "#1a7f37", bg: "#dafbe1" },
          { label: "Búsquedas",  sublabel: "abiertas",    value: busquedasActivas ?? 0,  color: "#0550ae", bg: "#ddf4ff" },
          { label: "Gestiones",  sublabel: "en curso",    value: gestionesEnCurso ?? 0,  color: "#9a6700", bg: "#fff8c5" },
          { label: "CVs",        sublabel: "últimos 7d",  value: 0,                       color: "#6e40c9", bg: "#eddeff" },
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

      {/* ── Main content ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Búsquedas */}
        <div className="rounded-2xl border p-6" style={{ background: "#ffffff", borderColor: "var(--gl-border)", boxShadow: "0 2px 8px rgba(13,17,23,0.05)" }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-[15px] font-bold" style={{ color: "var(--gl-ink)" }}>
                Búsquedas activas
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--gl-ink-3)" }}>
                Posiciones abiertas ahora
              </p>
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
            {busquedasData?.map((b) => (
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
                  {b.gestiones.length}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Candidatos */}
        <div className="rounded-2xl border p-6" style={{ background: "#ffffff", borderColor: "var(--gl-border)", boxShadow: "0 2px 8px rgba(13,17,23,0.05)" }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-[15px] font-bold" style={{ color: "var(--gl-ink)" }}>
                Últimos en la base
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--gl-ink-3)" }}>
                Ingresados recientemente
              </p>
            </div>
            <Link
              href="/candidatos"
              className="flex items-center gap-1 text-xs font-semibold rounded-lg px-3 py-1.5 transition-colors"
              style={{ background: "var(--gl-olive-bg)", color: "var(--gl-olive)" }}
            >
              Ver base <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-0.5">
            {candidatosData?.map((c, i) => {
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
                      {c.ultimo_puesto}
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-25" />
                </Link>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
