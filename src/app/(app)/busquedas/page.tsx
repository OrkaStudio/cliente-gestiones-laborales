import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

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

      <div className="mt-8">
        <div className="grid grid-cols-[3fr_2fr_2fr_1fr] gap-6 text-[10px] uppercase tracking-[0.22em] text-[var(--agro-ink-soft)] py-3 border-b agro-rule">
          <span>Puesto</span>
          <span>Cliente</span>
          <span>Ubicación</span>
          <span className="text-right">Candidatos</span>
        </div>

        {busquedas?.map((b) => (
          <Link
            key={b.id}
            href={`/busquedas/${b.id}`}
            className="group grid grid-cols-[3fr_2fr_2fr_1fr] gap-6 items-center py-5 border-b agro-rule hover:bg-[rgba(255,253,247,0.7)] -mx-3 px-3 transition-colors"
          >
            <div>
              <div className="font-display text-base group-hover:text-[var(--agro-olive)] transition-colors">
                {b.puesto}
              </div>
              <div
                className={`text-[10px] uppercase tracking-[0.18em] mt-1 ${
                  b.estado === "activa"
                    ? "text-[var(--agro-olive)]"
                    : "text-[var(--agro-ink-soft)]"
                }`}
              >
                {b.estado}
              </div>
            </div>
            <div className="text-sm text-[var(--agro-ink-soft)] italic">{b.cliente}</div>
            <div className="text-sm text-[var(--agro-ink-soft)]">{b.ubicacion ?? "—"}</div>
            <div className="flex items-center justify-end gap-2">
              <span className="font-display text-2xl tabular-nums text-[var(--agro-olive)]">
                {b.gestiones.length}
              </span>
              <ArrowUpRight className="h-4 w-4 text-[var(--agro-ink-soft)] group-hover:text-[var(--agro-olive)] transition-colors" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
