import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Download } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { CandidatoCVView } from "@/components/app/candidato-cv-view"
import { CVTextoView } from "@/components/app/cv-texto-view"

export const dynamic = "force-dynamic"

export default async function CVPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: candidato }, { data: experiencia }] = await Promise.all([
    supabase.from("candidatos").select("*").eq("id", id).single(),
    supabase.from("experiencia_laboral").select("*").eq("candidato_id", id).order("orden"),
  ])

  if (!candidato) notFound()

  return (
    <div style={{ minHeight: "100vh", background: "var(--gl-bg)" }}>

      {/* Header sticky */}
      <div style={{
        position:     "sticky",
        top:          0,
        zIndex:       10,
        background:   "#fff",
        borderBottom: "1px solid var(--gl-border)",
        padding:      "0.875rem 2rem",
        display:      "flex",
        alignItems:   "center",
        justifyContent: "space-between",
        gap:          "1.25rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          <Link
            href={`/candidatos/${id}`}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", fontSize: 13, color: "var(--gl-ink-3)", textDecoration: "none" }}
          >
            <ArrowLeft style={{ width: 14, height: 14 }} />
            Volver
          </Link>

          <div style={{ width: 1, height: 18, background: "var(--gl-border)" }} />

          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--gl-olive)", lineHeight: 1 }}>
              CV
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--gl-ink)", letterSpacing: "-0.01em", marginTop: 2 }}>
              {candidato.nombre} {candidato.apellido}
            </div>
          </div>
        </div>

        <a
          href={`/api/cv/${id}/pdf`}
          download
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "8px 16px", fontSize: 13, fontWeight: 600,
            color: "#fff", background: "var(--gl-olive)",
            border: "none", borderRadius: 10, textDecoration: "none",
            boxShadow: "0 2px 8px rgba(42,74,24,0.25)",
          }}
        >
          <Download style={{ width: 14, height: 14 }} />
          Descargar PDF
        </a>
      </div>

      {/* Documento */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "2rem 2rem 4rem" }}>
        {candidato.cv_procesado_texto ? (
          <CVTextoView
            cvTexto={candidato.cv_procesado_texto}
            nombre={`${candidato.nombre} ${candidato.apellido}`}
          />
        ) : (
          <CandidatoCVView
            candidato={candidato}
            experiencia={experiencia ?? []}
          />
        )}
      </div>
    </div>
  )
}
