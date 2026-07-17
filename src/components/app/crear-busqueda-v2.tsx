"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CriteriosEditor } from "@/components/app/criterios-editor";
import { createBusqueda } from "@/lib/actions/busquedas";
import { guardarCriterios } from "@/lib/actions/criterios";
import { aBusquedaMatch, CRITERIOS_VACIOS, type CriteriosV2 } from "@/lib/v2/criterios";
import { type CandidatoMatch, motivoDe, rankear, type Tier } from "@/lib/v2/matching";

const TIER_LABEL: Record<Tier, string> = {
  green: "Buen match",
  amber: "A confirmar",
  red: "No cumple",
};
const TIER_COLOR: Record<Tier, { bg: string; fg: string }> = {
  green: { bg: "var(--gl-green-bg)", fg: "var(--gl-green)" },
  amber: { bg: "var(--gl-amber-bg)", fg: "var(--gl-amber)" },
  red: { bg: "var(--gl-gray-bg)", fg: "var(--gl-ink-3)" },
};

const CARD = {
  background: "var(--gl-surface)",
  borderColor: "var(--gl-border)",
  boxShadow: "0 2px 8px rgba(13,17,23,0.05)",
} as const;

const INPUT =
  "w-full px-3 py-2 rounded-xl border text-[14px] outline-none focus:border-[var(--gl-olive-mid)]";

/**
 * Crear búsqueda V2. La pantalla que faltaba: hasta acá la recruiter cargaba requisitos en
 * PROSA y el matching tenía que adivinarlos. Ahora carga criterios estructurados
 * (categorías + Obligatorio/Deseable + habilidades del vocabulario) y ve el ranking
 * moverse en vivo mientras los carga — con los candidatos reales.
 */
export function CrearBusquedaV2({
  candidatos,
  preview,
}: {
  candidatos: CandidatoMatch[];
  preview: boolean;
}) {
  const router = useRouter();
  // El pedido SIEMPRE llega como un mensaje (WhatsApp o mail): pegar no es el camino
  // alternativo, es el principal. Por eso la página abre en el paso "entrada" y recién
  // después se transforma en el formulario (ya lleno). "A mano" saltea al form en blanco.
  const [paso, setPaso] = useState<"entrada" | "form">("entrada");
  const [pedido, setPedido] = useState("");
  const [prearmando, setPrearmando] = useState(false);
  const [avisoIA, setAvisoIA] = useState<string | null>(null);

  const [puesto, setPuesto] = useState("");
  const [cliente, setCliente] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [rango, setRango] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [criterios, setCriterios] = useState<CriteriosV2>(CRITERIOS_VACIOS);

  const [creando, setCreando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const busqueda = useMemo(
    () => aBusquedaMatch(criterios, { puesto: puesto || "—", cliente: cliente || null }),
    [criterios, puesto, cliente],
  );
  const ranked = useMemo(() => rankear(candidatos, busqueda), [candidatos, busqueda]);
  const conteos = useMemo(() => {
    const c: Record<Tier, number> = { green: 0, amber: 0, red: 0 };
    for (const r of ranked) c[r.tier]++;
    return c;
  }, [ranked]);

  const listo = puesto.trim() && cliente.trim();

  async function prearmar() {
    if (!pedido.trim()) return;
    setPrearmando(true);
    setAvisoIA(null);
    try {
      const res = await fetch("/api/busquedas/prearmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedido }),
      });
      if (!res.ok) throw new Error("no se pudo leer el pedido");
      const d = await res.json();
      if (d.puesto) setPuesto(d.puesto);
      if (d.cliente) setCliente(d.cliente);
      if (d.ubicacion) setUbicacion(d.ubicacion);
      if (d.rango_salarial) setRango(d.rango_salarial);
      if (d.descripcion) setDescripcion(d.descripcion);
      if (d.criterios) setCriterios(d.criterios);
      const n = d.criterios?.requisitos?.length ?? 0;
      setAvisoIA(
        d.degradado
          ? "No pude leer bien el pedido — te dejé lo que pude deducir. Revisalo."
          : `Leí el pedido y armé ${n} requisito${n === 1 ? "" : "s"}. Revisá y ajustá lo que haga falta.`,
      );
      setPaso("form");
    } catch {
      setAvisoIA("No se pudo leer el pedido. Cargalo a mano.");
    }
    setPrearmando(false);
  }

  async function crear() {
    if (!listo) return;
    setCreando(true);
    setError(null);
    if (preview) {
      setError("Preview local: no se crea la búsqueda en producción.");
      setCreando(false);
      return;
    }
    const res = await createBusqueda({
      puesto,
      cliente,
      ubicacion,
      rango_salarial: rango,
      descripcion,
      estado: "activa",
    });
    if (!res.success) {
      setError(res.error);
      setCreando(false);
      return;
    }
    // Los criterios van aparte: son el modelo V2, no columnas sueltas de V1.
    await guardarCriterios(res.id, criterios);
    router.push(`/busquedas/${res.id}`);
  }

  // ── Paso 1: el pedido. Una sola cosa en pantalla.
  if (paso === "entrada") {
    return (
      <div className="px-10 py-10 min-h-[80vh] flex items-start justify-center">
        <div className="w-full max-w-2xl mt-10">
          <div className="rounded-2xl border p-10 text-center" style={CARD}>
            <div className="gl-eyebrow mb-2" style={{ color: "var(--gl-olive)" }}>
              — Nueva búsqueda
            </div>
            <h1 className="text-[30px] font-bold mb-2" style={{ color: "var(--gl-ink)" }}>
              Empecemos por el pedido
            </h1>
            <p className="text-sm mb-6" style={{ color: "var(--gl-ink-3)" }}>
              Pegá lo que te mandó el cliente y la IA arma la búsqueda. Vos revisás y ajustás.
            </p>

            <textarea
              autoFocus
              value={pedido}
              onChange={(e) => setPedido(e.target.value)}
              rows={6}
              placeholder="Hola! Necesito un encargado de ganadería para una estancia en Entre Ríos, un campo de unas 2.000 hectáreas de cría. Que sepa trabajar a caballo, manga y recorridas. Indispensable que tenga movilidad propia y que resida en el campo con la familia. El sueldo va de $650.000 a $850.000."
              className="w-full text-left px-4 py-3 rounded-xl border text-[14px] outline-none focus:border-[var(--gl-olive-mid)]"
              style={{ borderColor: "var(--gl-border-md)", color: "var(--gl-ink)" }}
            />

            <button
              type="button"
              onClick={prearmar}
              disabled={!pedido.trim() || prearmando}
              className="mt-5 inline-flex items-center gap-2 text-[14px] font-bold px-5 py-3 rounded-xl disabled:opacity-50"
              style={{ background: "var(--gl-olive)", color: "#fff" }}
            >
              <Sparkles className="h-4 w-4" />
              {prearmando ? "Leyendo el pedido…" : "Pre-armar búsqueda con IA"}
            </button>

            <div className="mt-4">
              <button
                type="button"
                onClick={() => setPaso("form")}
                className="text-[13px] font-bold"
                style={{ color: "var(--gl-olive)" }}
              >
                o armá la búsqueda a mano →
              </button>
            </div>

            <p className="mt-4 text-[12px]" style={{ color: "var(--gl-ink-3)" }}>
              La IA solo completa el formulario — no elige candidatos.
            </p>
            {avisoIA && (
              <p className="mt-3 text-[12px] font-semibold" style={{ color: "var(--gl-red)" }}>
                {avisoIA}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Paso 2: el formulario (ya lleno si vino del pedido) + ranking en vivo.
  return (
    <div className="px-10 py-10">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="gl-eyebrow mb-1">Nueva búsqueda</div>
          <h1 className="text-[28px] font-bold" style={{ color: "var(--gl-ink)" }}>
            Crear posición
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--gl-ink-3)" }}>
            Cargá el puesto y lo que buscás — la lista de candidatos se ordena sola a medida que
            escribís.
          </p>
        </div>
        <button
          type="button"
          onClick={crear}
          disabled={!listo || creando}
          className="shrink-0 text-[13px] font-bold px-4 py-2.5 rounded-xl disabled:opacity-50"
          style={{ background: "var(--gl-olive)", color: "#fff" }}
        >
          {creando ? "Creando…" : "Crear búsqueda"}
        </button>
      </div>

      {error && (
        <p className="mb-4 text-[13px] font-semibold" style={{ color: "var(--gl-red)" }}>
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* ── Izquierda: el pedido + el formulario ── */}
        <div className="space-y-5">
          {/* Vino del pedido: aviso fino, con el pedido a un clic (no el cuadro entero otra vez) */}
          {pedido.trim() && (
            <div
              className="rounded-2xl border p-4 flex items-start gap-2.5"
              style={{ background: "var(--gl-olive-bg)", borderColor: "var(--gl-olive-mid)" }}
            >
              <Sparkles className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "var(--gl-olive)" }} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold" style={{ color: "var(--gl-olive)" }}>
                  {avisoIA ?? "Armado a partir del pedido del cliente."}
                </p>
                <button
                  type="button"
                  onClick={() => setPaso("entrada")}
                  className="mt-1 text-[12px] font-bold underline"
                  style={{ color: "var(--gl-olive)" }}
                >
                  ← Ver o cambiar el pedido
                </button>
              </div>
            </div>
          )}

          {/* Posición */}
          <div className="rounded-2xl border p-6" style={CARD}>
            <div className="gl-eyebrow mb-4">Posición</div>
            <div className="grid grid-cols-2 gap-4">
              <label className="text-[11px] font-semibold" style={{ color: "var(--gl-ink-3)" }}>
                <span className="block mb-1.5">NOMBRE DEL PUESTO *</span>
                <input
                  value={puesto}
                  onChange={(e) => setPuesto(e.target.value)}
                  placeholder="Capataz de campo"
                  className={INPUT}
                  style={{ borderColor: "var(--gl-border-md)", color: "var(--gl-ink)" }}
                />
              </label>
              <label className="text-[11px] font-semibold" style={{ color: "var(--gl-ink-3)" }}>
                <span className="block mb-1.5">CLIENTE / EMPLEADOR *</span>
                <input
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  placeholder="Estancia La Esperanza"
                  className={INPUT}
                  style={{ borderColor: "var(--gl-border-md)", color: "var(--gl-ink)" }}
                />
              </label>
              <label className="text-[11px] font-semibold" style={{ color: "var(--gl-ink-3)" }}>
                <span className="block mb-1.5">LUGAR / ZONA</span>
                <input
                  value={ubicacion}
                  onChange={(e) => setUbicacion(e.target.value)}
                  placeholder="Santa Rosa, LP"
                  className={INPUT}
                  style={{ borderColor: "var(--gl-border-md)", color: "var(--gl-ink)" }}
                />
              </label>
              <label className="text-[11px] font-semibold" style={{ color: "var(--gl-ink-3)" }}>
                <span className="block mb-1.5">RANGO SALARIAL</span>
                <input
                  value={rango}
                  onChange={(e) => setRango(e.target.value)}
                  placeholder="$300k – $500k"
                  className={INPUT}
                  style={{ borderColor: "var(--gl-border-md)", color: "var(--gl-ink)" }}
                />
              </label>
            </div>
            <label
              className="block mt-4 text-[11px] font-semibold"
              style={{ color: "var(--gl-ink-3)" }}
            >
              <span className="block mb-1.5">TAREAS Y CONTEXTO (BRIEF)</span>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={4}
                placeholder="Principales responsabilidades, tareas diarias y contexto del establecimiento…"
                className={INPUT}
                style={{ borderColor: "var(--gl-border-md)", color: "var(--gl-ink)" }}
              />
            </label>
          </div>

          {/* Qué buscás en el candidato */}
          <div className="rounded-2xl border p-6" style={CARD}>
            <div className="flex items-center justify-between mb-4">
              <div className="gl-eyebrow">Qué buscás en el candidato</div>
              <span className="text-[11px] text-right" style={{ color: "var(--gl-ink-3)" }}>
                tocá la etiqueta para alternar
                <br />
                Obligatorio ↔ Deseable
              </span>
            </div>
            <CriteriosEditor criterios={criterios} setCriterios={setCriterios} />
          </div>
        </div>

        {/* ── Derecha: candidatos rankeándose en vivo ── */}
        <div className="rounded-2xl border p-6 lg:sticky lg:top-6" style={CARD}>
          <div className="flex items-center justify-between mb-1">
            <div className="gl-eyebrow">Candidatos sugeridos</div>
            <span className="text-[12px]" style={{ color: "var(--gl-ink-3)" }}>
              de {candidatos.length} candidatos
            </span>
          </div>
          <p className="text-[13px] font-semibold mb-4" style={{ color: "var(--gl-ink)" }}>
            <span style={{ color: "var(--gl-green)" }}>{conteos.green} buen match</span>
            {" · "}
            <span style={{ color: "var(--gl-amber)" }}>{conteos.amber} a confirmar</span>
            {" · "}
            <span style={{ color: "var(--gl-ink-3)" }}>{conteos.red} no cumple</span>
          </p>

          {criterios.categorias.length === 0 ? (
            <div
              className="p-4 rounded-xl text-[13px]"
              style={{ background: "var(--gl-olive-bg)", color: "var(--gl-olive)" }}
            >
              👇 Elegí una categoría y te ordeno a quién conviene llamar primero. Por ahora te
              muestro a todos, sin orden de prioridad.
            </div>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto -mx-2 px-2">
              {ranked.slice(0, 40).map((r) => (
                <div
                  key={r.c.id}
                  className="flex items-center gap-3 py-2.5"
                  style={{ borderTop: "1px solid var(--gl-border)" }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-bold truncate" style={{ color: "var(--gl-ink)" }}>
                      {r.c.nombre} {r.c.apellido}
                    </div>
                    <div className="text-[12px] truncate" style={{ color: "var(--gl-ink-3)" }}>
                      {r.c.cats.slice(0, 2).join(", ") || "sin categoría"}
                      {r.c.zona ? ` · ${r.c.zona}` : ""}
                    </div>
                    <div
                      className="text-[12px] truncate"
                      style={{ color: TIER_COLOR[r.tier].fg }}
                    >
                      {motivoDe(r.c, busqueda)}
                    </div>
                  </div>
                  <span
                    className="shrink-0 text-[11px] font-bold px-2 py-1 rounded-full"
                    style={{ background: TIER_COLOR[r.tier].bg, color: TIER_COLOR[r.tier].fg }}
                  >
                    {TIER_LABEL[r.tier]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
