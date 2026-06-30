// Fixture LOCAL para construir la V2 sin tocar prod (datos reales del backup en
// .fixtures/, gitignorado). Mapea los candidatos al shape del motor de matching y
// deriva las habilidades determinísticamente (sin IA). El backfill con Haiku reemplaza
// la derivación recién al pasar a prod, post-validación de Andrea/Oriana.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { derivarHabilidadesPorPistas } from "../cv/habilidades"
import type { BusquedaMatch, CandidatoMatch } from "./matching"

type CandRaw = {
  id: string
  nombre: string
  apellido: string
  ubicacion: string | null
  fecha_nacimiento: string | null
  educacion: string | null
  hectareas_max: number | null
  personal_a_cargo_max: number | null
  tipos_ganaderia: string[] | null
  vehiculo_propio: boolean | null
  licencia_conducir: boolean | null
  estado_civil: string | null
  hijos: string | null
  categorias: string[] | null
  cv_procesado_texto: string | null
}

function edadDe(fn: string | null): number | null {
  if (!fn) return null
  const d = new Date(fn)
  if (Number.isNaN(d.getTime())) return null
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000))
}

function mapEdu(s: string | null): number | null {
  if (!s) return null
  const t = s.toLowerCase()
  if (t.includes("posgrado") || t.includes("master") || t.includes("máster")) return 4
  if (t.includes("universi")) return 3
  if (t.includes("terc") || t.includes("técni") || t.includes("tecni")) return 2
  if (t.includes("secund")) return 1
  if (t.includes("primar")) return 0
  return null
}

function tieneHijos(s: string | null): boolean | null {
  if (s == null || !s.trim()) return null
  const t = s.toLowerCase().trim()
  if (["no", "0", "ninguno", "sin hijos"].includes(t)) return false
  return true
}

let cacheCandidatos: CandidatoMatch[] | null = null

export function getCandidatosFixture(): CandidatoMatch[] {
  if (cacheCandidatos) return cacheCandidatos
  const raw: CandRaw[] = JSON.parse(readFileSync(join(process.cwd(), ".fixtures", "candidatos.json"), "utf8"))
  cacheCandidatos = raw.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    apellido: c.apellido,
    zona: c.ubicacion,
    cats: c.categorias ?? [],
    edad: edadDe(c.fecha_nacimiento),
    vehiculo: c.vehiculo_propio,
    residir: "sin_dato" as const, // no extraído todavía (backfill diferido) — honesto: se pregunta
    edu: mapEdu(c.educacion),
    ha: c.hectareas_max,
    gente: c.personal_a_cargo_max,
    ganaderia: c.tipos_ganaderia ?? [],
    licencia: c.licencia_conducir,
    civil: c.estado_civil,
    hijos: tieneHijos(c.hijos),
    habilidades: derivarHabilidadesPorPistas(c.cv_procesado_texto ?? ""),
  }))
  return cacheCandidatos
}

// Búsqueda de ejemplo para el build local (Encargado de Ganadería), con requisitos
// Obligatorio/Deseable que ejercitan todos los tipos del motor.
export const BUSQUEDA_DEMO: BusquedaMatch = {
  cliente: "Estancia La Pampa",
  puesto: "Encargado de Ganadería",
  acceptedCats: ["Encargado de Ganadería", "Encargado General", "Capataz de Ganadería"],
  requisitos: [
    { campo: "vehiculo", nivel: "obligatorio", val: true },
    { campo: "residir", nivel: "deseable", val: true },
    { campo: "edad", nivel: "deseable", min: 30, max: 55 },
    { campo: "ha", nivel: "deseable", min: 1000, max: 5000 },
    { campo: "educacion", nivel: "deseable", val: 1 },
    { campo: "gente", nivel: "deseable", val: 2 },
    { campo: "hab", hab: "Manga y corrales", nivel: "deseable" },
    { campo: "hab", hab: "Trabajo de a caballo", nivel: "deseable" },
  ],
}
