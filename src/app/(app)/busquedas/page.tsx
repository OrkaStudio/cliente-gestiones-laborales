import Link from "next/link";
import { Users, Inbox, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BusquedaSheet } from "@/components/app/busqueda-sheet";

const AVATAR_HEX = [
  { bg: "#dafbe1", color: "#1a7f37" },
  { bg: "#ddf4ff", color: "#0550ae" },
  { bg: "#ffd8eb", color: "#99286e" },
  { bg: "#fff8c5", color: "#7d4e00" },
  { bg: "#eddeff", color: "#6e40c9" },
];

const STAGE_ORDER = [
  "preseleccionado", "entrevista_orka", "presentado_cliente",
  "entrevista_cliente", "ofertado", "contratado",
];

const STAGE_LABEL: Record<string, string> = {
  preseleccionado:    "Preseleccionado",
  entrevista_orka:    "Entrevista Orka",
  presentado_cliente: "Presentado",
  entrevista_cliente: "2ª Entrevista",
  ofertado:           "Ofertado",
  contratado:         "Contratado",
};

function estadoBadge(estado: string): { bg: string; color: string; label: string } {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    activa:  { bg: "#dafbe1", color: "#1a7f37",  label: "Activa"  },
    cerrada: { bg: "#f6f8fa", color: "#57606a",  label: "Cerrada" },
    pausada: { bg: "#fff8c5", color: "#9a6700",  label: "Pausada" },
  };
  return map[estado] ?? { bg: "#f6f8fa", color: "#57606a", label: estado };
}

function daysBadge(days: number): { bg: string; color: string } {
  if (days <= 14) return { bg: "#dafbe1", color: "#1a7f37" };
  if (days <= 30) return { bg: "#fff8c5", color: "#9a6700" };
  return { bg: "#ffebe9", color: "#cf222e" };
}

function calcDaysOpen(fecha: string) {
  if (!fecha) return 0;
  return Math.floor((Date.now() - new Date(fecha).getTime()) / 86_400_000);
}

type GestionRaw = { estado: string };

function mejorEtapa(gestiones: GestionRaw[]) {
  const conContratado = gestiones.filter((g) => g.estado === "contratado");
  if (conContratado.length > 0) {
    return { label: "Contratado", count: conContratado.length, isContratado: true };
  }
  const activas = gestiones.filter((g) => g.estado !== "descartado");
  if (!activas.length) return null;
  for (let i = STAGE_ORDER.length - 1; i >= 0; i--) {
    const key   = STAGE_ORDER[i];
    const count = activas.filter((g) => g.estado === key).length;
    if (count > 0) return { label: STAGE_LABEL[key], count, isContratado: false };
  }
  return null;
}

export default async function BusquedasPage() {
  const supabase = await createClient();
  const { data: busquedas } = await supabase
    .from("busquedas")
    .select("*, gestiones(id, estado)")
    .order("fecha_apertura", { ascending: false });

  const total  = busquedas?.length ?? 0;
  const activas = busquedas?.filter((b) => b.estado === "activa").length ?? 0;

  return (
    <div className="px-10 py-10">

      {/* Header */}
      <header className="mb-8">
        <p className="gl-eyebrow mb-2">Búsquedas</p>
        <div className="flex items-center justify-between gap-4">
          <h1
            className="font-display tracking-tight leading-none"
            style={{ fontSize: "clamp(2rem, 4vw, 2.75rem)", color: "var(--gl-ink)" }}
          >
            {total} búsqueda{total !== 1 ? "s" : ""}
          </h1>
          <div className="flex items-center gap-3">
            <span
              className="text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{ background: "#dafbe1", color: "#1a7f37" }}
            >
              {activas} activa{activas !== 1 ? "s" : ""}
            </span>
            <BusquedaSheet />
          </div>
        </div>
      </header>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">

        {/* Empty state */}
        {total === 0 && (
          <div
            className="flex flex-col items-center text-center py-20"
            style={{ gridColumn: "1 / -1" }}
          >
            <div
              className="h-13 w-13 rounded-full grid place-items-center mb-5"
              style={{ background: "var(--gl-olive-bg)" }}
            >
              <Inbox className="h-6 w-6" style={{ color: "var(--gl-olive)" }} />
            </div>
            <h3
              className="font-display mb-1.5"
              style={{ fontSize: "1.375rem", color: "var(--gl-ink)" }}
            >
              Sin búsquedas abiertas
            </h3>
            <p className="text-sm mb-6" style={{ color: "var(--gl-ink-3)" }}>
              Creá la primera posición para empezar a sumar candidatos.
            </p>
            <BusquedaSheet />
          </div>
        )}

        {busquedas?.map((b, i) => {
          const days  = calcDaysOpen(b.fecha_apertura);
          const count = b.gestiones.length;
          const est   = estadoBadge(b.estado);
          const dys   = daysBadge(days);
          const etapa = mejorEtapa(b.gestiones as GestionRaw[]);
          const pal   = AVATAR_HEX[b.puesto.charCodeAt(0) % AVATAR_HEX.length];

          return (
            <Link key={b.id} href={`/busquedas/${b.id}`} className="gl-card-link flex flex-col p-5">

              {/* ── Top: ícono cuadrado + info + estado ── */}
              <div className="flex items-start gap-3.5 mb-4">
                {/* Square icon — distingue posición de persona (círculo) */}
                <div
                  className="h-11 w-11 rounded-xl grid place-items-center text-sm font-bold shrink-0"
                  style={{ background: pal.bg, color: pal.color }}
                >
                  {b.puesto[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="text-[14px] font-bold leading-tight"
                    style={{ color: "var(--gl-ink)" }}
                  >
                    {b.puesto}
                  </div>
                  <div
                    className="text-[12.5px] mt-0.5 truncate"
                    style={{ color: "var(--gl-ink-3)" }}
                  >
                    {b.cliente}
                  </div>
                  {b.ubicacion && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 shrink-0" style={{ color: "var(--gl-ink-3)" }} />
                      <span
                        className="text-[11.5px] truncate"
                        style={{ color: "var(--gl-ink-3)" }}
                      >
                        {b.ubicacion}
                      </span>
                    </div>
                  )}
                </div>
                <span
                  className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                  style={est}
                >
                  {est.label}
                </span>
              </div>

              {/* ── Etapa activa chip (espeja gestión activa de candidatos) ── */}
              {etapa ? (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg mb-4"
                  style={{
                    background: etapa.isContratado ? "#dafbe1" : "var(--gl-olive-bg)",
                  }}
                >
                  <span
                    className="text-[11px] font-semibold shrink-0"
                    style={{ color: etapa.isContratado ? "#1a7f37" : "var(--gl-olive)" }}
                  >
                    {etapa.label}
                  </span>
                  <span className="text-[11px]" style={{ color: "var(--gl-ink-3)" }}>·</span>
                  <span className="text-[11px]" style={{ color: "var(--gl-ink-3)" }}>
                    {etapa.count} candidato{etapa.count !== 1 ? "s" : ""}
                  </span>
                </div>
              ) : (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg mb-4"
                  style={{ background: "var(--gl-gray-bg)" }}
                >
                  <span className="text-[11px]" style={{ color: "var(--gl-ink-3)" }}>
                    Sin candidatos asignados
                  </span>
                </div>
              )}

              {/* ── Footer: total candidatos + rango + días ── */}
              <div
                className="flex items-center justify-between gap-2 pt-3 mt-auto"
                style={{ borderTop: "1px solid var(--gl-border)" }}
              >
                <div
                  className="flex items-center gap-1.5 text-[12px] min-w-0"
                  style={{ color: count > 0 ? "var(--gl-olive)" : "var(--gl-ink-3)" }}
                >
                  <Users className="h-3 w-3 shrink-0" />
                  <span className="truncate">
                    {count === 0 ? "Sin candidatos" : `${count} candidato${count !== 1 ? "s" : ""}`}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {b.rango_salarial && (
                    <span
                      className="text-[11px] font-mono truncate"
                      style={{ color: "var(--gl-ink-3)", maxWidth: "9rem" }}
                    >
                      {b.rango_salarial}
                    </span>
                  )}
                  <span
                    className="text-[10.5px] font-semibold font-mono px-2 py-0.5 rounded-full shrink-0"
                    style={dys}
                  >
                    {days}d
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
