import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import { candidatos } from "@/lib/mock/data";

export const dynamic = "force-dynamic";

export default function AgroCandidatosPage() {
  const activos = candidatos.filter((c) => c.estado === "activo");

  return (
    <div className="px-12 py-14 max-w-5xl">
      <header className="pb-10 border-b agro-rule">
        <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--agro-ink-soft)]">
          Base de candidatos
        </div>
        <div className="flex items-end justify-between gap-6 mt-3">
          <h1 className="font-display text-5xl leading-[1]">
            <span className="italic">{candidatos.length}</span> personas
          </h1>
          <div className="text-sm text-[var(--agro-ink-soft)] pb-2">
            <span className="text-[var(--agro-ink)]">{activos.length}</span> activos
            <span className="mx-2 text-[var(--agro-rule)]">|</span>
            {candidatos.length - activos.length} en pausa
          </div>
        </div>
      </header>

      {/* Search */}
      <div className="mt-8 mb-2 flex items-center gap-3 border-b agro-rule pb-3">
        <Search className="h-4 w-4 text-[var(--agro-ink-soft)]" />
        <input
          placeholder="Buscar por nombre, ubicación, puesto..."
          className="bg-transparent text-sm flex-1 outline-none placeholder:text-[var(--agro-ink-soft)] placeholder:italic"
        />
        <span className="font-mono text-[10px] tabular-nums text-[var(--agro-ink-soft)]">
          {candidatos.length} resultados
        </span>
      </div>

      {/* Tabla editorial — sin caja, hairline rules */}
      <div className="mt-6">
        <div className="grid grid-cols-[3fr_2fr_2fr_1fr_1fr] gap-6 text-[10px] uppercase tracking-[0.22em] text-[var(--agro-ink-soft)] py-3 border-b agro-rule">
          <span>Persona</span>
          <span>Último puesto</span>
          <span>Ubicación</span>
          <span className="text-right">Match</span>
          <span className="text-right">Estado</span>
        </div>

        {candidatos.map((c, idx) => (
          <Link
            key={c.id}
            href={`/agro/candidatos/${c.id}`}
            className="group grid grid-cols-[3fr_2fr_2fr_1fr_1fr] gap-6 items-center py-5 border-b agro-rule hover:bg-[rgba(255,253,247,0.7)] -mx-3 px-3 transition-colors"
          >
            <div className="flex items-center gap-4">
              <span className="font-mono text-[10px] tabular-nums text-[var(--agro-ink-soft)] w-5 text-right">
                {String(idx + 1).padStart(2, "0")}
              </span>
              <div className="h-10 w-10 shrink-0 rounded-full grid place-items-center border agro-rule font-display text-sm">
                {c.nombre[0]}
                {c.apellido[0]}
              </div>
              <div className="min-w-0">
                <div className="font-display text-base leading-tight group-hover:text-[var(--agro-olive)] transition-colors">
                  {c.nombre} {c.apellido}
                </div>
                <div className="text-xs text-[var(--agro-ink-soft)] mt-0.5 italic truncate">
                  {c.disponibilidad}
                </div>
              </div>
            </div>
            <div className="text-sm text-[var(--agro-ink-soft)]">
              {c.ultimoPuesto}
            </div>
            <div className="text-sm text-[var(--agro-ink-soft)]">
              {c.ubicacion}
            </div>
            <div className="text-right font-mono tabular-nums text-sm">
              {c.matchScore ? (
                <span
                  className={
                    c.matchScore >= 85
                      ? "text-[var(--agro-olive)]"
                      : c.matchScore >= 70
                        ? "text-[var(--agro-ink)]"
                        : "text-[var(--agro-ink-soft)]"
                  }
                >
                  {c.matchScore}%
                </span>
              ) : (
                <span className="text-[var(--agro-ink-soft)]">—</span>
              )}
            </div>
            <div className="text-right">
              <span
                className={`text-[10px] uppercase tracking-[0.18em] ${
                  c.estado === "activo"
                    ? "text-[var(--agro-olive)]"
                    : "text-[var(--agro-ink-soft)]"
                }`}
              >
                {c.estado}
              </span>
              <ArrowUpRight className="inline h-3 w-3 ml-2 text-[var(--agro-ink-soft)] group-hover:text-[var(--agro-olive)] transition-colors" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
