import Link from "next/link";
import { Users, Inbox } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BusquedaSheet } from "@/components/app/busqueda-sheet";

function calcDaysOpen(fecha: string) {
  if (!fecha) return 0;
  return Math.floor((Date.now() - new Date(fecha).getTime()) / 86_400_000);
}

function estadoBadge(estado: string): { bg: string; color: string; label: string } {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    activa:  { bg: "#dafbe1", color: "#1a7f37", label: "Activa" },
    cerrada: { bg: "#f6f8fa", color: "#57606a", label: "Cerrada" },
    pausada: { bg: "#fff8c5", color: "#9a6700", label: "Pausada" },
  };
  return map[estado] ?? { bg: "#f6f8fa", color: "#57606a", label: estado };
}

function daysBadge(days: number): { bg: string; color: string } {
  if (days <= 14) return { bg: "#dafbe1", color: "#1a7f37" };
  if (days <= 30) return { bg: "#fff8c5", color: "#9a6700" };
  return { bg: "#ffebe9", color: "#cf222e" };
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
    <div className="px-8 py-10 max-w-5xl mx-auto">

      {/* Header */}
      <header className="mb-8">
        <p className="gl-eyebrow mb-2">Búsquedas</p>
        <div className="flex items-center justify-between gap-4">
          <h1
            className="font-display tracking-tight leading-none"
            style={{ fontSize: "clamp(2rem, 4vw, 2.75rem)", color: "var(--gl-ink)" }}
          >
            {total} búsquedas
          </h1>
          <div className="flex items-center gap-3">
            <span
              className="text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{ background: "#dafbe1", color: "#1a7f37" }}
            >
              {activas} activas
            </span>
            <BusquedaSheet />
          </div>
        </div>
      </header>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">

        {/* Empty state */}
        {total === 0 && (
          <div
            style={{
              gridColumn: "1 / -1",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "5rem 1rem",
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "var(--gl-olive-bg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1.25rem",
              }}
            >
              <Inbox style={{ width: 22, height: 22, color: "var(--gl-olive)" }} />
            </div>
            <h3
              className="font-display"
              style={{ fontSize: "1.375rem", color: "var(--gl-ink)", marginBottom: "0.375rem" }}
            >
              Sin búsquedas abiertas
            </h3>
            <p style={{ fontSize: "13.5px", color: "var(--gl-ink-3)", marginBottom: "1.75rem" }}>
              Creá la primera posición para empezar a sumar candidatos.
            </p>
            <BusquedaSheet />
          </div>
        )}

        {busquedas?.map((b) => {
          const days = calcDaysOpen(b.fecha_apertura);
          const count = b.gestiones.length;
          const est = estadoBadge(b.estado);
          const dys = daysBadge(days);

          return (
            <Link key={b.id} href={`/busquedas/${b.id}`} className="gl-card-link p-5 flex flex-col">

              {/* Estado + días */}
              <div className="flex items-center justify-between mb-4">
                <span
                  className="text-[10.5px] font-semibold px-2.5 py-0.5 rounded-full"
                  style={est}
                >
                  {est.label}
                </span>
                <span
                  className="text-[10.5px] font-semibold px-2.5 py-0.5 rounded-full font-mono"
                  style={dys}
                >
                  {days}d
                </span>
              </div>

              {/* Puesto + cliente */}
              <div className="flex-1 mb-5">
                <div
                  className="font-display leading-snug"
                  style={{ fontSize: "1.1rem", color: "var(--gl-ink)", letterSpacing: "-0.02em" }}
                >
                  {b.puesto}
                </div>
                <div
                  className="text-[12.5px] mt-1"
                  style={{ color: "var(--gl-ink-3)" }}
                >
                  {b.cliente}
                  {b.ubicacion ? ` · ${b.ubicacion}` : ""}
                </div>
              </div>

              {/* Footer: candidatos */}
              <div className="flex items-center justify-between">
                <div
                  className="flex items-center gap-1.5 text-[12px]"
                  style={{ color: count > 0 ? "var(--gl-olive)" : "var(--gl-ink-3)" }}
                >
                  <Users className="h-3 w-3 shrink-0" />
                  {count === 0
                    ? "Sin candidatos"
                    : `${count} candidato${count !== 1 ? "s" : ""}`}
                </div>
                {b.rango_salarial && (
                  <span
                    className="text-[11px] font-mono"
                    style={{ color: "var(--gl-ink-3)" }}
                  >
                    {b.rango_salarial}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
