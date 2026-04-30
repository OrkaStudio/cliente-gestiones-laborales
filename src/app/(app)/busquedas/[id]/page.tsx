import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

const estadoLabels: Record<string, string> = {
  preseleccionado: "Preseleccionado",
  entrevista_orka: "Entrevista Orka",
  presentado_cliente: "Presentado",
  entrevista_cliente: "Entrevista",
  ofertado: "Ofertado",
  contratado: "Contratado",
  descartado: "Descartado",
};

export default async function BusquedaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: busqueda }, { data: gestionesData }] = await Promise.all([
    supabase.from("busquedas").select("*").eq("id", id).single(),
    supabase
      .from("gestiones")
      .select("*, candidatos(id, nombre, apellido, ultimo_puesto)")
      .eq("busqueda_id", id),
  ]);

  if (!busqueda) notFound();

  return (
    <div className="px-12 py-14 max-w-5xl">
      <Link
        href="/busquedas"
        className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-[var(--agro-ink-soft)] hover:text-[var(--agro-ink)] mb-10 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Búsquedas
      </Link>

      <header className="pb-10 border-b agro-rule">
        <div className="flex items-start justify-between gap-6">
          <div>
            <span
              className={`text-[10px] uppercase tracking-[0.2em] ${
                busqueda.estado === "activa"
                  ? "text-[var(--agro-olive)]"
                  : "text-[var(--agro-ink-soft)]"
              }`}
            >
              {busqueda.estado}
            </span>
            <h1 className="font-display text-4xl mt-2 leading-tight">{busqueda.puesto}</h1>
            <p className="text-sm text-[var(--agro-ink-soft)] mt-2 italic">
              {busqueda.cliente}
              {busqueda.ubicacion ? ` · ${busqueda.ubicacion}` : ""}
              {` · abierta ${busqueda.fecha_apertura}`}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button className="px-4 py-2 text-sm border agro-rule text-[var(--agro-ink-soft)] hover:text-[var(--agro-ink)] transition-colors">
              Editar
            </button>
            <button className="px-4 py-2 text-sm bg-[var(--agro-ink)] text-[#f5f1e8] hover:bg-[var(--agro-olive)] transition-colors">
              Sumar candidato
            </button>
          </div>
        </div>
      </header>

      <div className="grid gap-16 lg:grid-cols-3 mt-12">
        <div className="lg:col-span-2 space-y-12">
          {busqueda.descripcion ? (
            <section>
              <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--agro-ink-soft)] mb-4">
                Brief
              </div>
              <p className="text-sm leading-relaxed">{busqueda.descripcion}</p>
            </section>
          ) : null}

          {busqueda.requisitos?.length > 0 ? (
            <section>
              <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--agro-ink-soft)] mb-4">
                Requisitos
              </div>
              <div className="space-y-px">
                {busqueda.requisitos.map((r: string, i: number) => (
                  <div key={r} className="flex items-baseline gap-4 py-3 border-t agro-rule">
                    <span className="font-mono text-[10px] tabular-nums text-[var(--agro-ink-soft)] w-5 shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-sm">{r}</span>
                  </div>
                ))}
                <div className="border-t agro-rule" />
              </div>
            </section>
          ) : null}

          <section>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--agro-ink-soft)] mb-4">
              Candidatos en gestión · {gestionesData?.length ?? 0}
            </div>
            <div className="space-y-px">
              {gestionesData?.map(({ id: gId, candidatos: cand, estado, updated_at }) => (
                <div
                  key={gId}
                  className="flex items-center justify-between gap-4 py-4 border-t agro-rule"
                >
                  {cand ? (
                    <Link
                      href={`/candidatos/${cand.id}`}
                      className="flex items-center gap-4 hover:text-[var(--agro-olive)] transition-colors"
                    >
                      <div className="h-9 w-9 shrink-0 rounded-full grid place-items-center border agro-rule font-display text-sm">
                        {cand.nombre[0]}{cand.apellido[0]}
                      </div>
                      <div>
                        <div className="text-sm">{cand.nombre} {cand.apellido}</div>
                        <div className="text-xs text-[var(--agro-ink-soft)] italic mt-0.5">
                          {cand.ultimo_puesto}
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <span>—</span>
                  )}
                  <div className="text-right shrink-0">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--agro-ink-soft)]">
                      {estadoLabels[estado] ?? estado}
                    </div>
                    <div className="font-mono text-[11px] tabular-nums text-[var(--agro-ink-soft)] mt-1">
                      {updated_at.slice(0, 10)}
                    </div>
                  </div>
                </div>
              ))}
              <div className="border-t agro-rule" />
            </div>
          </section>
        </div>

        <div className="space-y-10">
          <section>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--agro-ink-soft)] mb-4">
              Datos
            </div>
            <div className="space-y-px">
              {busqueda.rango_salarial ? (
                <div className="flex items-baseline justify-between gap-3 py-2.5 border-b agro-rule">
                  <span className="text-[11px] uppercase tracking-[0.15em] text-[var(--agro-ink-soft)]">
                    Rango
                  </span>
                  <span className="text-sm">{busqueda.rango_salarial}</span>
                </div>
              ) : null}
              <div className="flex items-baseline justify-between gap-3 py-2.5 border-b agro-rule">
                <span className="text-[11px] uppercase tracking-[0.15em] text-[var(--agro-ink-soft)]">
                  En gestión
                </span>
                <span className="font-display text-2xl tabular-nums text-[var(--agro-olive)]">
                  {gestionesData?.length ?? 0}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-3 py-2.5 border-b agro-rule">
                <span className="text-[11px] uppercase tracking-[0.15em] text-[var(--agro-ink-soft)]">
                  Apertura
                </span>
                <span className="font-mono text-sm tabular-nums">{busqueda.fecha_apertura}</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
