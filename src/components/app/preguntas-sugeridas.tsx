"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function PreguntasSugeridas({ preguntas }: { preguntas: string[] }) {
  const [copiado, setCopiado] = useState<number | "all" | null>(null);

  function copiar(texto: string, key: number | "all") {
    navigator.clipboard.writeText(texto);
    setCopiado(key);
    setTimeout(() => setCopiado(null), 1500);
  }

  if (preguntas.length === 0) {
    return (
      <p className="text-sm text-[var(--agro-ink-soft)] italic">
        Pendiente — se generarán al procesar el CV.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-px">
        {preguntas.map((p, i) => (
          <div
            key={i}
            className="flex items-start gap-3 py-3 border-b agro-rule group"
          >
            <span className="font-mono text-[10px] tabular-nums text-[var(--agro-ink-soft)] shrink-0 mt-0.5">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="text-sm leading-relaxed flex-1">{p}</span>
            <button
              onClick={() => copiar(p, i)}
              className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1"
              title="Copiar"
            >
              {copiado === i ? (
                <Check className="h-3.5 w-3.5 text-[var(--agro-olive)]" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-[var(--agro-ink-soft)]" />
              )}
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-1">
        <span className="text-[10px] uppercase tracking-[0.15em] text-[var(--agro-ink-soft)]">
          Generadas por IA · revisar antes de enviar
        </span>
        <button
          onClick={() => copiar(preguntas.join("\n\n"), "all")}
          className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em]
                     text-[var(--agro-ink-soft)] hover:text-[var(--agro-ink)] transition-colors"
        >
          {copiado === "all" ? (
            <Check className="h-3 w-3 text-[var(--agro-olive)]" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
          Copiar todas
        </button>
      </div>
    </div>
  );
}
