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
  | { campo: "vehiculo" | "residir" | "licencia" | "hijos" | "pareja"; nivel: Nivel; val: boolean }
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
  // true = declaró pareja (viene acompañado); null = no lo sabemos (no descarta).
  pareja: boolean | null;
};

export type BusquedaMatch = {
  cliente: string;
  puesto: string;
  acceptedCats: string[];
  requisitos: Requisito[];
  // La búsqueda es para una pareja/matrimonio (checkbox del panel). Cuando está activo,
  // el matching prioriza a quienes vienen en pareja — ver requisitosEfectivos().
  matrimonio?: boolean;
};

// Los requisitos REALES contra los que se evalúa. Si la búsqueda es para un matrimonio, se
// suma uno sintético "viene en pareja": así el flag afecta ranking, motivo y huecos sin
// duplicar el chip en el panel (el panel edita `criterios.requisitos`, no esto).
export function requisitosEfectivos(b: BusquedaMatch): Requisito[] {
  if (!b.matrimonio) return b.requisitos;
  return [...b.requisitos, { campo: "pareja", nivel: "obligatorio", val: true }];
}

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
    case "pareja":
      return "Viene en pareja";
    // Rangos abiertos: antes salía "Edad –35" y "Superficie ≥  ha" cuando faltaba una punta.
    case "edad":
      if (r.min != null && r.max != null) return `Edad ${r.min}–${r.max} años`;
      if (r.max != null) return `Hasta ${r.max} años`;
      if (r.min != null) return `Desde ${r.min} años`;
      return "Edad";
    case "ha": {
      const f = (n: number) => n.toLocaleString("es-AR");
      if (r.min != null && r.max != null) return `Superficie ${f(r.min)}–${f(r.max)} ha`;
      if (r.min != null) return `Superficie ≥ ${f(r.min)} ha`;
      if (r.max != null) return `Superficie ≤ ${f(r.max)} ha`;
      return "Superficie manejada";
    }
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

/**
 * El NOMBRE del requisito, sin su valor. En el editor el valor se muestra aparte (en un
 * input editable), así que la etiqueta no debe repetirlo: "Superficie", no "Superficie ≥ 2.000 ha".
 */
export function reqNombre(r: Requisito): string {
  switch (r.campo) {
    case "edad":
      return "Edad";
    case "ha":
      return "Superficie manejada";
    case "gente":
      return "Gente a cargo (mín.)";
    case "educacion":
      return "Nivel educativo (mín.)";
    case "pareja":
      return "Viene en pareja";
    default:
      return reqLabel(r);
  }
}

export function evalReq(c: CandidatoMatch, r: Requisito): Estado {
  switch (r.campo) {
    case "hab":
      // "Ausencia = NO declarado, no equivale a 'no sabe'" (spec del vocabulario y comment
      // de la columna `candidatos.habilidades`). Que el CV no mencione "manga y corrales"
      // NO prueba que el tipo no sepa trabajar en la manga: prueba que no lo escribió.
      // Antes esto devolvía "no" (= -50, descarte) para cualquiera que tuviera OTRAS
      // habilidades cargadas → con el backfill hubiera descartado en masa a gente que
      // simplemente no lo puso en el CV. Sin evidencia hay que preguntar, no descartar:
      // queda "a confirmar" y alimenta el loop de WhatsApp.
      return c.habilidades.includes(r.hab) ? "ok" : "sd";
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
    case "pareja":
      // Declaró pareja → cumple. Sin dato → a confirmar (nadie invisible): no sabemos si
      // viene acompañado, se le pregunta. Nunca descarta por falta de dato.
      return c.pareja === true ? "ok" : "sd";
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
  // Candidato sin ninguna categoría cargada: es un hueco de datos, no un "no cumple".
  // Descartarlo (rojo) lo volvía invisible por un dato que falta de NUESTRO lado.
  if (c.cats.length === 0) return "sd";
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
  } else if (ce === "sd") hasAmber = true; // sin categoría cargada → a confirmar, no descarte

  for (const r of requisitosEfectivos(b)) {
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
  return requisitosEfectivos(b).filter((r) => evalReq(c, r) === "sd");
}

export type Desglose = {
  cumple: Requisito[];
  noCumple: Requisito[];
  aConfirmar: Requisito[];
  categoria: Estado | "skip";
};

export function desgloseDe(c: CandidatoMatch, b: BusquedaMatch): Desglose {
  const d: Desglose = {
    cumple: [],
    noCumple: [],
    aConfirmar: [],
    categoria: evalCat(c, b.acceptedCats),
  };
  for (const r of requisitosEfectivos(b)) {
    const e = evalReq(c, r);
    if (e === "ok") d.cumple.push(r);
    else if (e === "no") d.noCumple.push(r);
    else d.aConfirmar.push(r);
  }
  return d;
}

const enumerar = (xs: string[], max = 2): string => {
  if (xs.length === 0) return "";
  if (xs.length <= max) return xs.join(" y ");
  return `${xs.slice(0, max).join(", ")} y ${xs.length - max} más`;
};

// Etiqueta corta para la línea de la lista: token compacto por campo, no la frase completa
// que usa el drawer. "vehículo", no "Vehículo propio" — así entran dos en la línea sin cortar.
const CAMPO_CORTO: Record<Requisito["campo"], string> = {
  hab: "", // las habilidades usan su propio label (r.hab)
  vehiculo: "vehículo",
  residir: "residir",
  licencia: "licencia",
  hijos: "hijos",
  pareja: "pareja",
  edad: "edad",
  ha: "superficie",
  educacion: "estudios",
  gente: "gente a cargo",
  ganaderia: "ganadería",
  civil: "estado civil",
};
const gapCorto = (r: Requisito): string =>
  r.campo === "hab" ? r.hab.toLowerCase() : CAMPO_CORTO[r.campo];

/**
 * El PORQUÉ del match, en una línea y en criollo. Se usa para ÁMBAR y ROJO en la lista (y en
 * el preview compacto de nueva búsqueda). Los BUEN MATCH usan el desglose completo de tres
 * líneas — ver motivoDesglose(). Prioridad: primero lo que descarta, después lo que falta
 * preguntar, después lo que suma.
 */
export function motivoDe(c: CandidatoMatch, b: BusquedaMatch): string {
  const d = desgloseDe(c, b);

  if (d.categoria === "no") return "No es de la categoría que busca la posición";

  // Solo los OBLIGATORIOS incumplidos descartan. Un deseable que no cumple no es una falta:
  // simplemente no suma puntos. (Antes se anunciaba "No cumple X" arriba de candidatos que
  // estaban en verde — el motivo contradecía al badge.)
  const rotos = d.noCumple.filter((r) => r.nivel === "obligatorio");
  if (rotos.length > 0)
    return `No cumple ${enumerar(rotos.map((r) => reqLabel(r).toLowerCase()))}`;

  const obligSd = d.aConfirmar.filter((r) => r.nivel === "obligatorio");
  const faltantes = [
    ...(d.categoria === "sd" ? ["su categoría"] : []),
    ...obligSd.map((r) => reqLabel(r).toLowerCase()),
  ];
  if (faltantes.length > 0) return `Falta confirmar ${enumerar(faltantes)}`;

  const fuertes = d.cumple.filter((r) => r.campo === "hab").map((r) => reqLabel(r));
  if (fuertes.length > 0) return `Cumple todo · ${enumerar(fuertes, 3)}`;
  return "Cumple todos los requisitos";
}

// Requisitos ordenados a tokens cortos: estructurados primero, habilidades después.
const ordenarTokens = (reqs: Requisito[]): string[] =>
  [...reqs]
    .sort((a, z) => (a.campo === "hab" ? 1 : 0) - (z.campo === "hab" ? 1 : 0))
    .map(gapCorto);

export type MotivoDesglose = { cumple: string[]; confirmar: string[]; noCumple: string[] };

/**
 * El desglose del candidato contra la búsqueda, en tres listas de tokens cortos para pintar
 * en la fila de la lista: qué CUMPLE, qué falta CONFIRMAR (no figura en el CV) y qué NO CUMPLE.
 * Pedido de Fran (16/07): ver el encaje completo del perfil desde la lista, sin abrir el drawer.
 * La categoría solo aparece cuando es problema (a confirmar / no cumple); cuando encaja ya se ve
 * en la sublínea de categorías del candidato.
 */
export function motivoDesglose(c: CandidatoMatch, b: BusquedaMatch): MotivoDesglose {
  const d = desgloseDe(c, b);
  return {
    cumple: ordenarTokens(d.cumple),
    confirmar: [...(d.categoria === "sd" ? ["categoría"] : []), ...ordenarTokens(d.aConfirmar)],
    noCumple: [...(d.categoria === "no" ? ["categoría"] : []), ...ordenarTokens(d.noCumple)],
  };
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
