import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer"
import { createElement, type ReactElement } from "react"
import { createServiceClient } from "@/lib/supabase/service"
import { CVDocument } from "@/lib/cv/pdf"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ candidatoId: string }> },
) {
  const { candidatoId } = await params
  const supabase = createServiceClient()

  const [{ data: candidato }, { data: experiencia }] = await Promise.all([
    supabase.from("candidatos").select("*").eq("id", candidatoId).single(),
    supabase.from("experiencia_laboral").select("*").eq("candidato_id", candidatoId).order("orden"),
  ])

  if (!candidato) {
    return new Response("Candidato no encontrado", { status: 404 })
  }

  const fecha = new Date().toLocaleDateString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  })

  const buffer = await renderToBuffer(
    createElement(CVDocument, {
      candidato,
      experiencia: experiencia ?? [],
      fecha,
    }) as ReactElement<DocumentProps>,
  )

  const safe = (s: string) =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "_")

  const filename = `GL_CV_${safe(candidato.apellido)}_${safe(candidato.nombre)}.pdf`

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
