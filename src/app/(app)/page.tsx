import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

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
    supabase.from("candidatos").select("*").eq("estado", "activo").order("fecha_ingreso", { ascending: false }).limit(4),
  ]);

  const today = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="px-12 py-14 max-w-5xl">
      <header className="flex items-end justify-between gap-8 pb-10 border-b agro-rule">
        <div>
          <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--agro-ink-soft)] capitalize">
            {today}
          </div>
          <h1 className="font-display text-6xl mt-3 leading-[0.95]">
            Buen día,<br />
            <span className="italic text-[var(--agro-olive)]">Oriana</span>.
          </h1>
        </div>
        <Link
          href="/procesar"
          className="inline-flex items-center gap-2 rounded-full bg-[var(--agro-ink)] text-[#f5f1e8] px-5 py-2.5 text-sm hover:bg-[var(--agro-olive)] transition-colors"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Procesar un CV
        </Link>
      </header>

      <section className="grid grid-cols-4 mt-12 border-b agro-rule">
        <Stat label="Candidatos activos" value={candidatosActivos ?? 0} />
        <Stat label="Búsquedas abiertas" value={busquedasActivas ?? 0} />
        <Stat label="Gestiones en curso" value={gestionesEnCurso ?? 0} />
        <Stat label="CVs últ. 7 días" value={0} accent />
      </section>

      <section className="grid grid-cols-2 gap-12 mt-16">
        <div>
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="font-display text-2xl">Búsquedas activas</h2>
            <Link
              href="/busquedas"
              className="text-[11px] uppercase tracking-[0.22em] text-[var(--agro-ink-soft)] hover:text-[var(--agro-olive)] transition-colors"
            >
              Ver todas
            </Link>
          </div>
          <div className="space-y-px">
            {busquedasData?.map((b) => (
              <Link
                key={b.id}
                href={`/busquedas/${b.id}`}
                className="flex items-baseline justify-between gap-4 py-4 border-t agro-rule hover:text-[var(--agro-olive)] transition-colors"
              >
                <div>
                  <div className="text-sm">{b.puesto}</div>
                  <div className="text-xs text-[var(--agro-ink-soft)] mt-0.5 italic">{b.cliente}</div>
                </div>
                <div className="font-display text-2xl tabular-nums text-[var(--agro-olive)]">
                  {b.gestiones.length}
                </div>
              </Link>
            ))}
            <div className="border-t agro-rule" />
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="font-display text-2xl">Últimos en la base</h2>
            <Link
              href="/candidatos"
              className="text-[11px] uppercase tracking-[0.22em] text-[var(--agro-ink-soft)] hover:text-[var(--agro-olive)] transition-colors"
            >
              Ver base
            </Link>
          </div>
          <div className="space-y-px">
            {candidatosData?.map((c) => (
              <Link
                key={c.id}
                href={`/candidatos/${c.id}`}
                className="flex items-center gap-4 py-4 border-t agro-rule hover:text-[var(--agro-olive)] transition-colors"
              >
                <div className="h-10 w-10 shrink-0 rounded-full grid place-items-center border agro-rule font-display text-sm">
                  {c.nombre[0]}{c.apellido[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm">{c.nombre} {c.apellido}</div>
                  <div className="text-xs text-[var(--agro-ink-soft)] truncate italic">
                    {c.ultimo_puesto} · {c.ubicacion}
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-[var(--agro-ink-soft)] shrink-0" />
              </Link>
            ))}
            <div className="border-t agro-rule" />
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="border-r agro-rule last:border-r-0 px-5 py-6 first:pl-0">
      <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--agro-ink-soft)]">
        {label}
      </div>
      <div
        className={`font-display text-5xl tabular-nums mt-2 leading-none ${
          accent ? "text-[var(--agro-olive)]" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
