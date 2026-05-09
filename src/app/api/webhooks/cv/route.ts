import { createServiceClient } from "@/lib/supabase/service";
import { parsearCV } from "@/lib/cv/parse";
import { upsertCandidato } from "@/lib/cv/upsert-candidato";
import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";

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
  // Usamos arrayBuffer en lugar de req.json() — Next.js 16 falla con req.json()
  // en bodies grandes (bug conocido con Turbopack + serverless).
  let body: z.infer<typeof BodySchema>;
  try {
    const ab = await req.arrayBuffer();
    const text = new TextDecoder().decode(ab);
    console.log("[webhook/cv] byteLength:", ab.byteLength, "preview:", text.slice(0, 200));
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch (jsonErr) {
      console.error("[webhook/cv] json_parse_failed:", jsonErr instanceof Error ? jsonErr.message : String(jsonErr));
      return NextResponse.json({ error: "bad_request", detail: "invalid_json" }, { status: 400 });
    }
    try {
      body = BodySchema.parse(raw);
    } catch (zodErr) {
      if (zodErr instanceof ZodError) {
        console.error("[webhook/cv] zod_error:", JSON.stringify(zodErr.issues));
      }
      return NextResponse.json({ error: "bad_request", detail: "schema_mismatch" }, { status: 400 });
    }
  } catch (err) {
    console.error("[webhook/cv] body_unreadable:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "bad_request", detail: "body_unreadable" }, { status: 400 });
  }

  // 2. Validar secret
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

  // 5. Normalizar MIME si viene como octet-stream
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

  // 6. Subir CV crudo a Supabase Storage (upsert por si Make reintenta)
  const storagePath = `${body.email_id}/${body.archivo_nombre}`;
  const { error: uploadError } = await supabase.storage
    .from("cv-crudos")
    .upload(storagePath, buffer, {
      contentType: mimeEfectivo,
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: "storage_upload_failed", detail: uploadError.message },
      { status: 500 },
    );
  }

  // 7. Parsear CV con Claude
  console.log("[webhook/cv] pre_parse mimeEfectivo:", mimeEfectivo, "bufferLen:", buffer.length);
  let candidatoParseado;
  try {
    candidatoParseado = await parsearCV(buffer, mimeEfectivo, body.archivo_nombre);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    const errName = err instanceof Error ? err.constructor.name : typeof err;
    const stack = err instanceof Error ? (err.stack ?? "").slice(0, 800) : "";
    console.error("[webhook/cv] parse_failed type:", errName, "detail:", detail);
    console.error("[webhook/cv] parse_failed stack:", stack);
    return NextResponse.json(
      { error: "parse_failed", detail },
      { status: 500 },
    );
  }

  // 8. Upsert candidato en Supabase
  let candidatoId: string;
  try {
    candidatoId = await upsertCandidato(candidatoParseado, storagePath);
  } catch (err) {
    return NextResponse.json(
      { error: "upsert_failed", detail: err instanceof Error ? err.message : "unknown" },
      { status: 500 },
    );
  }

  // 9. Guardar cv_procesado_texto y preguntas_sugeridas
  try {
    await supabase
      .from("candidatos")
      .update({
        cv_procesado_texto: candidatoParseado.cv_procesado_texto,
        preguntas_sugeridas: candidatoParseado.preguntas_sugeridas,
      })
      .eq("id", candidatoId);
  } catch (err) {
    console.warn("[webhook/cv] post_update_skip:", err instanceof Error ? err.message : String(err));
  }

  // 10. Marcar email como procesado (solo en éxito, para permitir reintentos en error)
  await supabase.from("emails_procesados").insert({
    email_id: body.email_id,
    candidato_id: candidatoId,
  });

  return NextResponse.json({ status: "ok", candidato_id: candidatoId });
}
