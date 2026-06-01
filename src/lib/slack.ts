const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

type SlackBlock =
  | { type: "header"; text: { type: "plain_text"; text: string } }
  | { type: "section"; text: { type: "mrkdwn"; text: string } }
  | { type: "divider" };

async function postToSlack(blocks: SlackBlock[], text: string): Promise<void> {
  if (!SLACK_WEBHOOK_URL) return;
  await fetch(SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, blocks }),
  }).catch(() => {
    // Slack no debe interrumpir el flujo principal
  });
}

export async function notifyFallo({
  archivoNombre,
  remitenteEmail,
  motivo,
  horaRecibido,
}: {
  archivoNombre: string | null;
  remitenteEmail: string | null;
  motivo: string | null;
  horaRecibido: string;
}): Promise<void> {
  const hora = new Date(horaRecibido).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  });
  const fecha = new Date(horaRecibido).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  });

  await postToSlack(
    [
      { type: "header", text: { type: "plain_text", text: "❌ CV fallido — GL Pipeline" } },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: [
            `*Archivo:* ${archivoNombre ?? "desconocido"}`,
            `*Remitente:* ${remitenteEmail ?? "desconocido"}`,
            `*Recibido:* ${hora}h del ${fecha}`,
            `*Motivo:* ${motivo ?? "sin detalle"}`,
          ].join("\n"),
        },
      },
    ],
    `❌ CV fallido: ${archivoNombre ?? "desconocido"} — ${motivo ?? "sin detalle"}`
  );
}

export async function notifyExito({
  nombreCompleto,
  archivoNombre,
  horaRecibido,
  esNuevo,
}: {
  nombreCompleto: string;
  archivoNombre: string | null;
  horaRecibido: string;
  esNuevo: boolean;
}): Promise<void> {
  const hora = new Date(horaRecibido).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  });

  const emoji = esNuevo ? "✅" : "🔁";
  const tipo = esNuevo ? "CV nuevo procesado" : "CV duplicado";

  await postToSlack(
    [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${emoji} *${tipo}* — ${nombreCompleto} · \`${archivoNombre ?? "desconocido"}\` · ${hora}h`,
        },
      },
    ],
    `${emoji} ${tipo}: ${nombreCompleto}`
  );
}

export async function sendDigest(
  lineas: {
    nombre: string;
    archivoNombre: string | null;
    hora: string;
    estado: "complete" | "failed" | "duplicate";
    motivo: string | null;
  }[],
  salud?: { tasaExito: number; causaTop: string | null },
  huerfanos?: { archivoNombre: string | null; remitenteEmail: string | null; hora: string }[],
): Promise<void> {
  const orfanos = huerfanos ?? [];
  if (lineas.length === 0 && orfanos.length === 0) return;

  const total = lineas.length;
  const ok = lineas.filter((l) => l.estado === "complete").length;
  const dup = lineas.filter((l) => l.estado === "duplicate").length;
  const fail = lineas.filter((l) => l.estado === "failed").length;

  const hoy = new Date().toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  });

  const detalle = lineas
    .map((l) => {
      const emoji = l.estado === "complete" ? "✅" : l.estado === "duplicate" ? "🔁" : "❌";
      const base = `${emoji} ${l.hora}h — *${l.nombre}* · \`${l.archivoNombre ?? "desconocido"}\``;
      return l.motivo ? `${base}\n    _Motivo: ${l.motivo}_` : base;
    })
    .join("\n");

  const blocks: SlackBlock[] = [
    { type: "header", text: { type: "plain_text", text: `🌅 Digest GL Pipeline — ${hoy}` } },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          `*${total} cerrados* · ✅ ${ok} procesados · 🔁 ${dup} duplicados · ❌ ${fail} fallidos` +
          (orfanos.length > 0 ? ` · ⚠️ ${orfanos.length} sin cerrar` : ""),
      },
    },
  ];

  if (orfanos.length > 0) {
    const lista = orfanos
      .map((o) => `• ${o.hora}h — \`${o.archivoNombre ?? "desconocido"}\`${o.remitenteEmail ? ` · ${o.remitenteEmail}` : ""}`)
      .join("\n");
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `⚠️ *${orfanos.length} CV sin estado final* (entraron pero nunca cerraron — posible falla silenciosa, revisar):\n${lista}`,
      },
    });
  }

  if (salud) {
    const causa = salud.causaTop ? ` · principal causa de fallo: \`${salud.causaTop}\`` : "";
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `_Tasa de éxito últimos 7 días: ${salud.tasaExito}%${causa}_` },
    });
  }

  blocks.push({ type: "divider" });
  blocks.push({ type: "section", text: { type: "mrkdwn", text: detalle } });

  await postToSlack(
    blocks,
    `🌅 Digest GL Pipeline ${hoy}: ${ok} OK · ${fail} fallidos${orfanos.length > 0 ? ` · ${orfanos.length} sin cerrar` : ""}`,
  );
}
