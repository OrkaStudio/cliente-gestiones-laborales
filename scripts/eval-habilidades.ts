/**
 * Eval de calidad del extractor de habilidades — genera el material para medir
 * precisión/recall contra un gold hecho a mano.
 *
 * Baja una muestra seeded de CVs, corre Haiku (extraerHabilidadesYResidir, lógica
 * de prod) sobre cada uno y escribe DOS archivos en el dir de salida:
 *   - eval-cvs.txt   : dump legible (id + nombre + CV) para etiquetar a mano
 *   - eval-haiku.json: predicciones de Haiku [{id, nombre, habilidades}]
 *
 * El gold se arma aparte (eval-gold.json, mismo shape que eval-haiku) y se puntúa
 * con eval-score.ts. Solo lectura de prod. PII → no persistir fuera del scratchpad.
 *
 * Uso: pnpm tsx scripts/eval-habilidades.ts --limit 30 --seed 101 --out <dir>
 */

import { writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { extraerHabilidadesYResidir } from "../src/lib/cv/habilidades";

config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const arg = (name: string, def: string) => {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : def;
};
const LIMIT = Number(arg("--limit", "30"));
const SEED = Number(arg("--seed", "101"));
const OUT = arg("--out", ".");

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

async function main() {
  const { data, error } = await supabase
    .from("candidatos")
    .select("id, nombre, apellido, cv_procesado_texto");
  if (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }

  const conCv = (data ?? []).filter((c) => (c.cv_procesado_texto ?? "").trim());
  const rand = rng(SEED);
  const muestra = [...conCv].sort(() => rand() - 0.5).slice(0, LIMIT);

  const dump: string[] = [];
  const preds: { id: string; nombre: string; habilidades: string[] }[] = [];

  for (let i = 0; i < muestra.length; i++) {
    const c = muestra[i];
    const nombre = `${c.nombre} ${c.apellido}`.trim();
    const r = await extraerHabilidadesYResidir(c.cv_procesado_texto ?? "");
    preds.push({ id: c.id, nombre, habilidades: r.habilidades });
    dump.push(
      `${"#".repeat(80)}\n[${i + 1}] id=${c.id}\nNOMBRE: ${nombre}\n${"-".repeat(80)}\n${c.cv_procesado_texto}\n`,
    );
    console.log(`${i + 1}/${muestra.length} ${nombre} → ${r.habilidades.length} habs`);
  }

  writeFileSync(`${OUT}/eval-cvs.txt`, dump.join("\n"));
  writeFileSync(`${OUT}/eval-haiku.json`, JSON.stringify(preds, null, 2));
  console.log(`\n✓ ${muestra.length} CVs · seed ${SEED}`);
  console.log(`  ${OUT}/eval-cvs.txt`);
  console.log(`  ${OUT}/eval-haiku.json`);
}

main();
