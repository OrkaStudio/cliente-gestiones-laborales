import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { busquedas, candidatos, gestiones, stats } from "@/lib/mock/data";

const estadoLabels: Record<string, string> = {
  preseleccionado: "Preseleccionado",
  presentado_cliente: "Presentado al cliente",
  entrevista_cliente: "En entrevista",
  contratado: "Contratado",
  descartado: "Descartado",
};

export default function AgroDashboardPage() {
  const ultimos = [...candidatos]
    .filter((c) => c.estado === "activo")
    .sort((a, b) => b.fechaIngreso.localeCompare(a.fechaIngreso))
    .slice(0, 4);

  const enFoco = gestiones
    .map((g) => ({
      gestion: g,
      candidato: candidatos.find((c) => c.id === g.candidatoId),
      busqueda: busquedas.find((b) => b.id === g.busquedaId),
    }))
    .filter((row) => row.candidato && row.busqueda)
    .slice(0, 3);

  return (
    <div className="px-12 py-14 max-w-5xl">
      {/* Greeting */}
      <header className="flex items-end justify-between gap-8 pb-10 border-b agro-rule">
        <div>
          <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--agro-ink-soft)]">
            Sábado · 25 de abril
          </div>
          <h1 className="font-display text-6xl mt-3 leading-[0.95]">
            Buen día,
            <br />
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

      {/* Stats — sin cajas, hairline rules */}
      <section className="grid grid-cols-4 mt-12 border-b agro-rule">
        <Stat label="Candidatos activos" value={stats.candidatosActivos} />
        <Stat label="Búsquedas abiertas" value={stats.busquedasActivas} />
        <Stat label="En gestión" value={stats.gestionesEnCurso} />
        <Stat
          label="CVs últ. 7 días"
          value={stats.cvsProcesadosUltimos7d}
          accent
        />
      </section>

      {/* En foco */}
      <section className="mt-16">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="font-display text-2xl">En foco hoy</h2>
          <span className="text-[11px] uppercase tracking-[0.22em] text-[var(--agro-ink-soft)]">
            {enFoco.length} gestiones
          </span>
        </div>

        <div className="space-y-px">
          {enFoco.map(({ gestion, candidato, busqueda }) => (
            <Link
              key={gestion.id}
              href={`/agro/candidatos/${candidato!.id}`}
              className="group flex items-start justify-between gap-6 py-5 border-t agro-rule hover:bg-[rgba(255,253,247,0.6)] -mx-3 px-3 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-3">
                  <span className="font-display text-lg leading-tight">
                    {candidato!.nombre} {candidato!.apellido}
                  </span>
                  <span className="text-[var(--agro-ink-soft)] text-sm">
                    para
                  </span>
                  <span className="text-sm italic">{busqueda!.puesto}</span>
                </div>
                <p className="text-sm text-[var(--agro-ink-soft)] mt-1.5 leading-relaxed">
                  {gestion.notas}
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--agro-olive)]">
                  {estadoLabels[gestion.estado]}
                </div>
                <div className="font-mono text-[11px] tabular-nums text-[var(--agro-ink-soft)] mt-1">
                  {gestion.ultimaActualizacion}
                </div>
                <ArrowUpRight className="h-4 w-4 ml-auto mt-2 text-[var(--agro-ink-soft)] group-hover:text-[var(--agro-olive)] transition-colors" />
              </div>
            </Link>
          ))}
          <div className="border-t agro-rule" />
        </div>
      </section>

      {/* Doble columna: búsquedas + últimos */}
      <section className="grid grid-cols-2 gap-12 mt-16">
        <div>
          <h2 className="font-display text-2xl mb-6">Búsquedas activas</h2>
          <div className="space-y-px">
            {busquedas.map((b) => {
              const cands = gestiones.filter((g) => g.busquedaId === b.id).length;
              return (
                <div
                  key={b.id}
                  className="flex items-baseline justify-between gap-4 py-4 border-t agro-rule"
                >
                  <div>
                    <div className="text-sm">{b.puesto}</div>
                    <div className="text-xs text-[var(--agro-ink-soft)] mt-0.5 italic">
                      {b.cliente}
                    </div>
                  </div>
                  <div className="font-display text-2xl tabular-nums text-[var(--agro-olive)]">
                    {cands}
                  </div>
                </div>
              );
            })}
            <div className="border-t agro-rule" />
          </div>
        </div>

        <div>
          <h2 className="font-display text-2xl mb-6">Últimos en la base</h2>
          <div className="space-y-px">
            {ultimos.map((c) => (
              <Link
                key={c.id}
                href={`/agro/candidatos/${c.id}`}
                className="flex items-center gap-4 py-4 border-t agro-rule hover:text-[var(--agro-olive)] transition-colors"
              >
                <div className="h-10 w-10 shrink-0 rounded-full grid place-items-center border agro-rule font-display text-sm">
                  {c.nombre[0]}
                  {c.apellido[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm">
                    {c.nombre} {c.apellido}
                  </div>
                  <div className="text-xs text-[var(--agro-ink-soft)] truncate italic">
                    {c.ultimoPuesto}
                  </div>
                </div>
                {c.matchScore && (
                  <div className="font-mono text-xs tabular-nums text-[var(--agro-ink-soft)]">
                    {c.matchScore}%
                  </div>
                )}
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
