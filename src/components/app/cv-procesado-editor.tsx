"use client";

import { useTransition, useState } from "react";
import { Download } from "lucide-react";
import { updateCVProcesado } from "@/lib/actions/candidatos";

export function CVProcesadoEditor({
  candidatoId,
  initialTexto,
}: {
  candidatoId: string
  initialTexto: string | null
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
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] uppercase tracking-[0.15em] text-[var(--agro-ink-soft)]">
          Generado por IA · editable por Oriana
        </span>
        <div className="flex items-center gap-2">
          {initialTexto && (
            <a
              href={`/api/cv/${candidatoId}/pdf`}
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs uppercase tracking-[0.15em] border
                         rounded-md border-[var(--gl-olive)] text-[var(--gl-olive)] hover:bg-[var(--gl-olive-bg)]
                         transition-colors"
            >
              <Download className="h-3 w-3" />
              Descargar PDF
            </a>
          )}
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
    </div>
  );
}
