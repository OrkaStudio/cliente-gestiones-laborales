import { createServiceClient } from "@/lib/supabase/service";
import { parsearCV } from "@/lib/cv/parse";
import { upsertCandidato } from "@/lib/cv/upsert-candidato";
import { CATEGORIAS_GL } from "@/lib/cv/categorias";
import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { z, ZodError } from "zod";

async function detectarCategorias(cvTexto: string): Promise<string[]> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key || !cvTexto.trim()) return []

  const lista = CATEGORIAS_GL.join(", ")
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [{
        role: "user",
        content: `Dado este CV de un candidato rural/agropecuario, indicá cuáles categorías aplican realmente según su experiencia comprobada. Solo incluí las que el CV evidencia claramente.

Categorías posibles: ${lista}

CV:
${cvTexto.slice(0, 3000)}

Respondé ÚNICAMENTE con un JSON array. Ejemplo: ["Peón General", "Tractorista"]`,
      }],
    }),
  })

  if (!res.ok) return []
  const data = await res.json()
  const text: string = data?.content?.[0]?.text ?? ""
  const match = text.match(/\[[\s\S]*?\]/)
  if (!match) return []
  const parsed: unknown = JSON.parse(match[0])
  if (!Array.isArray(parsed)) return []
  return (parsed as unknown[])
    .filter((c): c is string => typeof c === "string" && CATEGORIAS_GL.includes(c))
}

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

  // 6. Normalizar MIME: octet-stream o vacío → inferir por extensión o magic bytes
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
  let mimeEfectivo = mimeGenerico && mimeMap[ext] ? mimeMap[ext] : (body.archivo_mime || "application/octet-stream");
  // Fallback por magic bytes — corre siempre para corregir MIMEs incorrectos de Pipedream/Gmail
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    mimeEfectivo = "application/pdf"; // %PDF
  } else if (buffer[0] === 0x50 && buffer[1] === 0x4B) {
    mimeEfectivo = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"; // PK (docx/xlsx/zip)
  } else if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    mimeEfectivo = "image/jpeg"; // JPEG
  } else if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    mimeEfectivo = "image/png"; // PNG
  } else if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    mimeEfectivo = "image/gif"; // GIF
  } else if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
    mimeEfectivo = "image/webp"; // RIFF/WebP
  }

  // 7. Subir CV crudo a Supabase Storage (upsert por si Make reintenta)
  const safeEmailId = body.email_id.replace(/[<>]/g, "").replace(/[^a-zA-Z0-9._@-]/g, "_");
  const safeNombre = body.archivo_nombre && body.archivo_nombre !== "desconocido" && body.archivo_nombre !== "unknown"
    ? body.archivo_nombre
    : `cv_${Date.now()}.pdf`;
  const storagePath = `${safeEmailId}/${safeNombre}`;
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

  // 8. Parsear en background (Pipedream recibe 202 inmediatamente)
  after(async () => {
    try {
      await supabase.from("webhook_logs").insert({
        email_id: body.email_id,
        estado: "processing",
        archivo_nombre: body.archivo_nombre,
        remitente_email: body.remitente_email,
        detalle: `mime:${mimeEfectivo}`,
      });

      let candidatoParseado;
      try {
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

      if (wasExisting) {
        await supabase.from("notificaciones").insert({
          tipo: "cv_duplicado",
          titulo: `${nombreCompleto} volvió a enviar su CV`,
          cuerpo: `Se recibió un nuevo CV de ${nombreCompleto} (${body.archivo_nombre}). El perfil existente no fue modificado.`,
          candidato_id: candidatoId,
        });
        await supabase.from("emails_procesados").insert({ email_id: body.email_id, candidato_id: candidatoId });
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

      // Notificación, registro y log ANTES de categorías — garantiza que no se pierdan por timeout
      await supabase.from("notificaciones").insert({
        tipo: "cv_nuevo",
        titulo: `Nuevo CV — ${nombreCompleto}`,
        cuerpo: `Se procesó ${body.archivo_nombre} y se creó un perfil nuevo.`,
        candidato_id: candidatoId,
      });
      await supabase.from("emails_procesados").insert({ email_id: body.email_id, candidato_id: candidatoId });
      await supabase.from("webhook_logs").insert({
        email_id: body.email_id,
        estado: "complete",
        candidato_id: candidatoId,
        archivo_nombre: body.archivo_nombre,
        remitente_email: body.remitente_email,
      });

      // Auto-categorización con Haiku — puede fallar sin consecuencias
      try {
        const cats = await detectarCategorias(candidatoParseado.cv_procesado_texto ?? "")
        if (cats.length > 0) {
          await supabase.from("candidatos").update({ categorias: cats }).eq("id", candidatoId)
        }
      } catch {
        // no interrumpe el flujo
      }
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
