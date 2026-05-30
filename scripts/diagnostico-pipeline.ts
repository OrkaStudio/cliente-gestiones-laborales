/**
 * Diagnóstico de salud histórica del pipeline de CVs.
 *
 * Lee webhook_logs en agregado: tasa de éxito/fallo, motivos de fallo y
 * rango temporal. Read-only, sin Claude. Salida a consola.
 *
 * Uso: pnpm tsx scripts/diagnostico-pipeline.ts
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Extrae el "motivo" de un detalle de fallo: el prefijo antes de ":" o el texto entero.
function motivoFallo(detalle: string | null): string {
  if (!detalle) return "(sin detalle)";
  const idx = detalle.indexOf(":");
  return idx > 0 ? detalle.slice(0, idx).trim() : detalle.trim();
}

async function main() {
  const { data, error } = await supabase
    .from("webhook_logs")
    .select("email_id, estado, detalle, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
  const logs = data ?? [];
  if (logs.length === 0) {
    console.log("No hay registros en webhook_logs.");
    return;
  }

  // Rango temporal
  const primero = new Date(logs[0].created_at as string);
  const ultimo = new Date(logs[logs.length - 1].created_at as string);
  const dias = Math.max(1, Math.round((ultimo.getTime() - primero.getTime()) / 86400000));

  console.log(`\n=== SALUD DEL PIPELINE — ${logs.length} eventos en ${dias} días ===`);
  console.log(`    desde ${primero.toLocaleDateString("es-AR")} hasta ${ultimo.toLocaleDateString("es-AR")}\n`);

  // Conteo por estado
  const porEstado = new Map<string, number>();
  for (const l of logs) {
    const e = l.estado as string;
    porEstado.set(e, (porEstado.get(e) ?? 0) + 1);
  }
  console.log("Eventos por estado:");
  for (const [estado, n] of [...porEstado.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${estado.padEnd(12)} ${String(n).padStart(4)}`);
  }

  // Tasa de éxito sobre estados terminales
  const complete = porEstado.get("complete") ?? 0;
  const failed = porEstado.get("failed") ?? 0;
  const duplicate = porEstado.get("duplicate") ?? 0;
  const terminales = complete + failed + duplicate;
  if (terminales > 0) {
    const tasaOk = ((complete + duplicate) / terminales) * 100;
    console.log(`\nTasa de éxito (terminales): ${tasaOk.toFixed(1)}%  (${complete} complete + ${duplicate} duplicate / ${terminales})`);
    console.log(`Fallos: ${failed} (${((failed / terminales) * 100).toFixed(1)}%)`);
  }

  // Motivos de fallo agrupados
  const fallos = logs.filter((l) => l.estado === "failed");
  if (fallos.length > 0) {
    const porMotivo = new Map<string, number>();
    for (const f of fallos) {
      const m = motivoFallo(f.detalle as string | null);
      porMotivo.set(m, (porMotivo.get(m) ?? 0) + 1);
    }
    console.log(`\nMotivos de fallo (${fallos.length} total):`);
    for (const [motivo, n] of [...porMotivo.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${String(n).padStart(3)}×  ${motivo}`);
    }
  }
}

main();
