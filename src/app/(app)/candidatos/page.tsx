import { createServiceClient } from "@/lib/supabase/service";
import { CandidatosClient } from "@/components/app/candidatos-client";
import type { CandidatoRow } from "@/components/app/candidatos-client";

export const dynamic = "force-dynamic"

export default async function CandidatosPage() {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from("candidatos")
    .select("id, nombre, apellido, ultimo_puesto, fecha_nacimiento, ubicacion, telefono, estado, referencias, categorias, idiomas, fecha_consultado, visto, gestiones(estado, busquedas(puesto))")
    .order("visto", { ascending: true })
    .order("fecha_ingreso", { ascending: false })
    .limit(300)
  const todos = (data ?? []) as unknown as CandidatoRow[]
  return <CandidatosClient todos={todos} />
}
