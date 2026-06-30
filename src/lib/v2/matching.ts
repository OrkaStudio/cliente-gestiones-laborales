// Motor de matching V2 — portado fiel del prototipo (prototipo-busqueda-creada-v2.html).
// Evalúa cada candidato contra los requisitos Obligatorio/Deseable de una búsqueda.
// "nadie invisible": un Obligatorio sin dato NO descarta → queda "a confirmar".

export const EDU_NIVELES = [
  "Primario",
  "Secundario",
  "Terciario/Técnico",
  "Universitario",
  "Posgrado",
] as const;

export type Nivel = "obligatorio" | "deseable";

export type Requisito =
  | { campo: "hab"; hab: string; nivel: Nivel }
  | { campo: "edad" | "ha"; nivel: Nivel; min?: number; max?: number }
  | { campo: "educacion" | "gente"; nivel: Nivel; val: number }
  | { campo: "vehiculo" | "residir" | "licencia" | "hijos"; nivel: Nivel; val: boolean }
  | { campo: "ganaderia"; nivel: Nivel; val: string[] }
  | { campo: "civil"; nivel: Nivel; val: string };

export type CandidatoMatch = {
  id: string;
  nombre: string;
  apellido: string;
  zona: string | null;
  cats: string[];
  edad: number | null;
  vehiculo: boolean | null;
  residir: "si" | "no" | "sin_dato";
  edu: number | null;
  ha: number | null;
  gente: number | null;
  ganaderia: string[];
  licencia: boolean | null;
  civil: string | null;
  hijos: boolean | null;
  habilidades: string[];
};

export type BusquedaMatch = {
  cliente: string;
  puesto: string;
  acceptedCats: string[];
  requisitos: Requisito[];
};

export type Estado = "ok" | "no" | "sd";
export type Tier = "green" | "amber" | "red";

export function reqLabel(r: Requisito): string {
  switch (r.campo) {
    case "hab":
      return r.hab;
    case "vehiculo":
      return "Vehículo propio";
    case "residir":
      return "Disponible para residir";
    case "licencia":
      return "Licencia de conducir";
    case "hijos":
      return r.val ? "Con hijos" : "Sin hijos";
    case "edad":
      return `Edad ${r.min ?? ""}–${r.max ?? ""}`;
    case "ha":
      return `Superficie ≥ ${r.min?.toLocaleString("es-AR") ?? ""}${r.max ? `–${r.max.toLocaleString("es-AR")}` : ""} ha`;
    case "educacion":
      return `Educación mín. ${EDU_NIVELES[r.val]}`;
    case "gente":
      return `Gente a cargo ≥ ${r.val}`;
    case "ganaderia":
      return `Ganadería: ${r.val.join(" / ")}`;
    case "civil":
      return `Estado civil: ${r.val}`;
  }
}

export function evalReq(c: CandidatoMatch, r: Requisito): Estado {
  switch (r.campo) {
    case "hab":
      return c.habilidades.includes(r.hab) ? "ok" : c.habilidades.length ? "no" : "sd";
    case "edad": {
      const v = c.edad;
      if (v == null) return "sd";
      return (r.min == null || v >= r.min) && (r.max == null || v <= r.max) ? "ok" : "no";
    }
    case "ha": {
      const v = c.ha;
      if (v == null) return "sd";
      return (r.min == null || v >= r.min) && (r.max == null || v <= r.max) ? "ok" : "no";
    }
    case "educacion": {
      const v = c.edu;
      if (v == null) return "sd";
      return v >= r.val ? "ok" : "no";
    }
    case "gente": {
      const v = c.gente;
      if (v == null) return "sd";
      return v >= r.val ? "ok" : "no";
    }
    case "vehiculo": {
      const v = c.vehiculo;
      if (v == null) return "sd";
      return v === r.val ? "ok" : "no";
    }
    case "licencia": {
      const v = c.licencia;
      if (v == null) return "sd";
      return v === r.val ? "ok" : "no";
    }
    case "residir":
      if (c.residir === "sin_dato") return "sd";
      return (c.residir === "si") === r.val ? "ok" : "no";
    case "hijos": {
      const v = c.hijos;
      if (v == null) return "sd";
      return v === r.val ? "ok" : "no";
    }
    case "ganaderia":
      if (!c.ganaderia.length || !r.val.length) return "sd";
      return r.val.some((x) => c.ganaderia.includes(x)) ? "ok" : "no";
    case "civil": {
      const v = c.civil;
      if (!v) return "sd";
      return v.toLowerCase().slice(0, 4) === r.val.toLowerCase().slice(0, 4) ? "ok" : "no";
    }
  }
}

// Categoría: red de seguridad por etiqueta (la trayectoria, que el prototipo también
// mira, necesita la tabla experiencia_laboral — se suma cuando la tengamos en el fixture).
export function evalCat(c: CandidatoMatch, acceptedCats: string[]): Estado | "skip" {
  if (acceptedCats.length === 0) return "skip";
  return acceptedCats.some((cat) => c.cats.includes(cat)) ? "ok" : "no";
}

const W = { obligOk: 10, obligNo: -50, deseOk: 3 };

export type Score = { s: number; failOblig: boolean; hasAmber: boolean; deseOk: number };

export function scoreOf(c: CandidatoMatch, b: BusquedaMatch): Score {
  let s = 0;
  let failOblig = false;
  let hasAmber = false;
  let deseOk = 0;

  const ce = evalCat(c, b.acceptedCats);
  if (ce === "ok") s += W.obligOk;
  else if (ce === "no") {
    s += W.obligNo;
    failOblig = true;
  }

  for (const r of b.requisitos) {
    const e = evalReq(c, r);
    if (r.nivel === "obligatorio") {
      if (e === "ok") s += W.obligOk;
      else if (e === "no") {
        s += W.obligNo;
        failOblig = true;
      } else hasAmber = true;
    } else if (e === "ok") {
      s += W.deseOk;
      deseOk++;
    }
  }
  return { s, failOblig, hasAmber, deseOk };
}

export function tierOf(c: CandidatoMatch, b: BusquedaMatch): Tier {
  const sc = scoreOf(c, b);
  return sc.failOblig ? "red" : sc.hasAmber ? "amber" : "green";
}

// Huecos: requisitos en "sin dato" → lo que se le puede preguntar por WhatsApp.
export function gapsDe(c: CandidatoMatch, b: BusquedaMatch): Requisito[] {
  return b.requisitos.filter((r) => evalReq(c, r) === "sd");
}

export function rankear(
  cands: CandidatoMatch[],
  b: BusquedaMatch,
): { c: CandidatoMatch; score: Score; tier: Tier }[] {
  return cands
    .map((c) => {
      const score = scoreOf(c, b);
      return {
        c,
        score,
        tier: (score.failOblig ? "red" : score.hasAmber ? "amber" : "green") as Tier,
      };
    })
    .sort((a, b2) => b2.score.s - a.score.s);
}
