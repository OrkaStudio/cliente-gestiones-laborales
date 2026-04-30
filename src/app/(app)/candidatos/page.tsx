import Link from "next/link";
import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function CandidatosPage() {
  const supabase = await createClient();
  const { data: candidatos } = await supabase
    .from("candidatos")
    .select("*")
    .order("fecha_ingreso", { ascending: false });

  const total = candidatos?.length ?? 0;
  const activos = candidatos?.filter((c) => c.estado === "activo").length ?? 0;

  return (
    <div className="px-12 py-14 max-w-5xl">
      <header className="pb-10 border-b agro-rule">
        <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--agro-ink-soft)]">
          Base de candidatos
        </div>
        <div className="flex items-end justify-between gap-6 mt-3">
          <h1 className="font-display text-5xl leading-[1]">
            <span className="italic">{total}</span> personas
          </h1>
          <div className="text-sm text-[var(--agro-ink-soft)] pb-2">
            <span className="text-[var(--agro-ink)]">{activos}</span> activos
            <span className="mx-2">|</span>
            {total - activos} en pausa
          </div>
        </div>
      </header>

      <div className="mt-8 mb-8 flex items-center gap-3 border-b agro-rule pb-3">
        <Search className="h-4 w-4 text-[var(--agro-ink-soft)]" />
        <input
          placeholder="Buscar por nombre, ubicación, puesto..."
          className="bg-transparent text-sm flex-1 outline-none placeholder:text-[var(--agro-ink-soft)] placeholder:italic"
        />
        <span className="font-mono text-[10px] tabular-nums text-[var(--agro-ink-soft)]">
          {total} resultados
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {candidatos?.map((c) => (
          <Link
            key={c.id}
            href={`/candidatos/${c.id}`}
            className="agro-card p-5 group hover:border-[var(--agro-olive)] transition-all block"
          >
            {/* Nombre + estado */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-10 w-10 shrink-0 rounded-full grid place-items-center border agro-rule font-display text-sm">
                  {c.nombre[0]}{c.apellido[0]}
                </div>
                <div className="min-w-0">
                  <div className="font-display text-base leading-tight group-hover:text-[var(--agro-olive)] transition-colors">
                    {c.nombre} {c.apellido}
                  </div>
                  <div className="text-xs text-[var(--agro-ink-soft)] italic mt-0.5 truncate">
                    {c.ultimo_puesto}
                  </div>
                </div>
              </div>
              <span
                className={`text-[10px] uppercase tracking-[0.18em] shrink-0 mt-0.5 ${
                  c.estado === "activo"
                    ? "text-[var(--agro-olive)]"
                    : "text-[var(--agro-ink-soft)]"
                }`}
              >
                {c.estado}
              </span>
            </div>

            {/* Divider */}
            <div className="my-4 h-px bg-[var(--agro-rule)]" />

            {/* Ubicación + disponibilidad */}
            <div className="space-y-1.5 min-h-[2.5rem]">
              {c.ubicacion ? (
                <div className="text-xs text-[var(--agro-ink-soft)]">{c.ubicacion}</div>
              ) : null}
              {c.disponibilidad ? (
                <div className="text-xs text-[var(--agro-ink)] italic truncate">
                  {c.disponibilidad}
                </div>
              ) : null}
            </div>

            {/* Footer: idiomas + fecha */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-1.5">
                {c.idiomas?.slice(0, 2).map((i: string) => (
                  <span
                    key={i}
                    className="text-[9px] uppercase tracking-[0.18em] border agro-rule px-1.5 py-0.5 text-[var(--agro-ink-soft)]"
                  >
                    {i}
                  </span>
                ))}
              </div>
              <span className="font-mono text-[10px] tabular-nums text-[var(--agro-ink-soft)]">
                {c.fecha_ingreso}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
