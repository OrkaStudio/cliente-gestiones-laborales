"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Check, Loader2, Sparkles, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

type Step = "input" | "procesando" | "resultado";

const cvCrudoEjemplo = `Joaquin Chebaia
Olavarria, Bs As - 28 anios

Experiencia
2022-actualidad: Estancia La Esperanza - Encargado.
Manejo cria + invernada. 3 peones a cargo.
Pasturas, silaje, sanidad, recorridas diarias.

2018-2022: Cabana San Antonio - Peon general.
Hacienda Aberdeen Angus. Tareas de campo.
Alambrado.

Educacion: Tec. Agropecuario - Esc. Agrotecnica
Olavarria 2014.

Disponible inmediato. Acepto mudarme.
Telefono: 2284-555-0123`;

const fasesProceso = [
  "Leyendo el archivo",
  "Identificando experiencias",
  "Extrayendo datos personales",
  "Generando preguntas",
];

const preguntasIA = [
  {
    pregunta: "¿Cuánta hacienda manejás hoy aproximadamente?",
    razon: "El CV menciona cría + invernada pero no especifica cantidad de cabezas.",
  },
  {
    pregunta: "¿Tenés experiencia con sistemas de gestión (planillas, ERP rural)?",
    razon: "El cliente busca también capacidad administrativa básica para reportes.",
  },
  {
    pregunta: "¿Tu pretensión es bruto o neto? ¿Incluye casa y servicios?",
    razon: "Para alinear con el rango ofrecido por el cliente.",
  },
];

export default function ProcesarPage() {
  const [step, setStep] = useState<Step>("input");
  const [cvText, setCvText] = useState(cvCrudoEjemplo);
  const [phaseIdx, setPhaseIdx] = useState(0);

  useEffect(() => {
    if (step !== "procesando") return;
    setPhaseIdx(0);
    const interval = setInterval(() => {
      setPhaseIdx((p) => Math.min(p + 1, fasesProceso.length - 1));
    }, 480);
    const timeout = setTimeout(() => setStep("resultado"), 2200);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [step]);

  return (
    <div className="px-12 py-14 max-w-3xl">
      <header className="pb-10 border-b agro-rule">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-[var(--agro-ink-soft)]">
          <Sparkles className="h-3.5 w-3.5 text-[var(--agro-olive)]" />
          Asistente IA
        </div>
        <h1 className="font-display text-5xl mt-3 leading-[1]">
          Procesar<br />
          <span className="italic text-[var(--agro-olive)]">un CV</span>.
        </h1>
        <p className="text-sm text-[var(--agro-ink-soft)] mt-4 leading-relaxed">
          Pegá el texto crudo o subí un PDF. La IA extrae los campos y propone
          preguntas para la entrevista.
        </p>
      </header>

      <div className="mt-10">
        {step === "input" ? (
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--agro-ink-soft)] mb-4">
              CV crudo
            </div>
            <textarea
              value={cvText}
              onChange={(e) => setCvText(e.target.value)}
              rows={14}
              className="w-full bg-[rgba(255,253,247,0.5)] border agro-rule p-4 font-mono text-sm leading-relaxed resize-none outline-none focus:border-[var(--agro-olive)] transition-colors"
            />
            <div className="flex items-center justify-between gap-3 mt-4">
              <button className="inline-flex items-center gap-2 px-4 py-2 text-sm border agro-rule text-[var(--agro-ink-soft)] hover:text-[var(--agro-ink)] transition-colors">
                <Upload className="h-4 w-4" />
                Subir PDF / DOCX
              </button>
              <button
                onClick={() => setStep("procesando")}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--agro-ink)] text-[#f5f1e8] px-5 py-2.5 text-sm hover:bg-[var(--agro-olive)] transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Procesar
              </button>
            </div>
          </div>
        ) : null}

        {step === "procesando" ? (
          <div>
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-[var(--agro-ink-soft)] mb-6">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--agro-olive)]" />
              Procesando
              <span className="ml-auto font-mono tabular-nums">
                {phaseIdx + 1} / {fasesProceso.length}
              </span>
            </div>
            <div className="space-y-px">
              {fasesProceso.map((fase, i) => (
                <div
                  key={fase}
                  className={cn(
                    "flex items-center gap-3 py-3 border-t agro-rule text-sm transition-colors",
                    i < phaseIdx && "text-[var(--agro-ink-soft)]",
                    i === phaseIdx && "text-[var(--agro-ink)]",
                    i > phaseIdx && "text-[var(--agro-ink-soft)]/40",
                  )}
                >
                  {i < phaseIdx ? (
                    <Check className="h-4 w-4 text-[var(--agro-olive)]" />
                  ) : i === phaseIdx ? (
                    <Loader2 className="h-4 w-4 text-[var(--agro-olive)] animate-spin" />
                  ) : (
                    <div className="h-4 w-4 grid place-items-center">
                      <div className="h-1.5 w-1.5 rounded-full bg-[var(--agro-ink-soft)]/30" />
                    </div>
                  )}
                  <span>{fase}</span>
                </div>
              ))}
              <div className="border-t agro-rule" />
            </div>
          </div>
        ) : null}

        {step === "resultado" ? (
          <div className="space-y-10">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-[var(--agro-olive)]">
              <Check className="h-3.5 w-3.5" />
              Procesado en 1.8s
              <span className="text-[var(--agro-ink-soft)] mx-1">·</span>
              <span className="text-[var(--agro-ink-soft)]">
                12 campos extraídos · 3 preguntas sugeridas
              </span>
            </div>

            <section>
              <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--agro-ink-soft)] mb-6">
                Datos extraídos
              </div>
              <div className="pb-6 border-b agro-rule">
                <div className="flex items-start gap-6">
                  <div className="h-14 w-14 shrink-0 rounded-full grid place-items-center border agro-rule font-display text-lg">
                    JC
                  </div>
                  <div>
                    <div className="font-display text-3xl leading-tight">Joaquín Chebaia</div>
                    <p className="text-sm text-[var(--agro-ink-soft)] mt-1.5 italic">
                      Encargado de campo · Olavarría, Buenos Aires · 28 años
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-px mt-2">
                {[
                  { label: "Teléfono", value: "+54 9 2284 555-0123" },
                  { label: "Disponibilidad", value: "Inmediata, acepta mudarse" },
                  { label: "Educación", value: "Tec. Agropecuario — Esc. Agrotécnica Olavarría (2014)" },
                  { label: "Idiomas", value: "Español nativo" },
                ].map((f) => (
                  <div
                    key={f.label}
                    className="flex items-baseline justify-between gap-4 py-2.5 border-b agro-rule"
                  >
                    <span className="text-[11px] uppercase tracking-[0.15em] text-[var(--agro-ink-soft)] shrink-0">
                      {f.label}
                    </span>
                    <span className="text-sm text-right">{f.value}</span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--agro-ink-soft)] mb-4">
                Experiencia
              </div>
              <div className="space-y-px">
                {[
                  {
                    rol: "Encargado",
                    empresa: "Estancia La Esperanza",
                    rango: "2022 — actual",
                    detalle: "Cría + invernada. 3 peones a cargo. Pasturas, silaje, sanidad.",
                  },
                  {
                    rol: "Peón general",
                    empresa: "Cabaña San Antonio",
                    rango: "2018 — 2022",
                    detalle: "Hacienda Aberdeen Angus. Alambrado, recorridas.",
                  },
                ].map((job) => (
                  <div key={job.empresa} className="py-5 border-t agro-rule">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-display text-base">{job.rol}</span>
                      <span className="font-mono text-[11px] tabular-nums text-[var(--agro-ink-soft)] shrink-0">
                        {job.rango}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--agro-olive)] mt-0.5 italic">{job.empresa}</p>
                    <p className="text-sm text-[var(--agro-ink-soft)] leading-relaxed mt-2">
                      {job.detalle}
                    </p>
                  </div>
                ))}
                <div className="border-t agro-rule" />
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--agro-ink-soft)]">
                  Preguntas sugeridas por IA
                </div>
                <Sparkles className="h-3.5 w-3.5 text-[var(--agro-olive)]" />
              </div>
              <div className="space-y-px">
                {preguntasIA.map((p, i) => (
                  <div key={p.pregunta} className="py-4 border-t agro-rule">
                    <div className="flex items-baseline gap-4">
                      <span className="font-mono text-[10px] tabular-nums text-[var(--agro-ink-soft)] w-5 shrink-0">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <p className="text-sm">{p.pregunta}</p>
                        <p className="text-xs text-[var(--agro-ink-soft)] leading-relaxed mt-1.5">
                          {p.razon}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="border-t agro-rule" />
              </div>
            </section>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setStep("input")}
                className="text-sm text-[var(--agro-ink-soft)] hover:text-[var(--agro-ink)] transition-colors"
              >
                ← Procesar otro
              </button>
              <Link
                href="/candidatos"
                className="inline-flex items-center gap-2 rounded-full bg-[var(--agro-ink)] text-[#f5f1e8] px-5 py-2.5 text-sm hover:bg-[var(--agro-olive)] transition-colors"
              >
                Guardar en la base
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
