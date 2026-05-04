import Link from "next/link";
import { Search, MapPin, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CandidatoSheet } from "@/components/app/candidato-sheet";

const AVATAR_HEX = [
  { bg: "#dafbe1", color: "#1a7f37" },
  { bg: "#ddf4ff", color: "#0550ae" },
  { bg: "#ffd8eb", color: "#99286e" },
  { bg: "#fff8c5", color: "#7d4e00" },
  { bg: "#eddeff", color: "#6e40c9" },
];

function estadoBadge(estado: string): { bg: string; color: string } {
  const map: Record<string, { bg: string; color: string }> = {
    activo:   { bg: "#dafbe1", color: "#1a7f37" },
    pausado:  { bg: "#fff8c5", color: "#9a6700" },
    inactivo: { bg: "#f6f8fa", color: "#57606a" },
  };
  return map[estado] ?? { bg: "#f6f8fa", color: "#57606a" };
}

export default async function CandidatosPage() {
  const supabase = await createClient();
  const { data: candidatos } = await supabase
    .from("candidatos")
    .select("*")
    .order("fecha_ingreso", { ascending: false });

  const total = candidatos?.length ?? 0;
  const activos = candidatos?.filter((c) => c.estado === "activo").length ?? 0;

  return (
    <div className="px-8 py-10 max-w-5xl mx-auto">

      {/* Header */}
      <header className="mb-8">
        <p className="gl-eyebrow mb-2">Base de candidatos</p>
        <div className="flex items-center justify-between gap-4">
          <h1
            className="font-display tracking-tight leading-none"
            style={{ fontSize: "clamp(2rem, 4vw, 2.75rem)", color: "var(--gl-ink)" }}
          >
            {total} personas
          </h1>
          <div className="flex items-center gap-3">
            <span
              className="text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{ background: "#dafbe1", color: "#1a7f37" }}
            >
              {activos} activos
            </span>
            <CandidatoSheet />
          </div>
        </div>
      </header>

      {/* Search */}
      <div
        className="flex items-center gap-3 rounded-xl px-4 py-3 mb-7"
        style={{
          background: "var(--gl-surface)",
          border: "1px solid var(--gl-border)",
        }}
      >
        <Search className="h-4 w-4 shrink-0" style={{ color: "var(--gl-ink-3)" }} />
        <input
          placeholder="Buscar por nombre, ubicación o puesto..."
          className="bg-transparent text-[13.5px] flex-1 outline-none"
          style={{ color: "var(--gl-ink)" }}
        />
        <span className="text-xs font-mono shrink-0" style={{ color: "var(--gl-ink-3)" }}>
          {total}
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {candidatos?.map((c, i) => {
          const pal = AVATAR_HEX[i % AVATAR_HEX.length];
          const badge = estadoBadge(c.estado);
          return (
            <Link key={c.id} href={`/candidatos/${c.id}`} className="gl-card-link p-5">
              {/* Header row */}
              <div className="flex items-start gap-3 mb-4">
                <div
                  className="h-10 w-10 rounded-full grid place-items-center text-[13px] font-bold shrink-0"
                  style={{ background: pal.bg, color: pal.color }}
                >
                  {c.nombre[0]}{c.apellido[0]}
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="text-[13.5px] font-bold leading-tight" style={{ color: "var(--gl-ink)" }}>
                    {c.nombre} {c.apellido}
                  </div>
                  <div className="text-[12px] truncate mt-0.5" style={{ color: "var(--gl-ink-3)" }}>
                    {c.ultimo_puesto}
                  </div>
                </div>
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                  style={badge}
                >
                  {c.estado}
                </span>
              </div>

              {/* Divider */}
              <div className="gl-divider mb-3.5" />

              {/* Chips */}
              <div className="flex flex-wrap gap-1.5 mb-3.5 min-h-[1.5rem]">
                {c.ubicacion && (
                  <span
                    className="inline-flex items-center gap-1 text-[11.5px] px-2 py-0.5 rounded-md"
                    style={{ background: "var(--gl-bg)", color: "var(--gl-ink-2)", border: "1px solid var(--gl-border)" }}
                  >
                    <MapPin className="h-3 w-3" />
                    {c.ubicacion}
                  </span>
                )}
                {c.disponibilidad && (
                  <span
                    className="inline-flex items-center gap-1 text-[11.5px] px-2 py-0.5 rounded-md"
                    style={{ background: "var(--gl-bg)", color: "var(--gl-ink-2)", border: "1px solid var(--gl-border)" }}
                  >
                    <Clock className="h-3 w-3" />
                    {c.disponibilidad}
                  </span>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between">
                <div className="flex gap-1 flex-wrap">
                  {c.idiomas?.slice(0, 2).map((lang: string) => (
                    <span
                      key={lang}
                      className="text-[10.5px] font-semibold uppercase px-1.5 py-0.5 rounded"
                      style={{
                        background: "var(--gl-bg)",
                        color: "var(--gl-ink-3)",
                        border: "1px solid var(--gl-border)",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {lang}
                    </span>
                  ))}
                </div>
                <span className="text-[11px] font-mono" style={{ color: "var(--gl-ink-3)" }}>
                  {c.fecha_ingreso}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
