import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer"
import { createElement, type ReactElement } from "react"
import { createServiceClient } from "@/lib/supabase/service"
import { CVParejaDocument } from "@/lib/cv/pdf"
import { redactarSituacionFamiliar } from "@/lib/cv/situacion-familiar"

export const maxDuration = 60

// Descarga directa del CV unificado de la pareja desde el perfil de un candidato.
// Principal = el del perfil de campo (más categorías rurales) — en la práctica, el
// hombre / el que hace el trabajo de campo. La Situación Familiar se genera sola
// (y se cachea en parejas.situacion_familiar) si todavía no está.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ candidatoId: string }> },
) {
  const { candidatoId } = await params
  const supabase = createServiceClient()

  const { data: self } = await supabase.from("candidatos").select("pareja_id").eq("id", candidatoId).single()
  const partnerId = (self as { pareja_id: string | null } | null)?.pareja_id
  if (!partnerId) return new Response("El candidato no tiene una pareja vinculada", { status: 400 })

  const [a, b] = [candidatoId, partnerId].sort()

  const [{ data: ca }, { data: cb }, { data: expA }, { data: expB }] = await Promise.all([
    supabase.from("candidatos").select("*").eq("id", a).single(),
    supabase.from("candidatos").select("*").eq("id", b).single(),
    supabase.from("experiencia_laboral").select("*").eq("candidato_id", a).order("orden"),
    supabase.from("experiencia_laboral").select("*").eq("candidato_id", b).order("orden"),
  ])
  if (!ca || !cb) return new Response("Candidato no encontrado", { status: 404 })

  // Principal = perfil de campo: prioriza categorías rurales; desempata por nº de experiencias.
  const score = (c: typeof ca, exp: typeof expA) => ((c.categorias as string[] | null)?.length ?? 0) * 100 + (exp?.length ?? 0)
  const aWins = score(ca, expA) >= score(cb, expB)
  const principal    = aWins ? ca : cb
  const partner      = aWins ? cb : ca
  const principalExp = aWins ? (expA ?? []) : (expB ?? [])
  const partnerExp   = aWins ? (expB ?? []) : (expA ?? [])

  // Situación Familiar: se redacta en cada descarga desde los datos vivos de
  // ambos, para reflejar cualquier cambio reciente en los perfiles.
  const narrativa = await redactarSituacionFamiliar(principal, partner)

  const fecha = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
  const buffer = await renderToBuffer(
    createElement(CVParejaDocument, {
      principal,
      principalExp,
      pareja: partner,
      parejaExp: partnerExp,
      situacionFamiliar: narrativa,
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
