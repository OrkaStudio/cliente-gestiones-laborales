/**
 * Diagnóstico de completitud del parseo de CVs.
 *
 * Lee todos los candidatos y mide qué % tiene cada campo lleno, más la
 * distribución de trabajos de experiencia por candidato. Sirve para detectar
 * dónde el parseo extrae poco — sin llamar a Claude, solo cuenta sobre la base.
 *
 * Salida: estadísticas agregadas a consola (sin PII).
 * Uso: pnpm tsx scripts/diagnostico-completitud.ts
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Campos a analizar, agrupados por tipo de "vacío"
const CAMPOS_STRING = [
  "email", "telefono", "dni", "fecha_nacimiento", "lugar_nacimiento",
  "estado_civil", "hijos", "ubicacion", "domicilio_completo", "educacion",
  "muebles_propios", "animales", "pretension_salarial", "disponibilidad",
  "ultimo_puesto", "perfil_laboral", "informacion_adicional", "cv_procesado_texto",
];
const CAMPOS_BOOL_NUM = ["vehiculo_propio", "licencia_conducir", "movilidad", "hectareas_max", "personal_a_cargo_max"];
const CAMPOS_ARRAY = ["tipos_ganaderia", "idiomas", "categorias", "referencias"];

function vacioString(v: unknown): boolean {
  return v === null || v === undefined || (typeof v === "string" && v.trim() === "");
}
function vacioBoolNum(v: unknown): boolean {
  return v === null || v === undefined;
}
function vacioArray(v: unknown): boolean {
  return !Array.isArray(v) || v.length === 0;
}

function barra(pct: number): string {
  const n = Math.round(pct / 5);
  return "█".repeat(n) + "░".repeat(20 - n);
}

async function main() {
  const { data: candidatos, error } = await supabase.from("candidatos").select("*");
  if (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
  if (!candidatos || candidatos.length === 0) {
    console.log("No hay candidatos.");
    return;
  }

  const total = candidatos.length;
  console.log(`\n=== COMPLETITUD DEL PARSEO — ${total} candidatos ===\n`);
  console.log("Campo                          Lleno   ");

  type Stat = { campo: string; llenos: number };
  const stats: Stat[] = [];

  for (const campo of CAMPOS_STRING) {
    stats.push({ campo, llenos: candidatos.filter((c) => !vacioString(c[campo])).length });
  }
  for (const campo of CAMPOS_BOOL_NUM) {
    stats.push({ campo, llenos: candidatos.filter((c) => !vacioBoolNum(c[campo])).length });
  }
  for (const campo of CAMPOS_ARRAY) {
    stats.push({ campo, llenos: candidatos.filter((c) => !vacioArray(c[campo])).length });
  }

  // Ordenar de menos lleno a más lleno (los sospechosos primero)
  stats.sort((a, b) => a.llenos - b.llenos);
  for (const s of stats) {
    const pct = (s.llenos / total) * 100;
    console.log(`${s.campo.padEnd(28)} ${String(Math.round(pct)).padStart(3)}%  ${barra(pct)}  (${s.llenos}/${total})`);
  }

  // Experiencia laboral: distribución de trabajos por candidato
  const { data: exp } = await supabase.from("experiencia_laboral").select("candidato_id");
  const porCandidato = new Map<string, number>();
  for (const e of exp ?? []) {
    const id = e.candidato_id as string;
    porCandidato.set(id, (porCandidato.get(id) ?? 0) + 1);
  }
  const dist = { "0": 0, "1": 0, "2": 0, "3": 0, "4+": 0 };
  for (const c of candidatos) {
    const n = porCandidato.get(c.id as string) ?? 0;
    if (n === 0) dist["0"]++;
    else if (n === 1) dist["1"]++;
    else if (n === 2) dist["2"]++;
    else if (n === 3) dist["3"]++;
    else dist["4+"]++;
  }
  const totalExp = (exp ?? []).length;
  console.log(`\n=== EXPERIENCIA LABORAL — ${totalExp} trabajos en total (promedio ${(totalExp / total).toFixed(1)}/candidato) ===\n`);
  for (const [k, v] of Object.entries(dist)) {
    console.log(`  ${k.padEnd(3)} trabajos: ${String(v).padStart(3)} candidatos  ${"▪".repeat(v)}`);
  }
  if (dist["0"] > 0) {
    console.log(`\n  ⚠ ${dist["0"]} candidatos SIN ninguna experiencia extraída — revisar si es falla de parseo o CV sin datos.`);
  }
}

main();
