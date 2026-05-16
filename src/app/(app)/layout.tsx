import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { Sidebar } from "@/components/app/sidebar"
import type { GestionSinMovimiento } from "@/components/app/sidebar"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const service = createServiceClient()
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString()

  const [
    { data: { session } },
    { data: notificaciones },
    { data: gestionesRaw },
  ] = await Promise.all([
    supabase.auth.getSession().catch(() => ({ data: { session: null } })),
    service
      .from("notificaciones")
      .select("id, tipo, titulo, cuerpo, candidato_id, busqueda_id, created_at")
      .eq("leida", false)
      .order("created_at", { ascending: false })
      .limit(15),
    service
      .from("gestiones")
      .select("id, estado, updated_at, candidatos(id, nombre, apellido), busquedas(id, puesto)")
      .not("estado", "in", "(contratado,descartado)")
      .lt("updated_at", sevenDaysAgo)
      .order("updated_at", { ascending: true })
      .limit(10),
  ])

  const gestionesSinMovimiento: GestionSinMovimiento[] = (gestionesRaw ?? []).map((g) => {
    const cand = g.candidatos as { id: string; nombre: string; apellido: string } | null
    const busq = g.busquedas as { id: string; puesto: string } | null
    return {
      id: g.id,
      candidatoId: cand?.id ?? null,
      candidatoNombre: cand ? `${cand.nombre} ${cand.apellido}` : "—",
      busquedaId: busq?.id ?? null,
      busquedaPuesto: busq?.puesto ?? "—",
      estado: g.estado,
      diasSinMovimiento: Math.floor((Date.now() - new Date(g.updated_at).getTime()) / 86_400_000),
    }
  })

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar
        userEmail={session?.user?.email ?? null}
        notificaciones={notificaciones ?? []}
        gestionesSinMovimiento={gestionesSinMovimiento}
      />
      <main className="flex-1 overflow-y-auto h-full">{children}</main>
    </div>
  )
}
