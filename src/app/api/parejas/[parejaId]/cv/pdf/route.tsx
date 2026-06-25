import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer"
import { createElement, type ReactElement } from "react"
import { createServiceClient } from "@/lib/supabase/service"
import { CVParejaDocument } from "@/lib/cv/pdf"

export const maxDuration = 60

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ parejaId: string }> },
) {
  const { parejaId } = await params
  const supabase = createServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: pareja } = await (supabase as any)
    .from("parejas")
    .select("candidato_a_id, candidato_b_id, principal_id, situacion_familiar")
    .eq("id", parejaId).single()
  if (!pareja) return new Response("Pareja no encontrada", { status: 404 })

  const principalId = pareja.principal_id ?? pareja.candidato_a_id
  const partnerId   = principalId === pareja.candidato_a_id ? pareja.candidato_b_id : pareja.candidato_a_id

  const [{ data: principal }, { data: principalExp }, { data: partner }, { data: partnerExp }] = await Promise.all([
    supabase.from("candidatos").select("*").eq("id", principalId).single(),
    supabase.from("experiencia_laboral").select("*").eq("candidato_id", principalId).order("orden"),
    supabase.from("candidatos").select("*").eq("id", partnerId).single(),
    supabase.from("experiencia_laboral").select("*").eq("candidato_id", partnerId).order("orden"),
  ])
  if (!principal || !partner) return new Response("Candidato no encontrado", { status: 404 })

  const fecha = new Date().toLocaleDateString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  })

  const buffer = await renderToBuffer(
    createElement(CVParejaDocument, {
      principal,
      principalExp: principalExp ?? [],
      pareja:       partner,
      parejaExp:    partnerExp ?? [],
      situacionFamiliar: pareja.situacion_familiar ?? null,
      fecha,
    }) as ReactElement<DocumentProps>,
  )

  const safe = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "_")
  const filename = `GL_CV_Pareja_${safe(principal.apellido)}_${safe(partner.apellido)}.pdf`

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
