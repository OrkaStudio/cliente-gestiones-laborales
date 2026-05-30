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

  // Salud agregada de los últimos 7 días: tasa de éxito + causa principal de fallo.
  const desde7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: logs7d } = await supabase
    .from("webhook_logs")
    .select("estado, detalle")
    .in("estado", ["complete", "duplicate", "failed"])
    .gte("created_at", desde7d);

  let salud: { tasaExito: number; causaTop: string | null } | undefined;
  if (logs7d && logs7d.length > 0) {
    const ok = logs7d.filter((l) => l.estado === "complete" || l.estado === "duplicate").length;
    const fallos = logs7d.filter((l) => l.estado === "failed");
    const tasaExito = Math.round((ok / logs7d.length) * 100);

    let causaTop: string | null = null;
    if (fallos.length > 0) {
      const conteo = new Map<string, number>();
      for (const f of fallos) {
        const d = f.detalle ?? "(sin detalle)";
        const idx = d.indexOf(":");
        const motivo = idx > 0 ? d.slice(0, idx).trim() : d.trim();
        conteo.set(motivo, (conteo.get(motivo) ?? 0) + 1);
      }
      causaTop = [...conteo.entries()].sort((a, b) => b[1] - a[1])[0][0];
    }
    salud = { tasaExito, causaTop };
  }

  await sendDigest(lineas, salud);

  return NextResponse.json({ status: "sent", count: lineas.length });
}
