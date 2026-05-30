/**
 * Diagnóstico de la categorización automática de candidatos.
 *
 * Lee todos los candidatos con CV procesado, re-corre la categorización ACTUAL
 * (misma lógica que el pipeline en producción) y genera un HTML revisable para
 * que Oriana corrija qué categorías están bien y cuáles faltan.
 *
 * El HTML resultante tiene PII (nombres + CVs reales) → NO se committea.
 *
 * Uso: pnpm tsx scripts/diagnostico-categorias.ts
 * Salida: diagnostico-categorias.html (gitignored)
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { CATEGORIAS_GL } from "../src/lib/cv/categorias";
import { writeFileSync } from "fs";

config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// --- Copia fiel de detectarCategorias() en src/lib/cv/post-process.ts ---
// Mantener en sync. Es la lógica que corre hoy en producción.
async function detectarCategoriasActual(cvTexto: string): Promise<string[]> {
  if (!cvTexto.trim()) return [];
  const lista = CATEGORIAS_GL.join(", ");
  const { text } = await generateText({
    model: anthropic("claude-haiku-4-5-20251001"),
    prompt: `Dado este CV de un candidato rural/agropecuario, indicá cuáles categorías aplican realmente según su experiencia comprobada. Solo incluí las que el CV evidencia claramente.

Categorías posibles: ${lista}

CV:
${cvTexto.slice(0, 3000)}

Respondé ÚNICAMENTE con un JSON array. Ejemplo: ["Peón General", "Tractorista"]`,
  });
  const match = text.match(/\[[\s\S]*?\]/);
  if (!match) return [];
  try {
    const parsed: unknown = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return [];
    return (parsed as unknown[]).filter(
      (c): c is string => typeof c === "string" && CATEGORIAS_GL.includes(c),
    );
  } catch {
    return [];
  }
}

type Fila = {
  id: string;
  nombre: string;
  apellido: string;
  guardadas: string[];
  detectadas: string[];
  cv: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function generarHTML(filas: Fila[]): string {
  const cats = JSON.stringify(CATEGORIAS_GL);
  const tarjetas = filas
    .map((f, idx) => {
      const detectadasSet = new Set(f.detectadas);
      const checkboxes = CATEGORIAS_GL.map((cat) => {
        const checked = detectadasSet.has(cat) ? "checked" : "";
        const cls = detectadasSet.has(cat) ? "detectada" : "";
        return `<label class="cat ${cls}"><input type="checkbox" data-cat="${escapeHtml(cat)}" ${checked}> ${escapeHtml(cat)}</label>`;
      }).join("");
      return `
<div class="card" data-id="${f.id}" data-nombre="${escapeHtml(f.nombre + " " + f.apellido)}" data-detectadas='${escapeHtml(JSON.stringify(f.detectadas))}'>
  <h2>${idx + 1}. ${escapeHtml(f.nombre)} ${escapeHtml(f.apellido)}</h2>
  <p class="meta">Claude detectó: ${f.detectadas.length ? f.detectadas.map((c) => `<span class="chip">${escapeHtml(c)}</span>`).join("") : "<em>ninguna</em>"}</p>
  <details><summary>Ver CV</summary><pre>${escapeHtml(f.cv)}</pre></details>
  <p class="instruccion">Marcá las categorías correctas (las resaltadas son las que detectó Claude):</p>
  <div class="cats">${checkboxes}</div>
</div>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><title>Diagnóstico categorías GL</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 820px; margin: 0 auto; padding: 24px; background: #f7f7f5; color: #1a1a1a; }
  h1 { font-size: 22px; }
  .intro { background: #fff; border: 1px solid #e2e2dd; border-radius: 8px; padding: 16px; margin-bottom: 24px; font-size: 14px; }
  .card { background: #fff; border: 1px solid #e2e2dd; border-radius: 8px; padding: 18px; margin-bottom: 18px; }
  .card h2 { font-size: 17px; margin: 0 0 8px; }
  .meta { font-size: 13px; color: #555; margin: 0 0 10px; }
  .chip { display: inline-block; background: #e8f0e8; color: #2c5c2c; border-radius: 4px; padding: 2px 8px; margin: 0 4px 4px 0; font-size: 12px; }
  details { margin: 10px 0; }
  summary { cursor: pointer; font-size: 13px; color: #2c5c5c; }
  pre { white-space: pre-wrap; font-size: 12px; background: #fafaf8; padding: 12px; border-radius: 6px; max-height: 320px; overflow: auto; border: 1px solid #eee; }
  .instruccion { font-size: 13px; font-weight: 600; margin: 12px 0 6px; }
  .cats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; }
  .cat { font-size: 13px; padding: 4px 6px; border-radius: 4px; cursor: pointer; }
  .cat.detectada { background: #fdf6e3; }
  .cat input { margin-right: 6px; }
  .bar { position: sticky; bottom: 0; background: #fff; border-top: 2px solid #2c5c2c; padding: 14px; text-align: center; margin-top: 24px; }
  button { background: #2c5c2c; color: #fff; border: 0; border-radius: 6px; padding: 10px 20px; font-size: 14px; cursor: pointer; }
  #salida { width: 100%; height: 120px; margin-top: 12px; font-family: monospace; font-size: 11px; display: none; }
</style></head><body>
<h1>Diagnóstico de categorías — Gestiones Laborales</h1>
<div class="intro">
  <strong>Cómo revisar:</strong> por cada candidato, las categorías <span class="chip">resaltadas</span> son las que detectó Claude automáticamente.
  Marcá o desmarcá los checkboxes para dejar <strong>solo las categorías correctas</strong> según la experiencia real del candidato.
  Cuando termines, tocá "Exportar correcciones" abajo de todo y mandanos el texto que aparece.
</div>
${tarjetas}
<div class="bar">
  <button onclick="exportar()">Exportar correcciones</button>
  <textarea id="salida" readonly></textarea>
</div>
<script>
  const CATEGORIAS = ${cats};
  function exportar() {
    const out = [];
    document.querySelectorAll('.card').forEach(card => {
      const corregidas = [...card.querySelectorAll('input[type=checkbox]:checked')].map(i => i.dataset.cat);
      out.push({
        id: card.dataset.id,
        nombre: card.dataset.nombre,
        detectadas: JSON.parse(card.dataset.detectadas),
        corregidas,
      });
    });
    const ta = document.getElementById('salida');
    ta.style.display = 'block';
    ta.value = JSON.stringify(out, null, 2);
    ta.select();
  }
</script>
</body></html>`;
}

async function main() {
  console.log("Leyendo candidatos con CV procesado…");
  const { data, error } = await supabase
    .from("candidatos")
    .select("id, nombre, apellido, categorias, cv_procesado_texto")
    .not("cv_procesado_texto", "is", null)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error leyendo candidatos:", error.message);
    process.exit(1);
  }
  if (!data || data.length === 0) {
    console.log("No hay candidatos con CV procesado.");
    return;
  }

  console.log(`${data.length} candidatos. Re-corriendo categorización (Haiku)…\n`);
  const filas: Fila[] = [];
  for (const c of data) {
    const cv = (c.cv_procesado_texto as string) ?? "";
    const detectadas = await detectarCategoriasActual(cv);
    const guardadas = (c.categorias as string[] | null) ?? [];
    filas.push({
      id: c.id as string,
      nombre: (c.nombre as string) ?? "",
      apellido: (c.apellido as string) ?? "",
      guardadas,
      detectadas,
      cv,
    });
    console.log(`  ${c.nombre} ${c.apellido}: [${detectadas.join(", ") || "—"}]`);
  }

  const html = generarHTML(filas);
  writeFileSync("diagnostico-categorias.html", html);
  console.log(`\n✓ Generado diagnostico-categorias.html con ${filas.length} candidatos.`);
  console.log("  Abrilo en el navegador para que Oriana lo revise.");
}

main();
