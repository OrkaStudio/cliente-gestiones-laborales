import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

function calcDaysOpen(fecha: string) {
  if (!fecha) return 0;
  return Math.floor((Date.now() - new Date(fecha).getTime()) / 86_400_000);
}

export default async function BusquedasPage() {
  const supabase = await createClient();
  const { data: busquedas } = await supabase
    .from("busquedas")
    .select("*, gestiones(id)")
    .order("fecha_apertura", { ascending: false });

  const total = busquedas?.length ?? 0;
  const activas = busquedas?.filter((b) => b.estado === "activa").length ?? 0;

  return (
    <div className="px-12 py-14 max-w-5xl">
      <header className="pb-10 border-b agro-rule">
        <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--agro-ink-soft)]">
          Búsquedas
        </div>
        <div className="flex items-end justify-between gap-6 mt-3">
          <h1 className="font-display text-5xl leading-[1]">
            <span className="italic">{total}</span> búsquedas
          </h1>
          <div className="text-sm text-[var(--agro-ink-soft)] pb-2">
            <span className="text-[var(--agro-ink)]">{activas}</span> activas
            <span className="mx-2">|</span>
            {total - activas} cerradas
          </div>
        </div>
      </header>

      <div className="mt-10 grid grid-cols-2 gap-3">
        {busquedas?.map((b) => {
          const days = calcDaysOpen(b.fecha_apertura);
          const count = b.gestiones.length;
          const dots = Math.min(count, 10);
          const extra = count > 10 ? count - 10 : 0;

          return (
            <Link
              key={b.id}
              href={`/busquedas/${b.id}`}
              className="agro-card p-5 group hover:border-[var(--agro-olive)] transition-all block"
            >
              {/* Estado + días */}
              <div className="flex items-center justify-between gap-3">
                <span
                  className={`text-[10px] uppercase tracking-[0.2em] ${
                    b.estado === "activa"
                      ? "text-[var(--agro-olive)]"
                      : "text-[var(--agro-ink-soft)]"
                  }`}
                >
                  {b.estado}
                </span>
                <span className="font-mono text-[11px] tabular-nums text-[var(--agro-ink-soft)]">
                  {days}d
                </span>
              </div>

              {/* Puesto */}
              <div className="mt-3">
                <div className="font-display text-xl leading-tight group-hover:text-[var(--agro-olive)] transition-colors">
                  {b.puesto}
                </div>
                <div className="text-xs text-[var(--agro-ink-soft)] italic mt-1.5 truncate">
                  {b.cliente}
                  {b.ubicacion ? ` · ${b.ubicacion}` : ""}
                </div>
              </div>

              {/* Divider */}
              <div className="my-4 h-px bg-[var(--agro-rule)]" />

              {/* Candidatos — dots + count */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1">
                  {Array.from({ length: dots }).map((_, i) => (
                    <div
                      key={i}
                      className="h-2 w-2 rounded-full bg-[var(--agro-olive-soft)]"
                    />
                  ))}
                  {extra > 0 && (
                    <span className="font-mono text-[10px] text-[var(--agro-ink-soft)] ml-1">
                      +{extra}
                    </span>
                  )}
                  {count === 0 && (
                    <span className="text-[10px] text-[var(--agro-ink-soft)] italic">
                      sin candidatos
                    </span>
                  )}
                </div>
                {count > 0 && (
                  <span className="text-[var(--agro-ink-soft)] text-xs">
                    <span className="font-display text-xl text-[var(--agro-olive)]">{count}</span>
                    {" "}cand.
                  </span>
                )}
              </div>

              {/* Rango salarial si existe */}
              {b.rango_salarial ? (
                <div className="mt-3 text-[10px] uppercase tracking-[0.15em] text-[var(--agro-ink-soft)]">
                  {b.rango_salarial}
                </div>
              ) : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
