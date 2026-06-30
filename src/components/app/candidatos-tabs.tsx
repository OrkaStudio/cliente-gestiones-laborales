"use client";

import { type ReactNode, useEffect, useState } from "react";

// Toggle "En la búsqueda / Sugeridos". Ambos contenidos los renderiza el server (la
// gestión de etapas usa server actions); este wrapper sólo alterna cuál se muestra.
export function CandidatosTabs({
  enBusquedaCount,
  sugeridosCount,
  porConfirmar,
  enBusqueda,
  sugeridos,
}: {
  enBusquedaCount: number;
  sugeridosCount: number;
  porConfirmar: number;
  enBusqueda: ReactNode;
  sugeridos: ReactNode;
}) {
  const [tab, setTab] = useState<"enb" | "sug">(enBusquedaCount > 0 ? "enb" : "sug");

  // Para screenshots headless: ?tab=sug / ?tab=enb fuerza la pestaña.
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "sug" || t === "enb") setTab(t);
  }, []);

  const Btn = ({
    id,
    label,
    count,
    amber,
  }: {
    id: "enb" | "sug";
    label: string;
    count: number;
    amber?: boolean;
  }) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition-colors"
      style={
        tab === id
          ? { background: "#fff", color: "var(--gl-ink)", boxShadow: "0 1px 3px rgba(13,17,23,.1)" }
          : { background: "transparent", color: "var(--gl-ink-3)" }
      }
    >
      {label}
      <span
        className="text-[11px] font-bold px-1.5 rounded-full"
        style={
          amber
            ? { background: "var(--gl-amber-bg)", color: "var(--gl-amber)" }
            : tab === id
              ? { background: "var(--gl-olive-bg)", color: "var(--gl-olive)" }
              : { background: "var(--gl-border)", color: "var(--gl-ink-3)" }
        }
      >
        {count}
      </span>
    </button>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div>
          <h2 className="text-[15px] font-bold" style={{ color: "var(--gl-ink)" }}>
            Candidatos
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--gl-ink-3)" }}>
            Los que están en la búsqueda y todos los que matchean
          </p>
        </div>
        <div
          className="inline-flex p-[3px] gap-0.5 rounded-xl"
          style={{ background: "var(--gl-gray-bg)" }}
        >
          <Btn id="enb" label="En la búsqueda" count={enBusquedaCount} />
          <Btn
            id="sug"
            label="Sugeridos"
            count={sugeridosCount}
            amber={tab === "sug" && porConfirmar > 0}
          />
        </div>
      </div>
      <div style={{ display: tab === "enb" ? "block" : "none" }}>{enBusqueda}</div>
      <div style={{ display: tab === "sug" ? "block" : "none" }}>{sugeridos}</div>
    </div>
  );
}
