import { unstable_cache } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { CandidatosClient } from "@/components/app/candidatos-client";
import type { CandidatoRow } from "@/components/app/candidatos-client";

const getCandidatos = unstable_cache(
  async () => {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from("candidatos")
      .select("id, nombre, apellido, ultimo_puesto, fecha_nacimiento, ubicacion, telefono, estado, referencias, categorias, idiomas, fecha_consultado, gestiones(estado, busquedas(puesto))")
      .order("fecha_ingreso", { ascending: false })
      .limit(300)
    return (data ?? []) as CandidatoRow[]
  },
  ["candidatos-list"],
  { revalidate: 60 },
)

export default async function CandidatosPage() {
  const todos = await getCandidatos()
  return <CandidatosClient todos={todos} />
}
