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
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "bad_request", detail: "invalid_json" }, { status: 400 });
    }
    try {
      body = BodySchema.parse(raw);
    } catch {
      return NextResponse.json({ error: "bad_request", detail: "schema_mismatch" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "bad_request", detail: "body_unreadable" }, { status: 400 });
  }

  // 2. Validar secret
  if (body.secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // 3. Loguear recepción — antes de cualquier chequeo
  await supabase.from("webhook_logs").insert({
    email_id: body.email_id,
    estado: "received",
    archivo_nombre: body.archivo_nombre,
    remitente_email: body.remitente_email,
    detalle: null,
  });

  // 4. Deduplicación: si ya procesamos este email_id, responder 200
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
    await supabase.from("webhook_logs").insert({
      email_id: body.email_id,
      estado: "failed",
      detalle: "adjunto_vacio",
      archivo_nombre: body.archivo_nombre,
      remitente_email: body.remitente_email,
    })
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

  // 8. Parsear en background (Make recibe 202 inmediatamente)
  after(async () => {
    try {
      await supabase.from("webhook_logs").insert({
        email_id: body.email_id,
        estado: "processing",
        archivo_nombre: body.archivo_nombre,
        remitente_email: body.remitente_email,
      });

      let candidatoParseado;
      try {
        // 50s de timeout — deja margen para upsert+logs antes del maxDuration=60
        const parseSignal = AbortSignal.timeout(50_000);
        candidatoParseado = await parsearCV(buffer, mimeEfectivo, body.archivo_nombre, parseSignal);
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        await supabase.from("webhook_logs").insert({
          email_id: body.email_id,
          estado: "failed",
          detalle: `parse_failed: ${detail}`,
          archivo_nombre: body.archivo_nombre,
          remitente_email: body.remitente_email,
        });
        return;
      }

      let upsertResult: { id: string; wasExisting: boolean };
      try {
        upsertResult = await upsertCandidato(candidatoParseado, storagePath);
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        await supabase.from("webhook_logs").insert({
          email_id: body.email_id,
          estado: "failed",
          detalle: `upsert_failed: ${detail}`,
          archivo_nombre: body.archivo_nombre,
          remitente_email: body.remitente_email,
        });
        return;
      }

      const { id: candidatoId, wasExisting } = upsertResult;

      const nombreCompleto = `${candidatoParseado.nombre} ${candidatoParseado.apellido}`.trim() || "Sin nombre";

      // Candidato duplicado → notificar, no actualizar
      if (wasExisting) {
        await supabase.from("notificaciones").insert({
          tipo: "cv_duplicado",
          titulo: `${nombreCompleto} volvió a enviar su CV`,
          cuerpo: `Se recibió un nuevo CV de ${nombreCompleto} (${body.archivo_nombre}). El perfil existente no fue modificado.`,
          candidato_id: candidatoId,
        });
        await supabase.from("emails_procesados").insert({
          email_id: body.email_id,
          candidato_id: candidatoId,
        });
        await supabase.from("webhook_logs").insert({
          email_id: body.email_id,
          estado: "duplicate",
          candidato_id: candidatoId,
          archivo_nombre: body.archivo_nombre,
          remitente_email: body.remitente_email,
          detalle: `Candidato existente: ${candidatoId}`,
        });
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
        const detail = err instanceof Error ? err.message : String(err);
        await supabase.from("webhook_logs").insert({
          email_id: body.email_id,
          estado: "failed",
          detalle: `post_update_failed: ${detail}`,
          candidato_id: candidatoId,
          archivo_nombre: body.archivo_nombre,
          remitente_email: body.remitente_email,
        });
        return;
      }

      await supabase.from("notificaciones").insert({
        tipo: "cv_nuevo",
        titulo: `Nuevo CV — ${nombreCompleto}`,
        cuerpo: `Se procesó ${body.archivo_nombre} y se creó un perfil nuevo.`,
        candidato_id: candidatoId,
      });

      await supabase.from("emails_procesados").insert({
        email_id: body.email_id,
        candidato_id: candidatoId,
      });

      await supabase.from("webhook_logs").insert({
        email_id: body.email_id,
        estado: "complete",
        candidato_id: candidatoId,
        archivo_nombre: body.archivo_nombre,
        remitente_email: body.remitente_email,
      });
    } catch (err) {
      // Safety net: si after() muere inesperadamente, loguear el error
      const detail = err instanceof Error ? err.message : String(err);
      await supabase.from("webhook_logs").insert({
        email_id: body.email_id,
        estado: "failed",
        detalle: `after_unhandled: ${detail}`,
        archivo_nombre: body.archivo_nombre,
        remitente_email: body.remitente_email,
      });
    }
  });

  // Respondemos 202 inmediatamente — el procesamiento continúa en background
  return NextResponse.json({ status: "processing" }, { status: 202 });
}
