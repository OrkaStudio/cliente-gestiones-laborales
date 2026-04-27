import Link from "next/link";
import {
  ArrowUpRight,
  Briefcase,
  FileText,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { busquedas, candidatos, gestiones, stats } from "@/lib/mock/data";

const estadoLabels: Record<string, string> = {
  preseleccionado: "Preseleccionado",
  presentado_cliente: "Presentado",
  entrevista_cliente: "En entrevista",
  contratado: "Contratado",
  descartado: "Descartado",
};

const estadoStyle: Record<string, string> = {
  preseleccionado:
    "bg-[var(--studio-paper-deep)] text-[var(--studio-ink-soft)] border-[var(--studio-rule)]",
  presentado_cliente:
    "bg-[var(--studio-amber-tint)] text-[var(--studio-amber)] border-[var(--studio-amber)]/25",
  entrevista_cliente:
    "bg-[var(--studio-olive-tint)] text-[var(--studio-olive)] border-[var(--studio-olive)]/25",
  contratado:
    "bg-[var(--studio-olive)] text-[var(--studio-cream)] border-[var(--studio-olive)]",
  descartado:
    "bg-[var(--studio-clay-tint)] text-[var(--studio-clay)] border-[var(--studio-clay)]/25",
};

export default function EstudioDashboardPage() {
  const today = new Date();
  const fecha = today
    .toLocaleDateString("es-AR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
    .replace(/^\w/, (c) => c.toUpperCase());

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
    <div className="px-10 py-10 max-w-[1400px]">
      {/* Hero / Greeting */}
      <header className="grid grid-cols-[1fr_auto] gap-8 items-end mb-10">
        <div>
          <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--studio-ink-dim)]">
            {fecha}
          </div>
          <h1 className="font-display text-[56px] leading-[0.95] mt-3">
            Buen día,{" "}
            <span className="italic text-[var(--studio-olive)]">Oriana</span>.
          </h1>
          <p className="text-[15px] text-[var(--studio-ink-soft)] mt-3 max-w-xl leading-relaxed">
            Tenés{" "}
            <span className="text-[var(--studio-ink)] font-medium">
              {stats.gestionesEnCurso} gestiones
            </span>{" "}
            activas y{" "}
            <span className="text-[var(--studio-ink)] font-medium">
              {stats.cvsProcesadosUltimos7d} CVs
            </span>{" "}
            procesados esta semana.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="px-4 h-11 rounded-full border studio-rule bg-[var(--studio-card)] text-sm hover:bg-[var(--studio-cream)] transition-colors">
            Ver agenda
          </button>
          <Link
            href="/estudio/procesar"
            className="px-5 h-11 rounded-full bg-[var(--studio-ink)] text-[var(--studio-cream)] text-sm flex items-center gap-2 hover:bg-[var(--studio-olive)] transition-colors shadow-sm"
          >
            <Sparkles className="h-4 w-4" />
            Procesar CV
          </Link>
        </div>
      </header>

      {/* KPI cards — 4 cuadrados ricos */}
      <section className="grid grid-cols-4 gap-4 mb-10">
        <Kpi
          icon={Users}
          label="Candidatos activos"
          value={stats.candidatosActivos}
          delta="+2 esta semana"
          tint="olive"
        />
        <Kpi
          icon={Briefcase}
          label="Búsquedas abiertas"
          value={stats.busquedasActivas}
          delta="todas activas"
          tint="default"
        />
        <Kpi
          icon={TrendingUp}
          label="En gestión"
          value={stats.gestionesEnCurso}
          delta="+1 ayer"
          tint="amber"
        />
        <Kpi
          icon={FileText}
          label="CVs últ. 7 días"
          value={stats.cvsProcesadosUltimos7d}
          delta="ritmo normal"
          tint="cream"
        />
      </section>

      {/* En foco hoy — gestiones críticas */}
      <section className="studio-card p-7 mb-6">
        <div className="flex items-baseline justify-between mb-5">
          <div>
            <h2 className="font-display text-2xl leading-none">
              En foco <span className="italic">hoy</span>
            </h2>
            <p className="text-[13px] text-[var(--studio-ink-soft)] mt-1.5">
              Gestiones que necesitan tu atención
            </p>
          </div>
          <span className="text-[11px] uppercase tracking-[0.22em] text-[var(--studio-ink-dim)]">
            {enFoco.length} pendientes
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {enFoco.map(({ gestion, candidato, busqueda }) => (
            <Link
              key={gestion.id}
              href={`/estudio/candidatos/${candidato!.id}`}
              className="group rounded-xl border studio-rule bg-[var(--studio-cream)]/40 p-5 hover:bg-[var(--studio-cream)] hover:border-[var(--studio-olive)]/30 transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <span
                  className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] px-2.5 py-1 rounded-full border ${estadoStyle[gestion.estado]}`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {estadoLabels[gestion.estado]}
                </span>
                <ArrowUpRight className="h-4 w-4 text-[var(--studio-ink-dim)] group-hover:text-[var(--studio-olive)] transition-colors" />
              </div>

              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full grid place-items-center bg-[var(--studio-paper-deep)] font-display text-sm">
                  {candidato!.nombre[0]}
                  {candidato!.apellido[0]}
                </div>
                <div className="min-w-0">
                  <div className="font-display text-lg leading-tight truncate">
                    {candidato!.nombre} {candidato!.apellido}
                  </div>
                  <div className="text-[12px] text-[var(--studio-ink-soft)] italic font-display truncate">
                    para {busqueda!.puesto}
                  </div>
                </div>
              </div>

              <p className="text-[13px] text-[var(--studio-ink-soft)] leading-relaxed line-clamp-2">
                {gestion.notas}
              </p>

              <div className="flex items-center justify-between mt-4 pt-3 border-t studio-rule-soft text-[11px]">
                <span className="text-[var(--studio-ink-dim)]">
                  Actualizado {gestion.ultimaActualizacion}
                </span>
                {candidato!.matchScore && (
                  <span className="font-mono tabular-nums text-[var(--studio-olive)] font-medium">
                    {candidato!.matchScore}% match
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Doble columna: búsquedas + últimos */}
      <section className="grid grid-cols-2 gap-6">
        <div className="studio-card p-7">
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="font-display text-2xl leading-none">
              Búsquedas <span className="italic">activas</span>
            </h2>
            <Link
              href="/estudio/busquedas"
              className="text-[12px] text-[var(--studio-olive)] hover:underline flex items-center gap-1"
            >
              Ver todas
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {busquedas.map((b) => {
              const cands = gestiones.filter((g) => g.busquedaId === b.id).length;
              return (
                <Link
                  key={b.id}
                  href={`/estudio/busquedas/${b.id}`}
                  className="flex items-center gap-4 p-4 rounded-xl border studio-rule-soft bg-[var(--studio-cream)]/40 hover:bg-[var(--studio-cream)] hover:border-[var(--studio-rule)] transition-colors group"
                >
                  <div className="h-10 w-10 rounded-lg grid place-items-center bg-[var(--studio-olive-tint)] text-[var(--studio-olive)] font-display text-base shrink-0">
                    {b.cliente[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium leading-tight truncate">
                      {b.puesto}
                    </div>
                    <div className="text-[12px] text-[var(--studio-ink-soft)] italic font-display truncate mt-0.5">
                      {b.cliente} · {b.ubicacion}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-display text-2xl tabular-nums leading-none text-[var(--studio-olive)]">
                      {cands}
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--studio-ink-dim)] mt-0.5">
                      cands.
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="studio-card p-7">
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="font-display text-2xl leading-none">
              Últimos en la <span className="italic">base</span>
            </h2>
            <Link
              href="/estudio/candidatos"
              className="text-[12px] text-[var(--studio-olive)] hover:underline flex items-center gap-1"
            >
              Ver todos
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {ultimos.map((c) => (
              <Link
                key={c.id}
                href={`/estudio/candidatos/${c.id}`}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-[var(--studio-cream)] transition-colors group"
              >
                <div className="h-11 w-11 rounded-full grid place-items-center bg-[var(--studio-paper-deep)] font-display text-sm shrink-0">
                  {c.nombre[0]}
                  {c.apellido[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium leading-tight truncate group-hover:text-[var(--studio-olive)] transition-colors">
                    {c.nombre} {c.apellido}
                  </div>
                  <div className="text-[12px] text-[var(--studio-ink-soft)] italic font-display truncate mt-0.5">
                    {c.ultimoPuesto} · {c.ubicacion}
                  </div>
                </div>
                {c.matchScore && (
                  <MatchBadge score={c.matchScore} />
                )}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  delta,
  tint,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  delta: string;
  tint: "default" | "olive" | "amber" | "cream";
}) {
  const bg =
    tint === "olive"
      ? "bg-[var(--studio-olive-tint)] border-[var(--studio-olive)]/15"
      : tint === "amber"
        ? "bg-[var(--studio-amber-tint)] border-[var(--studio-amber)]/15"
        : tint === "cream"
          ? "bg-[var(--studio-cream)] border-[var(--studio-rule)]"
          : "bg-[var(--studio-card)] border-[var(--studio-rule)]";

  const iconColor =
    tint === "olive"
      ? "text-[var(--studio-olive)]"
      : tint === "amber"
        ? "text-[var(--studio-amber)]"
        : "text-[var(--studio-ink-soft)]";

  return (
    <div
      className={`rounded-2xl border ${bg} p-6 relative overflow-hidden`}
      style={{
        boxShadow: "0 1px 0 rgba(31,29,24,0.02), 0 6px 16px -8px rgba(31,29,24,0.06)",
      }}
    >
      <div className="flex items-start justify-between">
        <div
          className={`h-9 w-9 rounded-xl grid place-items-center bg-[var(--studio-card)]/70 border studio-rule-soft ${iconColor}`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-6">
        <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--studio-ink-soft)]">
          {label}
        </div>
        <div className="font-display text-5xl tabular-nums leading-none mt-2 text-[var(--studio-ink)]">
          {value}
        </div>
        <div className="text-[12px] text-[var(--studio-ink-dim)] italic font-display mt-2">
          {delta}
        </div>
      </div>
    </div>
  );
}

function MatchBadge({ score }: { score: number }) {
  const tone =
    score >= 85
      ? "text-[var(--studio-olive)] bg-[var(--studio-olive-tint)] border-[var(--studio-olive)]/20"
      : score >= 70
        ? "text-[var(--studio-amber)] bg-[var(--studio-amber-tint)] border-[var(--studio-amber)]/20"
        : "text-[var(--studio-ink-soft)] bg-[var(--studio-paper-deep)] border-[var(--studio-rule)]";
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-mono tabular-nums px-2.5 py-1 rounded-full border ${tone} font-medium shrink-0`}
    >
      {score}%
    </span>
  );
}
