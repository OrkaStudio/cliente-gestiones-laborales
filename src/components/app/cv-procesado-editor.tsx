"use client";

import { useTransition, useState } from "react";
import { updateCVProcesado } from "@/lib/actions/candidatos";

export function CVProcesadoEditor({
  candidatoId,
  initialTexto,
}: {
  candidatoId: string;
  initialTexto: string | null;
}) {
  const [texto, setTexto] = useState(initialTexto ?? "");
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSave() {
    startTransition(async () => {
      await updateCVProcesado(candidatoId, texto);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div className="space-y-3">
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={24}
        placeholder="Pendiente de procesar — el CV procesado aparecerá aquí después del primer parseo."
        className="w-full font-mono text-sm leading-relaxed bg-transparent border agro-rule p-4 resize-y
                   text-[var(--agro-ink)] placeholder:text-[var(--agro-ink-soft)]/50
                   focus:outline-none focus:border-[var(--agro-olive)] transition-colors"
      />
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.15em] text-[var(--agro-ink-soft)]">
          Generado por IA · editable por Oriana
        </span>
        <button
          onClick={handleSave}
          disabled={isPending}
          className="px-4 py-1.5 text-xs uppercase tracking-[0.15em] border agro-rule
                     text-[var(--agro-ink-soft)] hover:text-[var(--agro-ink)]
                     disabled:opacity-40 transition-colors"
        >
          {isPending ? "Guardando…" : saved ? "Guardado ✓" : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}
