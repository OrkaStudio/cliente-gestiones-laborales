import { createServiceClient } from "@/lib/supabase/service";
import { parsearCV } from "@/lib/cv/parse";
import { upsertCandidato } from "@/lib/cv/upsert-candidato";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Parsear CVs con Claude puede tomar hasta 30s
export const maxDuration = 60;

const BodySchema = z.object({
  secret: z.string(),
  email_id: z.string(),
  remitente_nombre: z.string(),
  remitente_email: z.string(),
  asunto: z.string().optional().default(""),
  fecha: z.string(),
  archivo_nombre: z.string(),
  archivo_base64: z.string(),
  archivo_mime: z.string(),
});

export async function POST(req: NextRequest) {
  // 1. Parsear y validar body
  let body: z.infer<typeof BodySchema>;
  try {
    const raw = await req.json();
    body = BodySchema.parse(raw);
  } catch (err) {
    console.error("[webhook/cv] bad_request:", JSON.stringify(err));
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // 2. Validar secret — rechazar sin dar pistas sobre la URL
  if (body.secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // 3. Deduplicación: si ya procesamos este email_id, responder 200
  const { data: yaProcessado } = await supabase
    .from("emails_procesados")
    .select("id")
    .eq("email_id", body.email_id)
    .maybeSingle();

  if (yaProcessado) {
    return NextResponse.json({ status: "already_processed" });
  }

  // 4. Decodificar archivo desde base64
  const buffer = Buffer.from(body.archivo_base64, "base64");

  // 5. Subir CV crudo a Supabase Storage (upsert por si Make reintenta)
  const storagePath = `${body.email_id}/${body.archivo_nombre}`;
  const { error: uploadError } = await supabase.storage
    .from("cv-crudos")
    .upload(storagePath, buffer, {
      contentType: body.archivo_mime,
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: "storage_upload_failed", detail: uploadError.message },
      { status: 500 },
    );
  }

  // 6. Parsear CV con Claude API — normalizar MIME si viene como octet-stream
  const ext = body.archivo_nombre.split(".").pop()?.toLowerCase() ?? "";
  const mimeMap: Record<string, string> = {
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    doc: "application/msword",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };
  const mimeEfectivo = body.archivo_mime === "application/octet-stream" && mimeMap[ext]
    ? mimeMap[ext]
    : body.archivo_mime;

  let candidatoParseado;
  try {
    candidatoParseado = await parsearCV(buffer, mimeEfectivo, body.archivo_nombre);
  } catch (err) {
    return NextResponse.json(
      { error: "parse_failed", detail: err instanceof Error ? err.message : "unknown" },
      { status: 500 },
    );
  }

  // 7. Upsert candidato en Supabase
  let candidatoId: string;
  try {
    candidatoId = await upsertCandidato(candidatoParseado, storagePath);
  } catch (err) {
    return NextResponse.json(
      { error: "upsert_failed", detail: err instanceof Error ? err.message : "unknown" },
      { status: 500 },
    );
  }

  // 8. Marcar email como procesado (solo en éxito, para permitir reintentos en error)
  await supabase.from("emails_procesados").insert({
    email_id: body.email_id,
    candidato_id: candidatoId,
  });

  return NextResponse.json({ status: "ok", candidato_id: candidatoId });
}
