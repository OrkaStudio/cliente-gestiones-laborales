/**
 * Verificación de `residir` — chequea que el extractor no marque si/no de más.
 * Corre el extractor sobre la misma muestra seeded y muestra residir + zona al
 * lado de lo que el CV declara (Disponibilidad + INFORMACIÓN ADICIONAL), para
 * juzgar a ojo cada si/no. Solo lectura. Uso: pnpm tsx scripts/verificar-residir.ts
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { extraerHabilidadesYResidir } from "../src/lib/cv/habilidades";

config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
const arg = (n: string, d: number) => {
  const i = process.argv.indexOf(n);
  return i !== -1 ? Number(process.argv[i + 1]) : d;
};
const LIMIT = arg("--limit", 30);
const SEED = arg("--seed", 101);

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function linea(cv: string, prefijo: string): string {
  const l = cv.split("\n").find((x) => x.trim().toLowerCase().startsWith(prefijo.toLowerCase()));
  return l ? l.trim() : "";
}
function seccion(cv: string, titulo: string): string {
  const ls = cv.split("\n");
  const i = ls.findIndex((l) => l.trim().toUpperCase().startsWith(titulo));
  if (i === -1) return "";
  const out: string[] = [];
  for (let j = i + 1; j < ls.length; j++) {
    if (/^[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ ]{3,}$/.test(ls[j].trim()) && !ls[j].includes("─")) break;
    if (ls[j].trim() && !ls[j].includes("─")) out.push(ls[j].trim());
  }
  return out.join(" ");
}

async function main() {
  const { data } = await supabase.from("candidatos").select("id, nombre, apellido, cv_procesado_texto");
  const conCv = (data ?? []).filter((c) => (c.cv_procesado_texto ?? "").trim());
  const rand = rng(SEED);
  const muestra = [...conCv].sort(() => rand() - 0.5).slice(0, LIMIT);

  const cuenta = { si: 0, no: 0, sin_dato: 0 };
  for (let i = 0; i < muestra.length; i++) {
    const c = muestra[i];
    const cv = c.cv_procesado_texto ?? "";
    const r = await extraerHabilidadesYResidir(cv);
    cuenta[r.residir]++;
    const marca = r.residir === "sin_dato" ? "·" : r.residir === "si" ? "✚ SI" : "✖ NO";
    console.log(`${String(i + 1).padStart(2)}. ${marca}${r.residir_zona_preferida ? ` [${r.residir_zona_preferida}]` : ""}  ${c.nombre} ${c.apellido}`);
    // Solo detallo los si/no (donde puede haber error); los sin_dato no arriesgan.
    if (r.residir !== "sin_dato") {
      const disp = linea(cv, "Disponibilidad:");
      const adic = seccion(cv, "INFORMACIÓN ADICIONAL");
      if (disp) console.log(`      ${disp}`);
      if (adic) console.log(`      ADIC: ${adic.slice(0, 300)}`);
    }
  }
  console.log(`\nResumen → si: ${cuenta.si} · no: ${cuenta.no} · sin_dato: ${cuenta.sin_dato}`);
}

main();
