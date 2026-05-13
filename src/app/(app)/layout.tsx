import { createClient } from "@/lib/supabase/server"
import { Sidebar } from "@/components/app/sidebar"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }))

  // Contar garantías vencidas (cerradas con fecha_cierre > 90 días)
  const hace90dias = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const { count: notificacionesCount } = await supabase
    .from("busquedas")
    .select("*", { count: "exact", head: true })
    .eq("estado", "cerrada")
    .not("fecha_cierre", "is", null)
    .lt("fecha_cierre", hace90dias)

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar userEmail={user?.email ?? null} notificacionesCount={notificacionesCount ?? 0} />
      <main className="flex-1 overflow-y-auto h-full">{children}</main>
    </div>
  )
}
