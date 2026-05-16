import Link from "next/link";
import { unstable_cache } from "next/cache";
import { Users, Inbox, MapPin, Shield, Archive, Plus } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";
import { BusquedasTabs } from "@/components/app/busquedas-tabs";

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
  entrevista_orka:    "Entrevista GL",
  presentado_cliente: "Presentado",
  entrevista_cliente: "2ª Entrevista",
  ofertado:           "Ofertado",
  contratado:         "Contratado",
};

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

type BusquedaConGestiones = {
  id: string
  puesto: string
  cliente: string
  estado: string
  ubicacion: string | null
  fecha_apertura: string
  fecha_cierre: string | null
  gestiones: GestionRaw[]
}

const getBusquedas = unstable_cache(
  async () => {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from("busquedas")
      .select("*, gestiones(id, estado)")
      .order("fecha_apertura", { ascending: false })
    return (data ?? []) as BusquedaConGestiones[]
  },
  ["busquedas-list"],
  { revalidate: 60 },
)

function etapasActivas(gestiones: GestionRaw[]) {
  const activas = gestiones.filter((g) => g.estado !== "descartado");
  if (!activas.length) return [];
  const result: { label: string; count: number; isContratado: boolean }[] = [];
  for (let i = STAGE_ORDER.length - 1; i >= 0; i--) {
    const key   = STAGE_ORDER[i];
    const count = activas.filter((g) => g.estado === key).length;
    if (count > 0) {
      result.push({ label: STAGE_LABEL[key], count, isContratado: key === "contratado" });
      if (result.length === 2) break;
    }
  }
  return result;
}

function diasGarantiaRestantes(fecha_cierre: string | null): number | null {
  if (!fecha_cierre) return null;
  const dias = Math.floor((Date.now() - new Date(fecha_cierre).getTime()) / 86_400_000);
  return 90 - dias;
}

export default async function BusquedasPage() {
  const busquedas = await getBusquedas();

  const activas    = busquedas.filter((b) => b.estado === "activa");
  const garantia   = busquedas.filter((b) => b.estado === "cerrada");
  const archivadas = busquedas.filter((b) => b.estado === "archivada");

  // Contar garantías vencidas para badge en tab
  const garantiasVencidas = garantia.filter((b) => {
    const restantes = diasGarantiaRestantes(b.fecha_cierre);
    return restantes !== null && restantes <= 0;
  }).length;

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
            {activas.length} activa{activas.length !== 1 ? "s" : ""}
          </h1>
          <Link
            href="/busquedas/nueva"
            className="gl-btn-primary"
          >
            <Plus style={{ width: 14, height: 14 }} />
            Nueva búsqueda
          </Link>
        </div>
      </header>

      {/* Tabs */}
      <BusquedasTabs
        garantiasVencidas={garantiasVencidas}
        garantiaCount={garantia.length}
        archivadaCount={archivadas.length}
        activasPanel={
          <BusquedasGrid
            busquedas={activas}
            emptyIcon={<Inbox />}
            emptyTitle="Sin búsquedas activas"
            emptyDesc="Creá la primera posición para empezar."
            showDays
          />
        }
        garantiaPanel={
          <GarantiaGrid busquedas={garantia} diasFn={diasGarantiaRestantes} />
        }
        archivadaPanel={
          <BusquedasGrid
            busquedas={archivadas}
            emptyIcon={<Archive />}
            emptyTitle="Sin búsquedas archivadas"
            emptyDesc="Las búsquedas cerradas exitosamente aparecerán acá."
            showDays={false}
          />
        }
      />
    </div>
  );
}

// ── Grid genérico para activas y archivadas ───────────────────────────────────

function BusquedasGrid({
  busquedas,
  emptyIcon,
  emptyTitle,
  emptyDesc,
  showDays,
}: {
  busquedas: BusquedaConGestiones[];
  emptyIcon: React.ReactNode;
  emptyTitle: string;
  emptyDesc: string;
  showDays: boolean;
}) {
  if (busquedas.length === 0) {
    return (
      <div className="flex flex-col items-center text-center py-20">
        <div
          className="h-13 w-13 rounded-full grid place-items-center mb-5"
          style={{ background: "var(--gl-olive-bg)" }}
        >
          <span style={{ color: "var(--gl-olive)" }}>{emptyIcon}</span>
        </div>
        <h3 className="font-display mb-1.5" style={{ fontSize: "1.375rem", color: "var(--gl-ink)" }}>
          {emptyTitle}
        </h3>
        <p className="text-sm" style={{ color: "var(--gl-ink-3)" }}>{emptyDesc}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      {busquedas.map((b) => {
        const days   = calcDaysOpen(b.fecha_apertura);
        const count  = b.gestiones.length;
        const dys    = daysBadge(days);
        const etapas = etapasActivas(b.gestiones as GestionRaw[]);
        const pal    = AVATAR_HEX[b.puesto.charCodeAt(0) % AVATAR_HEX.length];

        return (
          <Link key={b.id} href={`/busquedas/${b.id}`} className="gl-card-link flex flex-col p-5">
            <div className="flex items-start gap-3.5 mb-4">
              <div
                className="h-11 w-11 rounded-xl grid place-items-center text-sm font-bold shrink-0"
                style={{ background: pal.bg, color: pal.color }}
              >
                {b.puesto[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-bold leading-tight" style={{ color: "var(--gl-ink)" }}>
                  {b.puesto}
                </div>
                <div className="text-[12.5px] mt-0.5 truncate" style={{ color: "var(--gl-ink-3)" }}>
                  {b.cliente}
                </div>
                {b.ubicacion && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3 shrink-0" style={{ color: "var(--gl-ink-3)" }} />
                    <span className="text-[11.5px] truncate" style={{ color: "var(--gl-ink-3)" }}>
                      {b.ubicacion}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {etapas.length > 0 ? (
              <div
                className="flex items-center gap-1.5 flex-wrap px-3 py-2 rounded-lg mb-4"
                style={{ background: etapas[0].isContratado ? "#dafbe1" : "var(--gl-olive-bg)" }}
              >
                {etapas.map((e, i) => (
                  <span key={e.label} className="flex items-center gap-1.5">
                    {i > 0 && <span className="text-[10px]" style={{ color: "var(--gl-border)" }}>·</span>}
                    <span className="text-[11px] font-semibold" style={{ color: e.isContratado ? "#1a7f37" : "var(--gl-olive)" }}>
                      {e.label}
                    </span>
                    <span className="text-[11px]" style={{ color: "var(--gl-ink-3)" }}>· {e.count}</span>
                  </span>
                ))}
              </div>
            ) : (
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg mb-4"
                style={{ background: "var(--gl-gray-bg)" }}
              >
                <span className="text-[11px]" style={{ color: "var(--gl-ink-3)" }}>Sin candidatos asignados</span>
              </div>
            )}

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
              {showDays && (
                <span
                  className="text-[10.5px] font-semibold font-mono px-2 py-0.5 rounded-full shrink-0"
                  style={dys}
                >
                  {days}d
                </span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ── Grid de garantía con countdown y dialog ───────────────────────────────────

function GarantiaGrid({
  busquedas,
  diasFn,
}: {
  busquedas: BusquedaConGestiones[];
  diasFn: (fecha_cierre: string | null) => number | null;
}) {
  if (busquedas.length === 0) {
    return (
      <div className="flex flex-col items-center text-center py-20">
        <div
          className="h-13 w-13 rounded-full grid place-items-center mb-5"
          style={{ background: "var(--gl-olive-bg)" }}
        >
          <Shield className="h-6 w-6" style={{ color: "var(--gl-olive)" }} />
        </div>
        <h3 className="font-display mb-1.5" style={{ fontSize: "1.375rem", color: "var(--gl-ink)" }}>
          Sin búsquedas en garantía
        </h3>
        <p className="text-sm" style={{ color: "var(--gl-ink-3)" }}>
          Las búsquedas cerradas aparecen acá durante 90 días.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      {busquedas.map((b) => {
        const restantes = diasFn(b.fecha_cierre);
        const vencida   = restantes !== null && restantes <= 0;
        const pal       = AVATAR_HEX[b.puesto.charCodeAt(0) % AVATAR_HEX.length];
        const count     = b.gestiones.length;

        return (
          <GarantiaCard
            key={b.id}
            busqueda={b}
            pal={pal}
            count={count}
            restantes={restantes}
            vencida={vencida}
          />
        );
      })}
    </div>
  );
}

// Client component para el dialog de garantía
import { GarantiaCard } from "@/components/app/garantia-card";
