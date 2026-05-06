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
  const { data } = await supabase
    .from("candidatos")
    .select("nombre, apellido, cv_procesado_texto")
    .eq("id", candidatoId)
    .single()

  if (!data?.cv_procesado_texto) {
    return new Response("CV no disponible", { status: 404 })
  }

  const fecha = new Date().toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })

  const buffer = await renderToBuffer(
    createElement(CVDocument, {
      nombre:   data.nombre,
      apellido: data.apellido,
      cvTexto:  data.cv_procesado_texto,
      fecha,
    }) as ReactElement<DocumentProps>,
  )

  const safe = (s: string) =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "_")

  const filename = `GL_CV_${safe(data.apellido)}_${safe(data.nombre)}.pdf`

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
