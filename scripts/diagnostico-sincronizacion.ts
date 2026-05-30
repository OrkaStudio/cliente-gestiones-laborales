/**
 * Diagnóstico de sincronización texto ↔ campos estructurados.
 *
 * El parseo genera el cv_procesado_texto (lo que lee Oriana) Y los campos
 * estructurados (los que usa el matching). Este script detecta datos que
 * aparecen en el TEXTO pero NO llegaron al CAMPO — es información que el
 * matching ignoraría.
 *
 * Read-only, no llama a Claude. Salida a consola (incluye nombres → local).
 * Uso: pnpm tsx scripts/diagnostico-sincronizacion.ts
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Etiqueta en el cv_procesado_texto → campo estructurado en la tabla.
// `alt`: campo alternativo donde el dato también puede estar legítimamente
// (ej: domicilio parcial = solo ciudad → va a `ubicacion`, no a domicilio_completo).
const MAPEO: { etiqueta: string; campo: string; tipo: "string" | "bool"; alt?: string }[] = [
  { etiqueta: "DNI", campo: "dni", tipo: "string" },
  { etiqueta: "Fecha de nacimiento", campo: "fecha_nacimiento", tipo: "string" },
  { etiqueta: "Teléfono", campo: "telefono", tipo: "string" },
  { etiqueta: "Email", campo: "email", tipo: "string" },
  { etiqueta: "Estado civil", campo: "estado_civil", tipo: "string" },
  { etiqueta: "Hijos", campo: "hijos", tipo: "string" },
  { etiqueta: "Estudios", campo: "educacion", tipo: "string" },
  { etiqueta: "Domicilio", campo: "domicilio_completo", tipo: "string", alt: "ubicacion" },
  { etiqueta: "Disponibilidad", campo: "disponibilidad", tipo: "string" },
  { etiqueta: "Pretensión salarial", campo: "pretension_salarial", tipo: "string" },
  { etiqueta: "Vehículo propio", campo: "vehiculo_propio", tipo: "bool" },
  { etiqueta: "Licencia de conducir", campo: "licencia_conducir", tipo: "bool" },
];

// Extrae el valor de una etiqueta del texto. Devuelve null si no está o es "sin dato".
function extraerDelTexto(texto: string, etiqueta: string): string | null {
  const re = new RegExp(`^${etiqueta.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:\\s*(.+)$`, "im");
  const m = texto.match(re);
  if (!m) return null;
  const v = m[1].trim();
  if (v === "" || v.toLowerCase() === "sin dato") return null;
  return v;
}

function campoVacio(valor: unknown, tipo: "string" | "bool"): boolean {
  if (tipo === "bool") return valor === null || valor === undefined;
  return valor === null || valor === undefined || (typeof valor === "string" && valor.trim() === "");
}

async function main() {
  const { data, error } = await supabase
    .from("candidatos")
    .select("*")
    .not("cv_procesado_texto", "is", null);

  if (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
  const candidatos = data ?? [];
  console.log(`\n=== SINCRONIZACIÓN texto → campos — ${candidatos.length} candidatos ===\n`);

  const desyncPorCampo = new Map<string, { count: number; ejemplos: string[] }>();
  for (const m of MAPEO) desyncPorCampo.set(m.campo, { count: 0, ejemplos: [] });

  for (const c of candidatos) {
    const texto = (c.cv_procesado_texto as string) ?? "";
    const nombre = `${c.nombre} ${c.apellido}`;
    for (const m of MAPEO) {
      const valorTexto = extraerDelTexto(texto, m.etiqueta);
      // El dato está "en campos" si está en el campo principal O en el alternativo.
      const vacioCampo = campoVacio(c[m.campo], m.tipo) && (!m.alt || campoVacio(c[m.alt], "string"));
      // Desincronización: el texto tiene el dato pero ningún campo lo tiene.
      if (valorTexto !== null && vacioCampo) {
        const entry = desyncPorCampo.get(m.campo)!;
        entry.count++;
        if (entry.ejemplos.length < 3) entry.ejemplos.push(`${nombre} → texto dice "${valorTexto.slice(0, 30)}"`);
      }
    }
  }

  const filas = MAPEO.map((m) => ({ campo: m.campo, ...desyncPorCampo.get(m.campo)! })).sort((a, b) => b.count - a.count);

  let totalDesync = 0;
  for (const f of filas) {
    totalDesync += f.count;
    const flag = f.count > 0 ? "⚠" : "✓";
    console.log(`${flag} ${f.campo.padEnd(22)} ${String(f.count).padStart(2)} candidatos con dato en texto pero campo vacío`);
    for (const ej of f.ejemplos) console.log(`     · ${ej}`);
  }

  console.log(`\n${totalDesync === 0 ? "✓ Sin desincronización: todo lo que está en el texto está en los campos." : `⚠ ${totalDesync} desincronizaciones totales — datos en el texto que el matching ignoraría.`}`);
}

main();
