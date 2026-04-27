"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Check, Loader2, Sparkles, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
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
    pregunta: "Cuanta hacienda manejas hoy aproximadamente?",
    razon: "El CV menciona cria + invernada pero no especifica cantidad de cabezas.",
  },
  {
    pregunta: "Tenes experiencia con sistemas de gestion (planillas, ERP rural)?",
    razon: "El cliente busca tambien capacidad administrativa basica para reportes.",
  },
  {
    pregunta: "Tu pretension es bruto o neto? Incluye casa y servicios?",
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
    <div className="mx-auto max-w-4xl px-8 py-8">
      <div className="mb-8">
        <Badge variant="secondary" className="gap-1.5">
          <Sparkles className="h-3 w-3 text-primary" />
          Asistente IA
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight mt-3">Procesar un CV</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Pega el texto crudo o sube un PDF. La IA extrae los campos y propone preguntas
          para la entrevista.
        </p>
      </div>

      {step === "input" ? (
        <Card>
          <CardHeader>
            <CardTitle>CV crudo</CardTitle>
            <CardDescription>Pega el texto del CV o sube el archivo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={cvText}
              onChange={(e) => setCvText(e.target.value)}
              rows={14}
              className="font-mono text-sm leading-relaxed resize-none"
            />
            <div className="flex items-center justify-between gap-3">
              <Button variant="outline" className="gap-2">
                <Upload className="h-4 w-4" />
                Subir PDF / DOCX
              </Button>
              <Button onClick={() => setStep("procesando")} className="gap-2">
                <Sparkles className="h-4 w-4" />
                Procesar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === "procesando" ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <CardTitle className="text-base">Procesando...</CardTitle>
              <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                {phaseIdx + 1} / {fasesProceso.length}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5">
              {fasesProceso.map((fase, i) => (
                <li
                  key={fase}
                  className={cn(
                    "flex items-center gap-2.5 text-sm transition-colors",
                    i < phaseIdx && "text-muted-foreground",
                    i === phaseIdx && "text-foreground",
                    i > phaseIdx && "text-muted-foreground/40",
                  )}
                >
                  {i < phaseIdx ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : i === phaseIdx ? (
                    <Loader2 className="h-4 w-4 text-primary animate-spin" />
                  ) : (
                    <div className="h-4 w-4 grid place-items-center">
                      <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                    </div>
                  )}
                  <span>{fase}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {step === "resultado" ? (
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-sm text-primary">
            <Check className="h-4 w-4" />
            <span>Procesado en 1.8s</span>
            <span className="text-muted-foreground/60 mx-1">·</span>
            <span className="text-muted-foreground">
              12 campos extraidos · 3 preguntas sugeridas
            </span>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-base font-semibold">
                  JC
                </div>
                <div>
                  <CardTitle>Joaquin Chebaia</CardTitle>
                  <CardDescription>
                    Encargado de campo · Olavarria, Buenos Aires · 28 anos
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <Field label="Telefono" value="+54 9 2284 555-0123" />
                <Field label="Disponibilidad" value="Inmediata, acepta mudarse" />
                <Field
                  label="Educacion"
                  value="Tec. Agropecuario — Esc. Agrotecnica Olavarria (2014)"
                />
                <Field label="Idiomas" value="Espanol nativo" />
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="text-sm font-medium">Experiencia</div>
                <div className="space-y-3">
                  <Job
                    rol="Encargado"
                    empresa="Estancia La Esperanza"
                    rango="2022 — actual"
                    detalle="Cria + invernada. 3 peones a cargo. Pasturas, silaje, sanidad."
                  />
                  <Job
                    rol="Peon general"
                    empresa="Cabana San Antonio"
                    rango="2018 — 2022"
                    detalle="Hacienda Aberdeen Angus. Alambrado, recorridas."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Preguntas para la entrevista</CardTitle>
                <Badge variant="secondary" className="gap-1.5">
                  <Sparkles className="h-3 w-3 text-primary" />
                  sugeridas por IA
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ol className="divide-y">
                {preguntasIA.map((p, i) => (
                  <li key={p.pregunta} className="py-3 first:pt-0 last:pb-0 space-y-1">
                    <div className="flex items-baseline gap-3">
                      <span className="text-xs text-muted-foreground tabular-nums w-5">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <p className="text-sm flex-1">{p.pregunta}</p>
                    </div>
                    <p className="text-xs text-muted-foreground pl-8 leading-relaxed">
                      {p.razon}
                    </p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStep("input")}>
              ← Procesar otro
            </Button>
            <Link href="/candidatos">
              <Button className="gap-2">
                Guardar en la base
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}

function Job({
  rol,
  empresa,
  rango,
  detalle,
}: {
  rol: string;
  empresa: string;
  rango: string;
  detalle: string;
}) {
  return (
    <div className="rounded-md border p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">{rol}</span>
        <span className="text-xs text-muted-foreground tabular-nums">{rango}</span>
      </div>
      <p className="text-sm text-primary mt-0.5">{empresa}</p>
      <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{detalle}</p>
    </div>
  );
}
