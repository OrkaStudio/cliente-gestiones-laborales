/**
 * Diagnóstico de calidad de las preguntas sugeridas.
 *
 * Mide cuántas preguntas se generan por candidato y detecta preguntas
 * redundantes: las que piden un dato que YA está en los campos del candidato.
 * Read-only, sin Claude. Salida a consola (incluye nombres → local).
 *
 * Uso: pnpm tsx scripts/diagnostico-preguntas.ts
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Keywords que, si aparecen en una pregunta, apuntan a un campo concreto.
// Si ese campo ya tiene dato → la pregunta es redundante.
// `excluir`: si la pregunta contiene alguna de estas, NO cuenta (evita falsos
// positivos: ej. "teléfono de la referencia" no pide el teléfono del candidato).
const REGLAS: { campo: string; tipo: "string" | "bool"; keywords: string[]; excluir?: string[] }[] = [
  { campo: "dni", tipo: "string", keywords: ["dni", "documento"] },
  { campo: "fecha_nacimiento", tipo: "string", keywords: ["fecha de nacimiento", "fecha y lugar de nacimiento"] },
  { campo: "telefono", tipo: "string", keywords: ["tu teléfono", "tu telefono", "tu celular", "tu número", "tu numero"], excluir: ["referencia"] },
  { campo: "email", tipo: "string", keywords: ["tu email", "tu correo", "tu mail"], excluir: ["referencia"] },
  { campo: "estado_civil", tipo: "string", keywords: ["estado civil", "estás casado", "estas casado", "sos soltero"] },
  { campo: "hijos", tipo: "string", keywords: ["tenés hijos", "tenes hijos", "tienes hijos"] },
  { campo: "domicilio_completo", tipo: "string", keywords: ["domicilio completo", "dirección exacta", "direccion exacta", "dirección completa"] },
  { campo: "vehiculo_propio", tipo: "bool", keywords: ["vehículo propio", "vehiculo propio", "auto propio"] },
  { campo: "licencia_conducir", tipo: "bool", keywords: ["licencia de conducir", "carnet de conducir", "registro de conducir"] },
  { campo: "pretension_salarial", tipo: "string", keywords: ["pretensión salarial", "pretension salarial", "remuneración pretendida", "cuánto pretendés"], excluir: ["pareja"] },
];

function lleno(valor: unknown, tipo: "string" | "bool"): boolean {
  if (tipo === "bool") return valor !== null && valor !== undefined;
  return valor !== null && valor !== undefined && !(typeof valor === "string" && valor.trim() === "");
}

async function main() {
  const { data, error } = await supabase.from("candidatos").select("*");
  if (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
  const candidatos = data ?? [];
  console.log(`\n=== CALIDAD DE PREGUNTAS SUGERIDAS — ${candidatos.length} candidatos ===\n`);

  let totalPreguntas = 0;
  const dist = { "0": 0, "1-3": 0, "4-6": 0, "7-10": 0, "11+": 0 };
  let maxPreg = 0;
  let maxNombre = "";
  const redundantes: string[] = [];

  for (const c of candidatos) {
    const preguntas = (c.preguntas_sugeridas as string[] | null) ?? [];
    const n = preguntas.length;
    totalPreguntas += n;
    if (n > maxPreg) { maxPreg = n; maxNombre = `${c.nombre} ${c.apellido}`; }

    if (n === 0) dist["0"]++;
    else if (n <= 3) dist["1-3"]++;
    else if (n <= 6) dist["4-6"]++;
    else if (n <= 10) dist["7-10"]++;
    else dist["11+"]++;

    // Redundancia: ¿alguna pregunta pide un dato que ya está?
    for (const preg of preguntas) {
      const low = preg.toLowerCase();
      for (const r of REGLAS) {
        if (r.excluir?.some((e) => low.includes(e))) continue;
        if (r.keywords.some((k) => low.includes(k)) && lleno(c[r.campo], r.tipo)) {
          redundantes.push(`${c.nombre} ${c.apellido} [${r.campo} ya está] → "${preg.slice(0, 60)}"`);
          break;
        }
      }
    }
  }

  const conPreg = candidatos.filter((c) => ((c.preguntas_sugeridas as string[] | null) ?? []).length > 0).length;
  console.log(`Promedio: ${(totalPreguntas / Math.max(1, candidatos.length)).toFixed(1)} preguntas/candidato`);
  console.log(`Máximo: ${maxPreg} (${maxNombre})`);
  console.log(`Candidatos con al menos 1 pregunta: ${conPreg}/${candidatos.length}\n`);

  console.log("Distribución:");
  for (const [k, v] of Object.entries(dist)) {
    console.log(`  ${k.padEnd(5)} preguntas: ${String(v).padStart(3)} candidatos  ${"▪".repeat(v)}`);
  }

  console.log(`\n=== REDUNDANCIA: preguntas que piden datos que YA están (${redundantes.length}) ===\n`);
  if (redundantes.length === 0) {
    console.log("  ✓ Ninguna — las preguntas no piden datos ya presentes.");
  } else {
    for (const r of redundantes.slice(0, 20)) console.log(`  ⚠ ${r}`);
    if (redundantes.length > 20) console.log(`  … y ${redundantes.length - 20} más`);
  }
}

main();
