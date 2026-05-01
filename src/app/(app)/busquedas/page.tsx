import Link from "next/link";
import { MapPin, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

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
          <span
            className="text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{ background: "#dafbe1", color: "#1a7f37" }}
          >
            {activas} activas
          </span>
        </div>
      </header>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {busquedas?.map((b) => {
          const days = calcDaysOpen(b.fecha_apertura);
          const count = b.gestiones.length;
          const est = estadoBadge(b.estado);
          const dys = daysBadge(days);

          return (
            <Link key={b.id} href={`/busquedas/${b.id}`} className="gl-card-link p-5 flex flex-col">
              {/* Badges */}
              <div className="flex items-center justify-between mb-4">
                <span
                  className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                  style={est}
                >
                  {est.label}
                </span>
                <span
                  className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                  style={dys}
                >
                  {days}d
                </span>
              </div>

              {/* Title */}
              <div className="flex-1 mb-4">
                <div
                  className="text-[15px] font-bold leading-snug mb-1"
                  style={{ color: "var(--gl-ink)" }}
                >
                  {b.puesto}
                </div>
                <div className="text-[13px] font-medium" style={{ color: "var(--gl-ink-2)" }}>
                  {b.cliente}
                </div>
                {b.ubicacion && (
                  <div
                    className="flex items-center gap-1 mt-1.5 text-xs"
                    style={{ color: "var(--gl-ink-3)" }}
                  >
                    <MapPin className="h-3 w-3 shrink-0" />
                    {b.ubicacion}
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="gl-divider mb-3" />

              {/* Footer */}
              <div className="flex items-center justify-between gap-2">
                <div
                  className="flex items-center gap-1.5 text-[12.5px] font-semibold"
                  style={{ color: count > 0 ? "var(--gl-ink)" : "var(--gl-ink-3)" }}
                >
                  <Users className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--gl-ink-3)" }} />
                  {count === 0 ? "Sin candidatos" : `${count} candidato${count !== 1 ? "s" : ""}`}
                </div>
                {b.rango_salarial && (
                  <span
                    className="text-[11px] font-medium px-2 py-0.5 rounded-lg truncate max-w-[130px]"
                    style={{
                      background: "var(--gl-bg)",
                      border: "1px solid var(--gl-border)",
                      color: "var(--gl-ink-2)",
                    }}
                  >
                    {b.rango_salarial}
                  </span>
                )}
              </div>

              {/* Progress */}
              {count > 0 && (
                <div
                  className="mt-3 h-1 rounded-full overflow-hidden"
                  style={{ background: "var(--gl-border)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min((count / 8) * 100, 100)}%`,
                      background: "var(--gl-olive-mid)",
                    }}
                  />
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
