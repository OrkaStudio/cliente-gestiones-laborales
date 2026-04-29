import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    const text = await req.text();
    console.error("[cv-debug] body no es JSON válido:", text.slice(0, 500));
    return NextResponse.json({ error: "invalid_json", preview: text.slice(0, 200) }, { status: 200 });
  }
  const payload = raw as Record<string, unknown>;
  console.log("[cv-debug] keys:", Object.keys(payload));
  console.log("[cv-debug] email_id:", payload.email_id);
  console.log("[cv-debug] archivo_mime:", payload.archivo_mime);
  console.log("[cv-debug] archivo_nombre:", payload.archivo_nombre);
  console.log("[cv-debug] archivo_base64 length:", typeof payload.archivo_base64 === "string" ? payload.archivo_base64.length : "NOT_STRING");
  console.log("[cv-debug] archivo_base64 preview:", typeof payload.archivo_base64 === "string" ? payload.archivo_base64.slice(0, 80) : payload.archivo_base64);
  return NextResponse.json({ status: "debug_ok", keys: Object.keys(payload) });
}
