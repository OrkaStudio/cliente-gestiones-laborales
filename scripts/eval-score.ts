/**
 * Puntúa las predicciones de Haiku (eval-haiku.json) contra el gold hecho a mano
 * (eval-gold.json). Precisión / recall / F0.5 agregados + tabla por-label + por-CV.
 * No toca nada. Uso: pnpm tsx scripts/eval-score.ts <dir>
 */

import { readFileSync } from "node:fs";

type Row = { id: string; nombre: string; habilidades: string[] };

const DIR = process.argv[2] ?? ".";
const gold: Row[] = JSON.parse(readFileSync(`${DIR}/eval-gold.json`, "utf8"));
const pred: Row[] = JSON.parse(readFileSync(`${DIR}/eval-haiku.json`, "utf8"));
const predById = new Map(pred.map((r) => [r.id, new Set(r.habilidades)]));

let TP = 0;
let FP = 0;
let FN = 0;
const perLabel: Record<string, { tp: number; fp: number; fn: number }> = {};
const bump = (l: string, k: "tp" | "fp" | "fn") => {
  (perLabel[l] ??= { tp: 0, fp: 0, fn: 0 })[k]++;
};

const casos: string[] = [];
for (const g of gold) {
  const p = predById.get(g.id) ?? new Set<string>();
  const goldSet = new Set(g.habilidades);
  const fp: string[] = [];
  const fn: string[] = [];
  for (const h of p) {
    if (goldSet.has(h)) {
      TP++;
      bump(h, "tp");
    } else {
      FP++;
      fp.push(h);
      bump(h, "fp");
    }
  }
  for (const h of goldSet) {
    if (!p.has(h)) {
      FN++;
      fn.push(h);
      bump(h, "fn");
    }
  }
  if (fp.length || fn.length) {
    casos.push(
      `  ${g.nombre}\n${fn.length ? `      FALTÓ (recall): ${fn.join(" · ")}\n` : ""}${fp.length ? `      DE MÁS (precisión): ${fp.join(" · ")}\n` : ""}`,
    );
  }
}

const prec = TP / (TP + FP);
const rec = TP / (TP + FN);
const f = (b: number) => ((1 + b * b) * prec * rec) / (b * b * prec + rec);

console.log("════════════ AGREGADO (30 CVs) ════════════");
console.log(`  TP ${TP}  ·  FP ${FP}  ·  FN ${FN}`);
console.log(`  Precisión : ${prec.toFixed(3)}`);
console.log(`  Recall    : ${rec.toFixed(3)}`);
console.log(`  F0.5 (prec×2): ${f(0.5).toFixed(3)}   F1: ${f(1).toFixed(3)}`);

console.log("\n════════════ POR LABEL (solo con errores) ════════════");
const rows = Object.entries(perLabel)
  .map(([l, v]) => ({ l, ...v, p: v.tp + v.fp, g: v.tp + v.fn }))
  .sort((a, b) => b.fp + b.fn - (a.fp + a.fn));
for (const r of rows) {
  if (r.fp === 0 && r.fn === 0) continue;
  console.log(
    `  ${r.l.padEnd(34)} tp:${r.tp} fp:${r.fp} fn:${r.fn}  (gold:${r.g} pred:${r.p})`,
  );
}

console.log("\n════════════ CASOS CON DISCREPANCIA ════════════");
console.log(casos.join("\n"));
