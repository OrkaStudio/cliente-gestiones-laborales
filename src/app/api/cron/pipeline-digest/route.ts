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

  // No cortamos si no hay eventos terminales: igual hay que correr el detector de
  // huérfanos (podría haber processing sin cierre y ningún terminal en la ventana).
  const filas = logs ?? [];

  // Resolver nombres de candidatos para los que tienen candidato_id
  const candidatoIds = [...new Set(filas.map((l) => l.candidato_id).filter(Boolean))] as string[];
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

  const lineas = filas.map((log) => {
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

  // Detector de huérfanos: CVs que entraron a `processing` y nunca llegaron a un
  // estado terminal. Es el síntoma de una falla silenciosa (after() cortado, insert
  // de log que falló sin avisar, etc.). Damos 10 min de gracia para no marcar
  // parseos que todavía están en vuelo cuando corre el cron.
  const graceDate = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: enCurso } = await supabase
    .from("webhook_logs")
    .select("email_id, archivo_nombre, remitente_email, created_at")
    .eq("estado", "processing")
    .gte("created_at", desde)
    .lt("created_at", graceDate)
    .order("created_at", { ascending: true });

  // Clave de dedup del pipeline: (email_id + archivo_nombre). Un processing es
  // huérfano si no existe ningún evento terminal con la misma clave.
  const terminalKeys = new Set(filas.map((l) => `${l.email_id}|${l.archivo_nombre ?? ""}`));
  const huerfanosMap = new Map<
    string,
    { archivoNombre: string | null; remitenteEmail: string | null; hora: string }
  >();
  for (const p of enCurso ?? []) {
    const key = `${p.email_id}|${p.archivo_nombre ?? ""}`;
    if (terminalKeys.has(key) || huerfanosMap.has(key)) continue;
    huerfanosMap.set(key, {
      archivoNombre: p.archivo_nombre,
      remitenteEmail: p.remitente_email,
      hora: new Date(p.created_at).toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Argentina/Buenos_Aires",
      }),
    });
  }
  const huerfanos = [...huerfanosMap.values()];

  await sendDigest(lineas, salud, huerfanos);

  return NextResponse.json({ status: "sent", count: lineas.length, huerfanos: huerfanos.length });
}
