import { unstable_cache } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { BusquedasClient } from "@/components/app/busquedas-client";
import type { BusquedaRow } from "@/components/app/busquedas-client";

const getBusquedas = unstable_cache(
  async () => {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from("busquedas")
      .select("*, gestiones(id, estado)")
      .order("fecha_apertura", { ascending: false })
    return (data ?? []) as BusquedaRow[]
  },
  ["busquedas-list"],
  { revalidate: 60 },
)

export default async function BusquedasPage() {
  const busquedas = await getBusquedas()
  return <BusquedasClient busquedas={busquedas} />
}
