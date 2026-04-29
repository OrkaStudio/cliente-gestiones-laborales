import Link from "next/link";
import { Filter, Plus, Search, SlidersHorizontal } from "lucide-react";
import { candidatos } from "@/lib/mock/data";

export const dynamic = "force-dynamic";

export default function EstudioCandidatosPage() {
  const sorted = [...candidatos].sort(
    (a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0),
  );
  const activos = candidatos.filter((c) => c.estado === "activo").length;

  return (
    <div className="px-10 py-10 max-w-[1400px]">
      {/* Header */}
      <header className="flex items-end justify-between gap-6 mb-8">
        <div>
          <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--studio-ink-dim)]">
            Base de datos
          </div>
          <h1 className="font-display text-5xl leading-[1] mt-2">
            <span className="italic">{candidatos.length}</span> candidatos
          </h1>
          <p className="text-sm text-[var(--studio-ink-soft)] mt-2">
            <span className="text-[var(--studio-olive)] font-medium">
              {activos} activos
            </span>
            <span className="mx-2 text-[var(--studio-rule)]">·</span>
            {candidatos.length - activos} en pausa
          </p>
        </div>
        <button className="px-5 h-11 rounded-full bg-[var(--studio-ink)] text-[var(--studio-cream)] text-sm flex items-center gap-2 hover:bg-[var(--studio-olive)] transition-colors shadow-sm">
          <Plus className="h-4 w-4" />
          Nuevo candidato
        </button>
      </header>

      {/* Filters bar */}
      <div className="studio-card p-4 mb-5 flex items-center gap-3">
        <div className="flex-1 flex items-center gap-3 px-3 py-2 rounded-lg bg-[var(--studio-cream)]/60 border studio-rule-soft">
          <Search className="h-4 w-4 text-[var(--studio-ink-dim)]" />
          <input
            placeholder="Buscar por nombre, ubicación, puesto..."
            className="bg-transparent outline-none text-sm flex-1 placeholder:text-[var(--studio-ink-dim)] placeholder:italic"
          />
        </div>
        <FilterChip label="Estado: activo" active />
        <FilterChip label="Match > 70%" />
        <button className="h-10 px-4 rounded-lg border studio-rule bg-[var(--studio-cream)] text-sm text-[var(--studio-ink-soft)] hover:bg-[var(--studio-card)] flex items-center gap-2">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filtros
        </button>
      </div>

      {/* Tabla en card */}
      <div className="studio-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b studio-rule bg-[var(--studio-cream)]/50">
              <th className="text-left text-[10px] uppercase tracking-[0.22em] font-medium text-[var(--studio-ink-soft)] py-3.5 px-5">
                Candidato
              </th>
              <th className="text-left text-[10px] uppercase tracking-[0.22em] font-medium text-[var(--studio-ink-soft)] py-3.5">
                Último puesto
              </th>
              <th className="text-left text-[10px] uppercase tracking-[0.22em] font-medium text-[var(--studio-ink-soft)] py-3.5">
                Ubicación
              </th>
              <th className="text-left text-[10px] uppercase tracking-[0.22em] font-medium text-[var(--studio-ink-soft)] py-3.5">
                Disponibilidad
              </th>
              <th className="text-left text-[10px] uppercase tracking-[0.22em] font-medium text-[var(--studio-ink-soft)] py-3.5">
                Ingreso
              </th>
              <th className="text-right text-[10px] uppercase tracking-[0.22em] font-medium text-[var(--studio-ink-soft)] py-3.5">
                Match
              </th>
              <th className="text-right text-[10px] uppercase tracking-[0.22em] font-medium text-[var(--studio-ink-soft)] py-3.5 px-5">
                Estado
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => (
              <tr
                key={c.id}
                className="border-b studio-rule-soft last:border-b-0 hover:bg-[var(--studio-cream)]/40 transition-colors group"
              >
                <td className="py-4 px-5">
                  <Link
                    href={`/estudio/candidatos/${c.id}`}
                    className="flex items-center gap-3"
                  >
                    <div className="h-10 w-10 rounded-full grid place-items-center bg-[var(--studio-paper-deep)] font-display text-sm shrink-0">
                      {c.nombre[0]}
                      {c.apellido[0]}
                    </div>
                    <div>
                      <div className="text-sm font-medium leading-tight group-hover:text-[var(--studio-olive)] transition-colors">
                        {c.nombre} {c.apellido}
                      </div>
                      <div className="text-[12px] text-[var(--studio-ink-dim)] mt-0.5">
                        {c.email}
                      </div>
                    </div>
                  </Link>
                </td>
                <td className="text-sm text-[var(--studio-ink-soft)]">
                  {c.ultimoPuesto}
                </td>
                <td className="text-sm text-[var(--studio-ink-soft)]">
                  {c.ubicacion}
                </td>
                <td>
                  <DisponibilidadPill text={c.disponibilidad} />
                </td>
                <td className="text-sm text-[var(--studio-ink-soft)] tabular-nums font-mono text-[12px]">
                  {c.fechaIngreso}
                </td>
                <td className="text-right pr-5">
                  {c.matchScore ? (
                    <MatchCell score={c.matchScore} />
                  ) : (
                    <span className="text-[var(--studio-ink-dim)] text-sm">
                      —
                    </span>
                  )}
                </td>
                <td className="text-right py-4 px-5">
                  <EstadoPill estado={c.estado} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 h-12 border-t studio-rule bg-[var(--studio-cream)]/40 text-[12px] text-[var(--studio-ink-soft)]">
          <span>
            Mostrando{" "}
            <span className="text-[var(--studio-ink)] font-medium">
              {sorted.length}
            </span>{" "}
            de {candidatos.length}
          </span>
          <div className="flex items-center gap-2 font-mono tabular-nums">
            <button className="h-7 w-7 grid place-items-center rounded-md border studio-rule-soft hover:bg-[var(--studio-card)]">
              ‹
            </button>
            <span className="px-2">1 / 1</span>
            <button className="h-7 w-7 grid place-items-center rounded-md border studio-rule-soft hover:bg-[var(--studio-card)]">
              ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterChip({ label, active }: { label: string; active?: boolean }) {
  return (
    <button
      className={`h-10 px-3.5 rounded-lg text-sm flex items-center gap-2 transition-colors ${
        active
          ? "bg-[var(--studio-olive-tint)] text-[var(--studio-olive)] border border-[var(--studio-olive)]/25"
          : "border studio-rule bg-[var(--studio-cream)] text-[var(--studio-ink-soft)] hover:bg-[var(--studio-card)]"
      }`}
    >
      <Filter className="h-3 w-3" />
      {label}
      {active && <span className="text-[var(--studio-olive)]">×</span>}
    </button>
  );
}

function DisponibilidadPill({ text }: { text: string }) {
  const lower = text.toLowerCase();
  const isInmediata = lower.includes("inmediata");
  const isFuera = lower.includes("fuera");
  const display = isInmediata
    ? "Inmediata"
    : isFuera
      ? "Fuera de búsqueda"
      : text.split(",")[0];

  const cls = isInmediata
    ? "bg-[var(--studio-olive-tint)] text-[var(--studio-olive)]"
    : isFuera
      ? "bg-[var(--studio-clay-tint)] text-[var(--studio-clay)]"
      : "bg-[var(--studio-amber-tint)] text-[var(--studio-amber)]";

  return (
    <span className={`text-[11px] px-2.5 py-1 rounded-full ${cls} italic font-display`}>
      {display}
    </span>
  );
}

function MatchCell({ score }: { score: number }) {
  const tone =
    score >= 85
      ? "text-[var(--studio-olive)]"
      : score >= 70
        ? "text-[var(--studio-amber)]"
        : "text-[var(--studio-ink-soft)]";
  const bar =
    score >= 85
      ? "bg-[var(--studio-olive)]"
      : score >= 70
        ? "bg-[var(--studio-amber)]"
        : "bg-[var(--studio-ink-dim)]";
  return (
    <div className="inline-flex items-center gap-2.5">
      <div className="h-1.5 w-16 rounded-full bg-[var(--studio-paper-deep)] overflow-hidden">
        <div
          className={`h-full rounded-full ${bar}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`font-mono tabular-nums text-sm font-medium ${tone}`}>
        {score}%
      </span>
    </div>
  );
}

function EstadoPill({ estado }: { estado: string }) {
  const isActivo = estado === "activo";
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] px-2.5 py-1 rounded-full ${
        isActivo
          ? "bg-[var(--studio-olive)] text-[var(--studio-cream)]"
          : "bg-[var(--studio-paper-deep)] text-[var(--studio-ink-soft)] border border-[var(--studio-rule)]"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isActivo ? "bg-[var(--studio-cream)]" : "bg-[var(--studio-ink-soft)]"
        }`}
      />
      {estado}
    </span>
  );
}
