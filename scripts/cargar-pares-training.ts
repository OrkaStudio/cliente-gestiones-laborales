/**
 * Script one-time: carga los pares CV crudo/procesado en cv_pares_training.
 *
 * Uso:
 *   pnpm tsx scripts/cargar-pares-training.ts
 *
 * Requiere en .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY
 *
 * Estructura esperada en training-data/confirmed/:
 *   CRUDOS/   — archivos .pdf, .docx, .jpeg, .jpg, .png
 *   PROCESADOS/ — archivos .pdf con el mismo nombre (normalizado) que el crudo
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import mammoth from "mammoth";
import * as pdfParseMod from "pdf-parse";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pdfParse = (pdfParseMod as any).default ?? pdfParseMod;
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { embedTexto } from "../src/lib/cv/rag";
import { createClient } from "@supabase/supabase-js";

const TRAINING_DIR = path.join(process.cwd(), "training-data", "confirmed");
const CRUDOS_DIR = path.join(TRAINING_DIR, "CRUDOS");
const PROCESADOS_DIR = path.join(TRAINING_DIR, "PROCESADOS");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Normaliza nombre de archivo para matching crudo↔procesado
function normalizarNombre(filename: string): string {
  return path.basename(filename, path.extname(filename))
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

async function extraerTexto(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  const buffer = fs.readFileSync(filePath);

  if (ext === ".docx") {
    const { value } = await mammoth.extractRawText({ buffer });
    return value.trim();
  }

  if (ext === ".pdf") {
    const data = await pdfParse(buffer);
    return data.text.trim();
  }

  if ([".jpeg", ".jpg", ".png"].includes(ext)) {
    // Usar Claude vision para extraer texto de imágenes
    const base64 = buffer.toString("base64");
    const mediaType = ext === ".png" ? "image/png" : "image/jpeg";

    const { text } = await generateText({
      model: anthropic("claude-sonnet-4-6"),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              image: base64,
              mimeType: mediaType,
            } as { type: "image"; image: string; mimeType: string },
            {
              type: "text",
              text: "Transcribí el texto de este CV exactamente como aparece, sin formatear ni resumir. Solo el texto plano.",
            },
          ],
        },
      ],
    });
    return text.trim();
  }

  throw new Error(`Formato no soportado: ${ext}`);
}

// Pares que tienen 2 crudos para 1 procesado — skipear
const SKIP_CRUDOS = new Set([
  "barrera claudio",
  "rimunda ivana",
]);

async function main() {
  if (!fs.existsSync(CRUDOS_DIR) || !fs.existsSync(PROCESADOS_DIR)) {
    console.error(
      `No se encontraron las carpetas de training en:\n  ${TRAINING_DIR}\n\nEsperaba:\n  CRUDOS/\n  PROCESADOS/`,
    );
    process.exit(1);
  }

  const crudos = fs
    .readdirSync(CRUDOS_DIR)
    .filter((f) => /\.(pdf|docx|jpeg|jpg|png)$/i.test(f));

  const procesados = fs
    .readdirSync(PROCESADOS_DIR)
    .filter((f) => /\.pdf$/i.test(f));

  const procesadoMap = new Map(
    procesados.map((f) => [normalizarNombre(f), f]),
  );

  console.log(`Crudos encontrados: ${crudos.length}`);
  console.log(`Procesados encontrados: ${procesados.length}\n`);

  let insertados = 0;
  let skipped = 0;
  let errores = 0;

  for (const crudoFile of crudos) {
    const nombreNorm = normalizarNombre(crudoFile);

    if (SKIP_CRUDOS.has(nombreNorm)) {
      console.log(`  SKIP (combinado): ${crudoFile}`);
      skipped++;
      continue;
    }

    // Buscar procesado con nombre similar
    let procesadoFile = procesadoMap.get(nombreNorm);
    if (!procesadoFile) {
      // Búsqueda parcial: el procesado puede tener nombre completo vs. "Apellido, Nombre"
      for (const [key, val] of procesadoMap.entries()) {
        const partes = nombreNorm.split(" ").filter((p) => p.length > 2);
        if (partes.every((p) => key.includes(p))) {
          procesadoFile = val;
          break;
        }
      }
    }

    if (!procesadoFile) {
      console.log(`  SIN PAR: ${crudoFile}`);
      skipped++;
      continue;
    }

    try {
      console.log(`Procesando: ${crudoFile} → ${procesadoFile}`);

      const crudoTexto = await extraerTexto(path.join(CRUDOS_DIR, crudoFile));
      const procesadoTexto = await extraerTexto(
        path.join(PROCESADOS_DIR, procesadoFile),
      );

      const embedding = await embedTexto(crudoTexto);

      const candidatoNombre = path.basename(
        procesadoFile,
        path.extname(procesadoFile),
      );

      const { error } = await supabase.from("cv_pares_training").insert({
        candidato_nombre: candidatoNombre,
        cv_crudo_texto: crudoTexto,
        cv_procesado_texto: procesadoTexto,
        embedding: embedding as unknown as string,
      });

      if (error) {
        console.error(`  ERROR insert: ${error.message}`);
        errores++;
      } else {
        console.log(`  OK: ${candidatoNombre}`);
        insertados++;
      }
    } catch (err) {
      console.error(`  ERROR procesando ${crudoFile}:`, err);
      errores++;
    }
  }

  console.log(
    `\nListo: ${insertados} insertados, ${skipped} skipped, ${errores} errores`,
  );
}

main().catch(console.error);
