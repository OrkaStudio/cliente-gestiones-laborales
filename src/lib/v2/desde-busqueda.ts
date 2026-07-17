// Deriva el modelo de matching V2 a partir de los datos REALES que hoy existen en la
// base (sin columnas nuevas): mapea una búsqueda y un candidato al motor. Las habilidades
// se derivan del CV con pistas (sin IA). Es provisional para construir/ver la V2 en local;
// al pasar a prod, los criterios vendrán de la columna `criterios` y el backfill Haiku.

import { CATEGORIAS_GL } from "@/lib/cv/categorias";
import { derivarHabilidadesPorPistas } from "@/lib/cv/habilidades";
import type { BusquedaMatch, CandidatoMatch, Requisito } from "@/lib/v2/matching";

export type CandRow = {
  id: string;
  nombre: string;
  apellido: string;
  ubicacion: string | null;
  fecha_nacimiento: string | null;
  educacion: string | null;
  hectareas_max: number | null;
  personal_a_cargo_max: number | null;
  tipos_ganaderia: string[] | null;
  vehiculo_propio: boolean | null;
  licencia_conducir: boolean | null;
  estado_civil: string | null;
  hijos: string | null;
  categorias: string[] | null;
  cv_procesado_texto: string | null;
  telefono?: string | null;
  disponibilidad?: string | null;
  pretension_salarial?: string | null;
  vehiculo_detalle?: string | null;
  perfil_laboral?: string | null;
  notas_recruiter?: string | null;
  referencias?: unknown;
  pareja_declarada?: string | null;
  habilidades?: string[] | null;
  // `residir` es text + check en la DB (no enum) → llega como string. Se estrecha al mapear.
  residir?: string | null;
};

export type ExpRow = {
  candidato_id: string;
  rol: string | null;
  empresa: string | null;
  desde: string | null;
  hasta: string | null;
  ubicacion: string | null;
  descripcion: string | null;
  // La tabla ya guarda todo esto (lo extrae el parser del CV) y el drawer lo ignoraba:
  // el tamaño del campo es justo el requisito de hectáreas, y el motivo de salida es de
  // lo más valioso que puede leer una recruiter antes de levantar el teléfono.
  nombre_propietario: string | null;
  dimension_establecimiento: string | null;
  personal_a_cargo: string | null;
  en_blanco: boolean | null;
  ingresos_actuales: string | null;
  beneficios: string | null;
  motivo_cambio_o_salida: string | null;
};

export type Ficha = {
  telefono: string | null;
  disponibilidad: string | null;
  pretension: string | null;
  vehiculoDetalle: string | null;
  perfilLaboral: string | null;
  notas: string | null;
  parejaDeclarada: string | null;
  // Shape REAL de la base: {nombre, contacto, relacion}. No hay calificación — antes se
  // mapeaba a {de, calif, nota} y, al no encontrarla, marcaba "buena" por defecto: pintaba
  // de verde un juicio que nadie emitió, y tiraba el teléfono (lo único accionable).
  referencias: { nombre: string; relacion: string | null; contacto: string | null }[];
  trayectoria: {
    rol: string;
    empresa: string;
    periodo: string | null;
    antiguedad: string | null;
    lugar: string | null;
    descripcion: string | null;
    propietario: string | null;
    dimension: string | null;
    personalACargo: string | null;
    enBlanco: boolean | null;
    ingresos: string | null;
    beneficios: string | null;
    motivoSalida: string | null;
  }[];
};

function txt(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s : null;
}

function parseRefs(raw: unknown): Ficha["referencias"] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r) => {
      const o = (r ?? {}) as Record<string, unknown>;
      return {
        nombre: txt(o.nombre) ?? txt(o.de) ?? txt(o.fuente) ?? "Referencia",
        relacion: txt(o.relacion),
        contacto: txt(o.contacto) ?? txt(o.telefono),
      };
    })
    .filter((r) => r.nombre !== "Referencia" || r.contacto);
}

/** Sólo el año, y sólo si lo hay. */
function anio(f: string | null): string | null {
  if (!f) return null;
  const m = f.match(/\d{4}/);
  return m ? m[0] : null;
}

/**
 * El período tal como se puede afirmar. El 19% de las experiencias no tiene NINGUNA fecha:
 * el "? – actual" que salía antes era ruido inventado.
 */
function periodoDe(desde: string | null, hasta: string | null): string | null {
  const d = anio(desde);
  const h = anio(hasta);
  if (d && h) return `${d} – ${h}`;
  if (d) return `desde ${d}`;
  if (h) return `hasta ${h}`;
  return null;
}

/** Cuánto duró en el puesto. Es la señal que mira una recruiter: no el año, la permanencia. */
function antiguedadDe(desde: string | null, hasta: string | null): string | null {
  if (!desde) return null;
  const d = new Date(desde);
  if (Number.isNaN(d.getTime())) return null;
  const h = hasta ? new Date(hasta) : new Date();
  if (Number.isNaN(h.getTime())) return null;
  const meses = Math.max(0, Math.round((h.getTime() - d.getTime()) / (30.44 * 864e5)));
  if (meses < 1) return null;
  const a = Math.floor(meses / 12);
  const m = meses % 12;
  if (a === 0) return `${m} ${m === 1 ? "mes" : "meses"}`;
  if (m === 0) return `${a} ${a === 1 ? "año" : "años"}`;
  return `${a} ${a === 1 ? "año" : "años"} y ${m} ${m === 1 ? "mes" : "meses"}`;
}

export function fichasDesdeRows(cands: CandRow[], exps: ExpRow[]): Record<string, Ficha> {
  const porCand: Record<string, ExpRow[]> = {};
  for (const e of exps) (porCand[e.candidato_id] ??= []).push(e);

  const out: Record<string, Ficha> = {};
  for (const c of cands) {
    out[c.id] = {
      telefono: c.telefono ?? null,
      disponibilidad: c.disponibilidad ?? null,
      pretension: c.pretension_salarial ?? null,
      vehiculoDetalle: c.vehiculo_detalle ?? null,
      perfilLaboral: c.perfil_laboral ?? null,
      notas: c.notas_recruiter ?? null,
      parejaDeclarada: c.pareja_declarada ?? null,
      referencias: parseRefs(c.referencias),
      trayectoria: (porCand[c.id] ?? []).map((e) => ({
        rol: e.rol ?? "—",
        empresa: e.empresa ?? "—",
        periodo: periodoDe(e.desde, e.hasta),
        antiguedad: antiguedadDe(e.desde, e.hasta),
        lugar: e.ubicacion,
        descripcion: e.descripcion,
        propietario: e.nombre_propietario ?? null,
        dimension: e.dimension_establecimiento ?? null,
        personalACargo: e.personal_a_cargo ?? null,
        enBlanco: e.en_blanco ?? null,
        ingresos: e.ingresos_actuales ?? null,
        beneficios: e.beneficios ?? null,
        motivoSalida: e.motivo_cambio_o_salida ?? null,
      })),
    };
  }
  return out;
}

export type BusquedaRow = {
  puesto: string;
  cliente: string | null;
  edad_minima: number | null;
  edad_maxima: number | null;
  hectareas_min: number | null;
  personal_a_cargo_min: number | null;
  movilidad_requerida: boolean | null;
  nivel_educacion: string | null;
  estado_civil: string | null;
  tipos_ganaderia_req: string[] | null;
  requisitos: string[] | null;
};

function edadDe(fn: string | null): number | null {
  if (!fn) return null;
  const d = new Date(fn);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
}

function mapEdu(s: string | null): number | null {
  if (!s) return null;
  const t = s.toLowerCase();
  if (t.includes("posgrado") || t.includes("master") || t.includes("máster")) return 4;
  if (t.includes("universi")) return 3;
  if (t.includes("terc") || t.includes("técni") || t.includes("tecni")) return 2;
  if (t.includes("secund")) return 1;
  if (t.includes("primar")) return 0;
  return null;
}

function tieneHijos(s: string | null): boolean | null {
  if (s == null || !s.trim()) return null;
  const t = s.toLowerCase().trim();
  if (["no", "0", "ninguno", "sin hijos"].includes(t)) return false;
  return true;
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// Best-effort puesto -> categorías aceptadas. PROVISIONAL: el mapeo fino lo confirma
// la recruiter en la "migración asistida" (Slice 4).
function catsDesdePuesto(puesto: string): string[] {
  const p = norm(puesto);
  const hits = CATEGORIAS_GL.filter((cat) => {
    const c = norm(cat);
    return p.includes(c) || c.split(" ").some((w) => w.length > 4 && p.includes(w));
  });
  if (hits.length) return hits;
  if (p.includes("ganader"))
    return ["Encargado de Ganadería", "Capataz de Ganadería", "Peón General", "Puestero"];
  if (p.includes("casero") || p.includes("puestero"))
    return ["Puestero", "Caseros", "Peón General"];
  if (p.includes("tambo")) return ["Tambero", "Encargado de Tambo"];
  if (p.includes("agric") || p.includes("maquin") || p.includes("tractor"))
    return ["Tractorista", "Capataz de Agricultura", "Peón General"];
  return [];
}

export function candidatoDesdeRow(c: CandRow): CandidatoMatch {
  return {
    id: c.id,
    nombre: c.nombre,
    apellido: c.apellido,
    zona: c.ubicacion,
    cats: c.categorias ?? [],
    edad: edadDe(c.fecha_nacimiento),
    vehiculo: c.vehiculo_propio,
    // Columnas del backfill (Haiku, con citas validadas contra el CV). Antes se derivaban
    // en cada render con keyword-match sobre el CV completo de los 180 candidatos.
    // El fallback por pistas queda solo para los que todavía no tengan backfill.
    residir: c.residir === "si" || c.residir === "no" ? c.residir : "sin_dato",
    edu: mapEdu(c.educacion),
    ha: c.hectareas_max,
    gente: c.personal_a_cargo_max,
    ganaderia: c.tipos_ganaderia ?? [],
    licencia: c.licencia_conducir,
    civil: c.estado_civil,
    hijos: tieneHijos(c.hijos),
    habilidades: c.habilidades?.length
      ? c.habilidades
      : derivarHabilidadesPorPistas(c.cv_procesado_texto ?? ""),
    // Declaró pareja → viene acompañado. Sin dato → null (no descarta; se pregunta).
    pareja: c.pareja_declarada?.trim() ? true : null,
  };
}

export function criteriosDesdeBusqueda(b: BusquedaRow): BusquedaMatch {
  const reqs: Requisito[] = [];
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

  // Los requisitos en TEXTO LIBRE de la búsqueda (lo que hoy carga la recruiter) se
  // interpretan a criterios del motor. PROVISIONAL: en V2 estos campos se cargan
  // estructurados (Obligatorio/Deseable) desde el form; acá los inferimos del texto.
  const textos = (b.requisitos ?? []).map(norm);
  const algun = (re: RegExp) => textos.some((t) => re.test(t));
  if (algun(/vivir en el campo|residir|radicar|mudar/) && !reqs.some((r) => r.campo === "residir"))
    reqs.push({ campo: "residir", nivel: "obligatorio", val: true });
  if (algun(/sin hijos/)) reqs.push({ campo: "hijos", nivel: "deseable", val: false });
  if (algun(/movilidad|veh[ií]culo/) && !reqs.some((r) => r.campo === "vehiculo"))
    reqs.push({ campo: "vehiculo", nivel: "obligatorio", val: true });

  return {
    cliente: b.cliente ?? b.puesto,
    puesto: b.puesto,
    acceptedCats: catsDesdePuesto(b.puesto),
    requisitos: reqs,
  };
}
