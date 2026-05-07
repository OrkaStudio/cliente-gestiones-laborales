import { NextRequest, NextResponse } from "next/server"
import { parsearCV } from "@/lib/cv/parse"
import { createClient } from "@/lib/supabase/server"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  let buffer: Buffer
  let mimeType: string
  let nombreArchivo: string

  const ct = req.headers.get("content-type") ?? ""

  if (ct.includes("multipart/form-data")) {
    const fd = await req.formData()
    const archivo = fd.get("archivo") as File | null
    const texto   = fd.get("texto") as string | null

    if (archivo && archivo.size > 0) {
      buffer        = Buffer.from(await archivo.arrayBuffer())
      mimeType      = archivo.type || "application/octet-stream"
      nombreArchivo = archivo.name
    } else if (texto?.trim()) {
      buffer        = Buffer.from(texto.trim(), "utf-8")
      mimeType      = "text/plain"
      nombreArchivo = "cv.txt"
    } else {
      return NextResponse.json({ error: "no_input" }, { status: 400 })
    }
  } else {
    // JSON body con { texto }
    let body: { texto?: string }
    try { body = await req.json() } catch { body = {} }
    if (!body.texto?.trim())
      return NextResponse.json({ error: "no_input" }, { status: 400 })
    buffer        = Buffer.from(body.texto.trim(), "utf-8")
    mimeType      = "text/plain"
    nombreArchivo = "cv.txt"
  }

  try {
    const result = await parsearCV(buffer, mimeType, nombreArchivo, [])
    return NextResponse.json(result)
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    console.error("[api/procesar] error:", detail)
    return NextResponse.json({ error: "parse_failed", detail }, { status: 500 })
  }
}
