/**
 * Reprocesa el CV de un candidato existente con el prompt actualizado.
 * Uso: pnpm tsx scripts/reprocesar-candidato.ts "Emmanuel" "García"
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { parsearCV } from "../src/lib/cv/parse";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function main() {
  const [, , nombre, apellido] = process.argv;
  if (!nombre || !apellido) {
    console.error("Uso: pnpm tsx scripts/reprocesar-candidato.ts <nombre> <apellido>");
    process.exit(1);
  }

  // 1. Buscar candidato
  const { data: candidato, error } = await supabase
    .from("candidatos")
    .select("id, nombre, apellido, cv_crudo_url")
    .ilike("nombre", `%${nombre}%`)
    .ilike("apellido", `%${apellido}%`)
    .maybeSingle();

  if (error || !candidato) {
    console.error("Candidato no encontrado:", error?.message);
    process.exit(1);
  }

  console.log(`Encontrado: ${candidato.nombre} ${candidato.apellido} (${candidato.id})`);
  console.log(`CV path: ${candidato.cv_crudo_url}`);

  if (!candidato.cv_crudo_url) {
    console.error("El candidato no tiene cv_crudo_url en la DB");
    process.exit(1);
  }

  // 2. Descargar CV desde Storage
  const { data: fileData, error: downloadError } = await supabase.storage
    .from("cv-crudos")
    .download(candidato.cv_crudo_url);

  if (downloadError || !fileData) {
    console.error("Error descargando CV:", downloadError?.message);
    process.exit(1);
  }

  const buffer = Buffer.from(await fileData.arrayBuffer());
  const nombreArchivo = candidato.cv_crudo_url.split("/").pop() ?? "cv.pdf";
  const ext = nombreArchivo.split(".").pop()?.toLowerCase() ?? "pdf";
  const mimeMap: Record<string, string> = {
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };
  const mimeType = mimeMap[ext] ?? "application/pdf";

  console.log(`Archivo: ${nombreArchivo} (${mimeType}, ${buffer.length} bytes)`);
  console.log("Procesando con Claude...");

  // 3. Reprocesar con el prompt actualizado
  const parseado = await parsearCV(buffer, mimeType, nombreArchivo);

  console.log("Procesado. Actualizando DB...");

  // 4. Actualizar cv_procesado_texto y preguntas_sugeridas
  const { error: updateError } = await supabase
    .from("candidatos")
    .update({
      cv_procesado_texto: parseado.cv_procesado_texto,
      preguntas_sugeridas: parseado.preguntas_sugeridas,
    })
    .eq("id", candidato.id);

  if (updateError) {
    console.error("Error actualizando:", updateError.message);
    process.exit(1);
  }

  console.log("✓ Candidato actualizado correctamente");
  console.log("\n--- CV procesado (preview) ---");
  console.log(parseado.cv_procesado_texto.slice(0, 800));
}

main().catch(console.error);
