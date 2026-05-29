import { createServiceClient } from "@/lib/supabase/service";
import { sendDigest } from "@/lib/slack";
import { NextResponse } from "next/server";

export const maxDuration = 30;

export async function GET(req: Request) {
  // Vercel Cron autentica con CRON_SECRET en el header Authorization
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const desde = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Leer los eventos finales del pipeline en las últimas 24h
  const { data: logs, error } = await supabase
    .from("webhook_logs")
    .select("email_id, estado, detalle, archivo_nombre, remitente_email, candidato_id, created_at")
    .in("estado", ["complete", "duplicate", "failed"])
    .gte("created_at", desde)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!logs || logs.length === 0) {
    return NextResponse.json({ status: "no_activity" });
  }

  // Resolver nombres de candidatos para los que tienen candidato_id
  const candidatoIds = [...new Set(logs.map((l) => l.candidato_id).filter(Boolean))] as string[];
  const nombrePorId: Record<string, string> = {};

  if (candidatoIds.length > 0) {
    const { data: candidatos } = await supabase
      .from("candidatos")
      .select("id, nombre, apellido")
      .in("id", candidatoIds);

    for (const c of candidatos ?? []) {
      nombrePorId[c.id] = `${c.nombre ?? ""} ${c.apellido ?? ""}`.trim() || "Sin nombre";
    }
  }

  const lineas = logs.map((log) => {
    const nombre =
      (log.candidato_id && nombrePorId[log.candidato_id]) ||
      log.archivo_nombre ||
      "desconocido";

    const hora = new Date(log.created_at).toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Argentina/Buenos_Aires",
    });

    return {
      nombre,
      archivoNombre: log.archivo_nombre,
      hora,
      estado: log.estado as "complete" | "failed" | "duplicate",
      motivo: log.estado === "failed" ? log.detalle : null,
    };
  });

  await sendDigest(lineas);

  return NextResponse.json({ status: "sent", count: lineas.length });
}
