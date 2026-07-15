/**
 * Mide el costo REAL de la extracción de habilidades sobre una muestra chica.
 * NO escribe en la base (dry). Corre el mismo extractor que el backfill/pipeline
 * y reporta tokens reales (input/output devueltos por la API) + costo a precio
 * Haiku 4.5, con la proyección a los 179.
 *
 * Uso: pnpm tsx scripts/medir-costo-habilidades.ts --limit 10
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { extraerHabilidadesYResidir, usoHabilidades } from "../src/lib/cv/habilidades";

config({ path: ".env.local" });

// Precio Haiku 4.5 (USD por millón de tokens).
const PRECIO_IN = 1.0;
const PRECIO_OUT = 5.0;
const TOTAL_PADRON = 179;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
const limitArg = process.argv.indexOf("--limit");
const LIMIT = limitArg !== -1 ? Number(process.argv[limitArg + 1]) : 10;

async function main() {
  const { data, error } = await supabase
    .from("candidatos")
    .select("id, nombre, apellido, cv_procesado_texto")
    .order("created_at", { ascending: true });
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  const conCv = (data ?? []).filter((c) => (c.cv_procesado_texto ?? "").trim()).slice(0, LIMIT);

  console.log(`Midiendo ${conCv.length} CVs (dry, no escribe)…\n`);
  const t0 = Date.now();
  for (let i = 0; i < conCv.length; i++) {
    const c = conCv[i];
    const r = await extraerHabilidadesYResidir(c.cv_procesado_texto ?? "");
    console.log(`  ${i + 1}/${conCv.length} ${c.nombre} ${c.apellido} → ${r.habilidades.length} habs`);
  }
  const seg = (Date.now() - t0) / 1000;

  const { llamadas, inputTokens, outputTokens } = usoHabilidades;
  const costoIn = (inputTokens / 1e6) * PRECIO_IN;
  const costoOut = (outputTokens / 1e6) * PRECIO_OUT;
  const costo = costoIn + costoOut;
  const porCv = costo / llamadas;

  console.log("\n──────── USO REAL ────────");
  console.log(`  llamadas: ${llamadas}  ·  ${seg.toFixed(1)}s (${(seg / llamadas).toFixed(1)}s/CV)`);
  console.log(`  input : ${inputTokens.toLocaleString()} tok  → US$ ${costoIn.toFixed(4)}`);
  console.log(`  output: ${outputTokens.toLocaleString()} tok  → US$ ${costoOut.toFixed(4)}`);
  console.log(`  TOTAL muestra: US$ ${costo.toFixed(4)}  (US$ ${porCv.toFixed(5)}/CV)`);
  console.log(`\n  Proyección a ${TOTAL_PADRON} candidatos: US$ ${(porCv * TOTAL_PADRON).toFixed(3)}`);
}

main();
