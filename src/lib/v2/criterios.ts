// Criterios V2 de una búsqueda: LO QUE SE GUARDA en `busquedas.criterios` (jsonb) y la
// única fuente de verdad del matching. Antes se derivaban en memoria en cada render
// (desde-busqueda.ts) — la recruiter no podía decidir qué era Obligatorio y qué Deseable.
//
// Regla: si la búsqueda TIENE criterios guardados, mandan ellos. Si no (las 11 búsquedas
// viejas, cargadas en V1), se deriva un BORRADOR desde lo que ya hay escrito — brief,
// requisitos en texto y campos sueltos — y la UI lo muestra como "borrador sugerido"
// hasta que la recruiter lo confirma. Eso es la migración asistida, sin script aparte.

import { CATEGORIAS_GL } from "@/lib/cv/categorias";
import { HABILIDADES_GL, HABILIDADES_GL_PISTAS } from "@/lib/cv/habilidades";
import type { BusquedaMatch, Nivel, Requisito } from "@/lib/v2/matching";

export type CriteriosV2 = {
  v: 1;
  categorias: string[];
  requisitos: Requisito[];
  /** La búsqueda es para un matrimonio/pareja (pedido de Oriana, 15/06). */
  matrimonio?: boolean;
};

export const CRITERIOS_VACIOS: CriteriosV2 = { v: 1, categorias: [], requisitos: [] };

const CAMPOS_VALIDOS = new Set([
  "hab",
  "edad",
  "ha",
  "educacion",
  "gente",
  "vehiculo",
  "residir",
  "licencia",
  "hijos",
  "ganaderia",
  "civil",
]);

function esRequisito(x: unknown): x is Requisito {
  if (!x || typeof x !== "object") return false;
  const r = x as Record<string, unknown>;
  if (typeof r.campo !== "string" || !CAMPOS_VALIDOS.has(r.campo)) return false;
  if (r.nivel !== "obligatorio" && r.nivel !== "deseable") return false;
  // Una habilidad sin label, o con un label fuera del vocabulario lockeado, no matchea
  // nada: la descartamos en vez de arrastrar un requisito imposible de cumplir.
  if (r.campo === "hab") return typeof r.hab === "string" && HABILIDADES_GL.includes(r.hab);
  return true;
}

/** Lee el jsonb de la DB. Devuelve null si la búsqueda todavía no tiene criterios propios. */
export function parseCriterios(raw: unknown): CriteriosV2 | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (o.v !== 1) return null; // incluye el default '{}' de la migración
  const categorias = Array.isArray(o.categorias)
    ? o.categorias.filter((c): c is string => typeof c === "string" && CATEGORIAS_GL.includes(c))
    : [];
  const requisitos = Array.isArray(o.requisitos) ? o.requisitos.filter(esRequisito) : [];
  return {
    v: 1,
    categorias,
    requisitos,
    matrimonio: o.matrimonio === true,
  };
}

// ---------------------------------------------------------------------------
// Borrador: se deriva de lo que la recruiter YA escribió en V1.
// ---------------------------------------------------------------------------

export type BusquedaParaBorrador = {
  puesto: string;
  cliente: string | null;
  descripcion: string | null;
  requisitos: string[] | null;
  edad_minima: number | null;
  edad_maxima: number | null;
  hectareas_min: number | null;
  personal_a_cargo_min: number | null;
  movilidad_requerida: boolean | null;
  nivel_educacion: string | null;
  estado_civil: string | null;
  tipos_ganaderia_req: string[] | null;
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function pistaPresente(pistaNorm: string, fuenteNorm: string): boolean {
  if (!pistaNorm) return false;
  const escapada = pistaNorm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|\\s)${escapada}`).test(fuenteNorm);
}

export function mapEdu(s: string | null): number | null {
  if (!s) return null;
  const t = s.toLowerCase();
  if (t.includes("posgrado") || t.includes("master") || t.includes("máster")) return 4;
  if (t.includes("universi")) return 3;
  if (t.includes("terc") || t.includes("técni") || t.includes("tecni")) return 2;
  if (t.includes("secund")) return 1;
  if (t.includes("primar")) return 0;
  return null;
}

/**
 * Categorías aceptadas a partir del puesto en texto libre (V1 no tiene categorías).
 *
 * Se resuelve por ROL (jerarquía) × DOMINIO (rubro), NO por solapamiento de palabras.
 * El match laxo anterior le asignaba a "Peón ganadero" la categoría "Encargado
 * Agrícola-Ganadero" (comparten la palabra "ganadero") → le buscaba encargados a una
 * búsqueda de peón y se perdía los peones. El rol manda: un peón no es un encargado.
 */
export function catsDesdePuesto(puesto: string): string[] {
  const p = norm(puesto);

  // Categoría escrita tal cual ("Puestero", "Tractorista"). NO alcanza sola: una búsqueda
  // de "Puestero" también le sirve un "Peón General" (mismo escalón de la pirámide), y
  // quedarse solo con la exacta mandaba a "no cumple" a medio padrón por la categoría.
  // Se une con la expansión por rol de abajo.
  const exacta = CATEGORIAS_GL.filter((cat) => p.includes(norm(cat)));
  const unir = (xs: string[]) => Array.from(new Set([...exacta, ...xs]));

  const dominio = /ganader|hacienda|rodeo|feed ?lot|vacun|cria|invernada/.test(p)
    ? "ganaderia"
    : /tambo|ordeñe|ordene|lecher/.test(p)
      ? "tambo"
      : /agricol|agricul|siembra|cosecha|cultivo/.test(p)
        ? "agricultura"
        : /maquinaria|tractor|mecanic/.test(p)
          ? "maquinaria"
          : /mixto|agricola ganadero/.test(p)
            ? "mixto"
            : null;

  // Roles de campo (los de abajo de la pirámide): peón, puestero, casero.
  if (/peon|peón|operario|ayudante/.test(p)) {
    const base = ["Peón General"];
    if (dominio === "ganaderia") base.push("Puestero");
    if (dominio === "tambo") base.push("Tambero");
    if (dominio === "maquinaria" || dominio === "agricultura") base.push("Tractorista");
    return unir(base);
  }
  if (/puestero/.test(p)) return unir(["Puestero", "Peón General"]);
  if (/casero/.test(p)) return unir(["Caseros", "Puestero", "Peón General"]);

  if (/capataz/.test(p)) {
    if (dominio === "ganaderia") return unir(["Capataz de Ganadería"]);
    if (dominio === "agricultura") return unir(["Capataz de Agricultura"]);
    if (dominio === "maquinaria") return unir(["Capataz de Maquinarias"]);
    return unir(["Capataz de Ganadería", "Capataz de Agricultura", "Capataz de Maquinarias"]);
  }

  if (/encargado|mayordomo|segundo/.test(p)) {
    if (dominio === "ganaderia")
      return unir(["Encargado de Ganadería", "Encargado Agrícola-Ganadero"]);
    if (dominio === "agricultura")
      return unir(["Encargado de Agricultura", "Encargado Agrícola-Ganadero"]);
    if (dominio === "maquinaria") return unir(["Encargado de Maquinarias"]);
    if (dominio === "tambo") return unir(["Encargado de Tambo"]);
    if (dominio === "mixto") return unir(["Encargado Agrícola-Ganadero"]);
    return unir(["Encargado General", "Encargado Agrícola-Ganadero"]);
  }

  if (/administrador/.test(p)) return unir(["Administrador Rural"]);
  if (/agronom/.test(p)) return unir(["Ingeniero Agrónomo"]);
  if (/veterinar/.test(p)) return unir(["Veterinario"]);
  if (/insemina/.test(p)) return unir(["Inseminador"]);
  if (/tamber/.test(p)) return unir(["Tambero"]);

  // Sin rol reconocible: al menos acotamos por dominio, y la recruiter ajusta.
  if (dominio === "ganaderia") return unir(["Peón General", "Puestero"]);
  if (dominio === "tambo") return unir(["Tambero"]);
  if (dominio === "maquinaria" || dominio === "agricultura")
    return unir(["Tractorista", "Peón General"]);
  return exacta;
}

// Palabras con las que la recruiter marca que algo NO se negocia. Si el requisito aparece
// cerca de una de estas, el borrador lo propone Obligatorio; si no, Deseable (y ella lo
// sube con un clic). Preferimos subestimar: un Obligatorio de más descarta gente.
const RE_DURO =
  /indispensable|excluyente|imprescindible|obligatorio|debe |deben |tiene que|necesariamente|si o si|requisito/;

/** ¿La frase que contiene esta pista viene marcada como no-negociable? */
function nivelSegunContexto(fuente: string, pista: RegExp): Nivel {
  const frases = fuente.split(/[.;\n]/);
  const conPista = frases.filter((f) => pista.test(norm(f)));
  return conPista.some((f) => RE_DURO.test(norm(f))) ? "obligatorio" : "deseable";
}

/**
 * Deriva el borrador de criterios de una búsqueda V1.
 *
 * Novedad clave: lee el BRIEF (`descripcion`), que es donde la recruiter escribe lo que
 * realmente pide. Antes solo se miraba `requisitos[]`, que en la mayoría de las búsquedas
 * está vacío — de ahí que el panel saliera sin un solo Obligatorio y el embudo plano.
 */
export function borradorDesdeBusqueda(b: BusquedaParaBorrador): CriteriosV2 {
  const textoLibre = [b.descripcion ?? "", ...(b.requisitos ?? [])].join(". ");
  const fuente = norm(textoLibre);
  const reqs: Requisito[] = [];

  // 1) Habilidades del vocabulario que el brief menciona.
  for (const label of HABILIDADES_GL) {
    const pistas = HABILIDADES_GL_PISTAS[label];
    if (pistas.some((p) => pistaPresente(norm(p), fuente))) {
      const re = new RegExp(pistas.map((p) => norm(p)).join("|"));
      reqs.push({ campo: "hab", hab: label, nivel: nivelSegunContexto(textoLibre, re) });
    }
  }

  // 2) Campos estructurados que V1 ya cargaba.
  if (b.movilidad_requerida) reqs.push({ campo: "vehiculo", nivel: "obligatorio", val: true });
  if (b.edad_minima != null || b.edad_maxima != null)
    reqs.push({
      campo: "edad",
      nivel: "deseable",
      min: b.edad_minima ?? undefined,
      max: b.edad_maxima ?? undefined,
    });
  if (b.hectareas_min != null) reqs.push({ campo: "ha", nivel: "deseable", min: b.hectareas_min });
  if (b.personal_a_cargo_min != null)
    reqs.push({ campo: "gente", nivel: "deseable", val: b.personal_a_cargo_min });
  const edu = mapEdu(b.nivel_educacion);
  if (edu != null) reqs.push({ campo: "educacion", nivel: "deseable", val: edu });
  if (b.tipos_ganaderia_req?.length)
    reqs.push({ campo: "ganaderia", nivel: "deseable", val: b.tipos_ganaderia_req });
  if (b.estado_civil) reqs.push({ campo: "civil", nivel: "deseable", val: b.estado_civil });

  // 3) Lo que solo vive en la prosa.
  const yaEsta = (campo: string) => reqs.some((r) => r.campo === campo);
  const RE_RESIDIR = /vivir en el campo|residir|radicar|mudar|vivienda en el campo/;
  if (RE_RESIDIR.test(fuente) && !yaEsta("residir"))
    reqs.push({ campo: "residir", nivel: nivelSegunContexto(textoLibre, RE_RESIDIR), val: true });
  const RE_VEHICULO = /movilidad|vehiculo|auto propio|camioneta/;
  if (RE_VEHICULO.test(fuente) && !yaEsta("vehiculo"))
    reqs.push({ campo: "vehiculo", nivel: nivelSegunContexto(textoLibre, RE_VEHICULO), val: true });
  const RE_LICENCIA = /licencia de conducir|carnet|registro de conducir/;
  if (RE_LICENCIA.test(fuente) && !yaEsta("licencia"))
    reqs.push({ campo: "licencia", nivel: nivelSegunContexto(textoLibre, RE_LICENCIA), val: true });
  if (/sin hijos/.test(fuente) && !yaEsta("hijos"))
    reqs.push({ campo: "hijos", nivel: "deseable", val: false });

  // "Puede haber trabajo para la pareja", "se busca matrimonio", "con familia".
  const matrimonio = /matrimonio|para la pareja|en pareja|trabajo para ambos/.test(fuente);

  return {
    v: 1,
    categorias: catsDesdePuesto(b.puesto),
    requisitos: reqs,
    matrimonio,
  };
}

/** Criterios (guardados o borrador) → lo que consume el motor de matching. */
export function aBusquedaMatch(c: CriteriosV2, b: { puesto: string; cliente: string | null }): BusquedaMatch {
  return {
    cliente: b.cliente ?? b.puesto,
    puesto: b.puesto,
    acceptedCats: c.categorias,
    requisitos: c.requisitos,
    matrimonio: c.matrimonio,
  };
}

/** Los valores que se espejan en columnas propias (para poder filtrar por SQL más adelante). */
export function espejosDe(c: CriteriosV2): { categorias_aceptadas: string[]; habilidades_req: string[] } {
  return {
    categorias_aceptadas: c.categorias,
    habilidades_req: c.requisitos.flatMap((r) => (r.campo === "hab" ? [r.hab] : [])),
  };
}
