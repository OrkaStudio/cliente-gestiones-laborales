import Link from "next/link";
import { Search, Users } from "lucide-react";
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
      <header className="mb-6">
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

      {/* Search — discreta, no protagonista */}
      <div
        className="flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 mb-7"
        style={{
          background: "var(--gl-surface)",
          border: "1px solid var(--gl-border)",
          maxWidth: "360px",
        }}
      >
        <Search className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--gl-ink-3)" }} />
        <input
          placeholder="Buscar candidato..."
          className="bg-transparent text-[13px] flex-1 outline-none"
          style={{ color: "var(--gl-ink)" }}
        />
      </div>

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
              gap: "0",
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
              <Users style={{ width: 22, height: 22, color: "var(--gl-olive)" }} />
            </div>
            <h3
              className="font-display"
              style={{ fontSize: "1.375rem", color: "var(--gl-ink)", marginBottom: "0.375rem" }}
            >
              Sin candidatos todavía
            </h3>
            <p style={{ fontSize: "13.5px", color: "var(--gl-ink-3)", marginBottom: "1.75rem" }}>
              Agregá el primero para empezar a gestionar la base.
            </p>
            <CandidatoSheet />
          </div>
        )}

        {candidatos?.map((c, i) => {
          const pal = AVATAR_HEX[i % AVATAR_HEX.length];
          const badge = estadoBadge(c.estado);
          const mes = c.fecha_ingreso?.substring(0, 7) ?? "";

          return (
            <Link key={c.id} href={`/candidatos/${c.id}`} className="gl-card-link p-5">

              {/* Nombre + avatar + estado */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="h-9 w-9 rounded-full grid place-items-center text-[12px] font-bold shrink-0"
                  style={{ background: pal.bg, color: pal.color }}
                >
                  {c.nombre[0]}{c.apellido[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="text-[13.5px] font-bold leading-tight truncate"
                    style={{ color: "var(--gl-ink)" }}
                  >
                    {c.nombre} {c.apellido}
                  </div>
                  {c.ultimo_puesto && (
                    <div
                      className="text-[12px] truncate mt-0.5"
                      style={{ color: "var(--gl-ink-3)" }}
                    >
                      {c.ultimo_puesto}
                    </div>
                  )}
                </div>
                <span
                  className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                  style={badge}
                >
                  {c.estado}
                </span>
              </div>

              {/* Footer: idiomas + fecha */}
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  {c.idiomas?.slice(0, 2).map((lang: string) => (
                    <span
                      key={lang}
                      style={{
                        fontSize: "11px",
                        padding: "0.125rem 0.5rem",
                        borderRadius: "0.375rem",
                        background: "var(--gl-olive-bg)",
                        color: "var(--gl-olive)",
                      }}
                    >
                      {lang}
                    </span>
                  ))}
                </div>
                {mes && (
                  <span
                    className="font-mono text-[11px]"
                    style={{ color: "var(--gl-ink-3)" }}
                  >
                    {mes}
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
