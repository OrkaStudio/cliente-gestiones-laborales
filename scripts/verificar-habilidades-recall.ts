/**
 * Verificación de RECALL del extractor de habilidades (NO escribe nada).
 *
 * Objetivo: chequear la duda de Fran — ¿se escapan habilidades que están descritas
 * con otras palabras o que viven en las "Tareas:" de la experiencia laboral?
 *
 * Por candidato imprime, lado a lado:
 *   - Habilidades que detectó Haiku (extraerHabilidadesYResidir, la lógica de prod)
 *   - Habilidades del fallback determinístico por pistas (keyword puro) — contraste
 *   - El PERFIL LABORAL + todas las líneas "Tareas:" del CV (la fuente cruda)
 * para poder juzgar a ojo qué quedó afuera.
 *
 * Uso:
 *   pnpm tsx scripts/verificar-habilidades-recall.ts --limit 12          # muestra aleatoria
 *   pnpm tsx scripts/verificar-habilidades-recall.ts --limit 12 --seed 3 # reproducible
 *
 * Solo lectura de prod. PII en consola → no persistir el output.
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { derivarHabilidadesPorPistas, extraerHabilidadesYResidir } from "../src/lib/cv/habilidades";

config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const limitArg = process.argv.indexOf("--limit");
const LIMIT = limitArg !== -1 ? Number(process.argv[limitArg + 1]) : 12;
const seedArg = process.argv.indexOf("--seed");
const SEED = seedArg !== -1 ? Number(process.argv[seedArg + 1]) : Date.now();

// PRNG determinístico (mulberry32) para muestras reproducibles con --seed.
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

function extraerSeccion(texto: string, titulo: string): string {
  const lineas = texto.split("\n");
  const iniLoop = lineas.findIndex((l) => l.trim().toUpperCase().startsWith(titulo));
  if (iniLoop === -1) return "";
  const out: string[] = [];
  // Arranca después del título y su línea de guiones; corta en la próxima SECCIÓN (mayúsculas).
  for (let i = iniLoop + 1; i < lineas.length; i++) {
    const l = lineas[i];
    if (/^[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ ]{3,}$/.test(l.trim()) && !l.includes("─")) break;
    out.push(l);
  }
  return out.join("\n").trim();
}

async function main() {
  const { data, error } = await supabase
    .from("candidatos")
    .select("id, nombre, apellido, cv_procesado_texto");
  if (error) {
    console.error("Error leyendo candidatos:", error.message);
    process.exit(1);
  }

  const conCv = (data ?? []).filter((c) => (c.cv_procesado_texto ?? "").trim());
  const rand = rng(SEED);
  const muestra = [...conCv].sort(() => rand() - 0.5).slice(0, LIMIT);

  console.log(`Muestra: ${muestra.length}/${conCv.length} candidatos con CV · seed ${SEED}\n`);

  let totalHaiku = 0;
  let totalPistas = 0;
  for (let i = 0; i < muestra.length; i++) {
    const c = muestra[i];
    const nombre = `${c.nombre} ${c.apellido}`.trim();
    const cv = c.cv_procesado_texto ?? "";

    const haiku = await extraerHabilidadesYResidir(cv);
    const pistas = derivarHabilidadesPorPistas(cv);
    totalHaiku += haiku.habilidades.length;
    totalPistas += pistas.length;

    const perfil = extraerSeccion(cv, "PERFIL LABORAL");
    const tareas = cv
      .split("\n")
      .filter((l) => /^\s*(Tareas|Cargo)\s*:/i.test(l))
      .map((l) => "    " + l.trim())
      .join("\n");

    console.log("═".repeat(78));
    console.log(`${i + 1}. ${nombre}`);
    console.log(`   HAIKU  (${haiku.habilidades.length}): ${haiku.habilidades.join(" · ") || "—"}`);
    console.log(`   PISTAS (${pistas.length}): ${pistas.join(" · ") || "—"}`);
    const soloPistas = pistas.filter((p) => !haiku.habilidades.includes(p));
    if (soloPistas.length) console.log(`   ⚠ pistas SÍ / haiku NO: ${soloPistas.join(" · ")}`);
    console.log(`   residir: ${haiku.residir}${haiku.residir_zona_preferida ? " · " + haiku.residir_zona_preferida : ""}`);
    if (perfil) console.log(`   ── perfil ──\n    ${perfil.replace(/\n/g, "\n    ").slice(0, 600)}`);
    if (tareas) console.log(`   ── cargos + tareas ──\n${tareas}`);
    console.log("");
  }

  console.log("═".repeat(78));
  console.log(
    `Promedio habilidades/candidato → Haiku: ${(totalHaiku / muestra.length).toFixed(1)} · Pistas: ${(totalPistas / muestra.length).toFixed(1)}`,
  );
}

main();
