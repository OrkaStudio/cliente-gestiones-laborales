import { createServiceClient } from "@/lib/supabase/service";
import { parsearCV } from "@/lib/cv/parse";
import { upsertCandidato } from "@/lib/cv/upsert-candidato";
import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { z, ZodError } from "zod";

// Claude puede tardar 30s+ — respondemos 202 a Make y procesamos en background
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

  // 4. Validar que hay adjunto real (Make puede enviar campos vacíos en Replay)
  if (!body.archivo_base64 || !body.archivo_nombre) {
    console.warn("[webhook/cv] adjunto_vacio: email_id:", body.email_id);
    return NextResponse.json({ error: "bad_request", detail: "adjunto_vacio" }, { status: 400 });
  }

  // 5. Decodificar archivo desde base64
  const buffer = Buffer.from(body.archivo_base64, "base64");

  // 6. Normalizar MIME: octet-stream o vacío → inferir por extensión
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
  const mimeGenerico = !body.archivo_mime || body.archivo_mime === "application/octet-stream";
  const mimeEfectivo = mimeGenerico && mimeMap[ext] ? mimeMap[ext] : (body.archivo_mime || "application/octet-stream");

  // 7. Subir CV crudo a Supabase Storage (upsert por si Make reintenta)
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

  // 8. Parsear CV con Claude + upsert en background para no exceder el timeout de Make (40s)
  after(async () => {
    console.log("[webhook/cv] background_start email_id:", body.email_id);

    let candidatoParseado;
    try {
      candidatoParseado = await parsearCV(buffer, mimeEfectivo, body.archivo_nombre);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      console.error("[webhook/cv] parse_failed:", detail);
      return;
    }

    let candidatoId: string;
    try {
      candidatoId = await upsertCandidato(candidatoParseado, storagePath);
    } catch (err) {
      console.error("[webhook/cv] upsert_failed:", err instanceof Error ? err.message : String(err));
      return;
    }

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

    await supabase.from("emails_procesados").insert({
      email_id: body.email_id,
      candidato_id: candidatoId,
    });

    console.log("[webhook/cv] background_complete candidato_id:", candidatoId);
  });

  // Respondemos 202 inmediatamente — el procesamiento continúa en background
  return NextResponse.json({ status: "processing" }, { status: 202 });
}
