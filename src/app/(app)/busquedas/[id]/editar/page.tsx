import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { BusquedaFormPage } from "@/components/app/busqueda-form-page"

export default async function EditarBusquedaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: busqueda } = await supabase.from("busquedas").select("*").eq("id", id).single()

  if (!busqueda) notFound()

  // Búsquedas cerradas y archivadas no son editables
  if (busqueda.estado === "cerrada" || busqueda.estado === "archivada") {
    redirect(`/busquedas/${id}`)
  }

  return <BusquedaFormPage busqueda={busqueda} />
}
