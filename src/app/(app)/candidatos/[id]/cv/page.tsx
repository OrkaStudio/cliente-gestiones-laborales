import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { CVProcesadoEditor } from "@/components/app/cv-procesado-editor"

export default async function CVPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: candidato } = await supabase
    .from("candidatos")
    .select("id, nombre, apellido, cv_procesado_texto")
    .eq("id", id)
    .single()

  if (!candidato) notFound()

  return (
    <div style={{ minHeight: "100vh", background: "var(--gl-bg)" }}>

      {/* Header sticky */}
      <div
        style={{
          position:       "sticky",
          top:            0,
          zIndex:         10,
          background:     "#fff",
          borderBottom:   "1px solid var(--gl-border)",
          padding:        "0.875rem 2rem",
          display:        "flex",
          alignItems:     "center",
          gap:            "1.25rem",
        }}
      >
        <Link
          href={`/candidatos/${id}`}
          style={{
            display:        "inline-flex",
            alignItems:     "center",
            gap:            "0.375rem",
            fontSize:       "13px",
            color:          "var(--gl-ink-3)",
            textDecoration: "none",
            transition:     "color 0.15s",
          }}
          onMouseEnter={undefined}
        >
          <ArrowLeft style={{ width: 14, height: 14 }} />
          Volver
        </Link>

        <div style={{ width: 1, height: 18, background: "var(--gl-border)" }} />

        <div>
          <div
            style={{
              fontSize:      10,
              fontWeight:    700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color:         "var(--gl-olive)",
              lineHeight:    1,
            }}
          >
            CV Procesado
          </div>
          <div
            style={{
              fontSize:      15,
              fontWeight:    700,
              color:         "var(--gl-ink)",
              letterSpacing: "-0.01em",
              marginTop:     2,
            }}
          >
            {candidato.nombre} {candidato.apellido}
          </div>
        </div>
      </div>

      {/* Editor full-width */}
      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "2rem 2rem 4rem" }}>
        <CVProcesadoEditor
          candidatoId={candidato.id}
          nombre={candidato.nombre}
          apellido={candidato.apellido}
          initialTexto={(candidato as { cv_procesado_texto?: string | null }).cv_procesado_texto ?? null}
        />
      </div>
    </div>
  )
}
