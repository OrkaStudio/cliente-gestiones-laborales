"use client";

import { Check, Loader2, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CriteriosEditor } from "@/components/app/criterios-editor";
import { useCriterios } from "@/components/app/criterios-provider";

/**
 * "Qué busca esta posición" en la página de la búsqueda. La UI de edición es la misma que
 * la de crear-búsqueda (CriteriosEditor); acá se le suman el contexto (embudo en vivo), el
 * aviso de borrador y el guardado.
 */
export function CriteriosPanel() {
  const { criterios, setCriterios, esBorrador, sucio, guardando, error, guardar, conteos } =
    useCriterios();

  // Feedback breve de "Guardado" cuando termina un autosave (guardando true → false, sin error).
  const [guardadoOk, setGuardadoOk] = useState(false);
  const prevGuardando = useRef(false);
  useEffect(() => {
    if (prevGuardando.current && !guardando && !error) {
      setGuardadoOk(true);
      const t = setTimeout(() => setGuardadoOk(false), 1800);
      prevGuardando.current = guardando;
      return () => clearTimeout(t);
    }
    prevGuardando.current = guardando;
  }, [guardando, error]);

  return (
    <div
      className="rounded-2xl border p-6"
      style={{
        background: "#ffffff",
        borderColor: "var(--gl-border)",
        boxShadow: "0 2px 8px rgba(13,17,23,0.05)",
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h2 className="text-[15px] font-bold" style={{ color: "var(--gl-ink)" }}>
          Qué busca esta posición
        </h2>
        {esBorrador && !sucio ? (
          // Borrador sin tocar: la recruiter lo acepta tal cual con un click explícito.
          <button
            type="button"
            onClick={guardar}
            disabled={guardando}
            className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-60"
            style={{ background: "var(--gl-olive)", color: "#fff" }}
          >
            <Check className="h-3.5 w-3.5" />
            {guardando ? "Guardando…" : "Confirmar"}
          </button>
        ) : guardando || sucio ? (
          <span
            className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-semibold"
            style={{ color: "var(--gl-ink-3)" }}
          >
            <Loader2 className="h-3 w-3 animate-spin" />
            Guardando…
          </span>
        ) : guardadoOk ? (
          <span
            className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-semibold"
            style={{ color: "var(--gl-green)" }}
          >
            <Check className="h-3 w-3" />
            Guardado
          </span>
        ) : null}
      </div>

      {/* Embudo en vivo: lo que cambia al tocar un requisito. */}
      <p className="text-[12px] font-semibold mb-4 px-3 py-2 rounded-xl" style={{ background: "var(--gl-gray-bg)" }}>
        <span style={{ color: "var(--gl-green)" }}>{conteos.green} buen match</span>
        <span style={{ color: "var(--gl-ink-3)" }}> · </span>
        <span style={{ color: "var(--gl-amber)" }}>{conteos.amber} a confirmar</span>
        <span style={{ color: "var(--gl-ink-3)" }}> · </span>
        <span style={{ color: "var(--gl-ink-3)" }}>{conteos.red} no cumple</span>
      </p>

      {esBorrador && (
        <p
          className="mb-4 flex gap-2 text-[12px] leading-relaxed p-3 rounded-xl"
          style={{ background: "var(--gl-amber-bg)", color: "var(--gl-amber)" }}
        >
          <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            <strong>Borrador sugerido.</strong> Lo armamos leyendo el pedido. Revisalo, ajustalo y
            confirmalo — a partir de ahí manda esto.
          </span>
        </p>
      )}

      {error && (
        <p className="mb-3 text-[12px] font-semibold" style={{ color: "var(--gl-red)" }}>
          No se pudo guardar: {error}
        </p>
      )}

      <CriteriosEditor criterios={criterios} setCriterios={setCriterios} />
    </div>
  );
}
