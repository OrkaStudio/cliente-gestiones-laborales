"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { guardarCriterios } from "@/lib/actions/criterios";
import { aBusquedaMatch, type CriteriosV2 } from "@/lib/v2/criterios";
import type { BusquedaMatch, CandidatoMatch, Tier } from "@/lib/v2/matching";
import { rankear } from "@/lib/v2/matching";

export type RowV2 = { c: CandidatoMatch; tier: Tier; score: number };

type Ctx = {
  criterios: CriteriosV2;
  setCriterios: (c: CriteriosV2) => void;
  /** true = todavía nadie confirmó estos criterios; salieron derivados del brief. */
  esBorrador: boolean;
  sucio: boolean;
  guardando: boolean;
  error: string | null;
  guardar: () => Promise<void>;
  busqueda: BusquedaMatch;
  ranked: RowV2[];
  conteos: Record<Tier, number>;
  /** En el preview local no se escribe en prod. */
  preview: boolean;
};

const CriteriosCtx = createContext<Ctx | null>(null);

export function useCriterios(): Ctx {
  const ctx = useContext(CriteriosCtx);
  if (!ctx) throw new Error("useCriterios fuera del CriteriosProvider");
  return ctx;
}

/**
 * Estado compartido de los criterios de la búsqueda.
 *
 * El ranking se calcula ACÁ, en el cliente: así, cuando la recruiter sube una habilidad de
 * Deseable a Obligatorio, el embudo y la lista se recalculan al instante (sin ida y vuelta
 * al server). Guardar es un paso aparte y explícito.
 */
export function CriteriosProvider({
  busquedaId,
  puesto,
  cliente,
  criteriosIniciales,
  esBorrador,
  candidatos,
  preview,
  children,
}: {
  busquedaId: string;
  puesto: string;
  cliente: string | null;
  criteriosIniciales: CriteriosV2;
  esBorrador: boolean;
  candidatos: CandidatoMatch[];
  preview: boolean;
  children: ReactNode;
}) {
  const [criterios, setCriteriosState] = useState<CriteriosV2>(criteriosIniciales);
  const [sucio, setSucio] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [borrador, setBorrador] = useState(esBorrador);

  const setCriterios = useCallback((c: CriteriosV2) => {
    setCriteriosState(c);
    setSucio(true);
  }, []);

  const busqueda = useMemo(
    () => aBusquedaMatch(criterios, { puesto, cliente }),
    [criterios, puesto, cliente],
  );

  const ranked = useMemo(
    () => rankear(candidatos, busqueda).map((r) => ({ c: r.c, tier: r.tier, score: r.score.s })),
    [candidatos, busqueda],
  );

  const conteos = useMemo(() => {
    const c: Record<Tier, number> = { green: 0, amber: 0, red: 0 };
    for (const r of ranked) c[r.tier]++;
    return c;
  }, [ranked]);

  const guardar = useCallback(async () => {
    setGuardando(true);
    setError(null);
    if (preview) {
      // Preview local: no escribimos en la base de producción.
      await new Promise((r) => setTimeout(r, 300));
      setSucio(false);
      setBorrador(false);
      setGuardando(false);
      return;
    }
    const res = await guardarCriterios(busquedaId, criterios);
    if (res.success) {
      setSucio(false);
      setBorrador(false);
    } else {
      setError(res.error);
    }
    setGuardando(false);
  }, [busquedaId, criterios, preview]);

  // Autosave: al EDITAR (sucio), guardamos solos con un pequeño debounce, así la recruiter
  // no tiene que apretar "Guardar". El borrador derivado del brief NO se autoguarda hasta
  // que lo toca o lo confirma a mano (se mantiene la doctrina: nada se persiste sin intención).
  useEffect(() => {
    if (!sucio) return;
    const t = setTimeout(() => {
      void guardar();
    }, 900);
    return () => clearTimeout(t);
  }, [criterios, sucio, guardar]);

  const value: Ctx = {
    criterios,
    setCriterios,
    esBorrador: borrador,
    sucio,
    guardando,
    error,
    guardar,
    busqueda,
    ranked,
    conteos,
    preview,
  };

  return <CriteriosCtx.Provider value={value}>{children}</CriteriosCtx.Provider>;
}
