import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "none";
  const contentLength = req.headers.get("content-length") ?? "none";
  const contentEncoding = req.headers.get("content-encoding") ?? "none";
  const transferEncoding = req.headers.get("transfer-encoding") ?? "none";
  console.log("[cv-debug] content-type:", contentType);
  console.log("[cv-debug] content-length:", contentLength);
  console.log("[cv-debug] content-encoding:", contentEncoding);
  console.log("[cv-debug] transfer-encoding:", transferEncoding);

  let text: string;
  try {
    const ab = await req.arrayBuffer();
    text = new TextDecoder().decode(ab);
    console.log("[cv-debug] body byteLength:", ab.byteLength);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[cv-debug] arrayBuffer failed:", msg);
    return NextResponse.json({ error: "body_unreadable", detail: msg }, { status: 200 });
  }

  console.log("[cv-debug] body text length:", text.length);
  console.log("[cv-debug] body preview:", text.slice(0, 300));

  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(text) as Record<string, unknown>;
    console.log("[cv-debug] JSON keys:", Object.keys(payload));
    console.log("[cv-debug] email_id:", payload.email_id);
    console.log("[cv-debug] archivo_mime:", payload.archivo_mime);
    console.log("[cv-debug] archivo_nombre:", payload.archivo_nombre);
    console.log("[cv-debug] archivo_base64 length:", typeof payload.archivo_base64 === "string" ? payload.archivo_base64.length : "NOT_STRING");
  } catch {
    console.log("[cv-debug] NOT valid JSON, text was:", text.slice(0, 500));
    return NextResponse.json({ status: "debug_ok_not_json", bodyLength: text.length, preview: text.slice(0, 300) });
  }

  return NextResponse.json({ status: "debug_ok", keys: Object.keys(payload) });
}
