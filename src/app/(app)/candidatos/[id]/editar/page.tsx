import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { CandidatoEditForm } from "@/components/app/candidato-edit-form"

export default async function EditarCandidatoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: candidato } = await supabase.from("candidatos").select("*").eq("id", id).single()

  if (!candidato) notFound()

  return <CandidatoEditForm candidato={candidato} />
}
