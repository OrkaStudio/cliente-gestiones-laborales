import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { Sidebar } from "@/components/app/sidebar"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }))

  const { data: notificaciones } = await createServiceClient()
    .from("notificaciones")
    .select("id, tipo, titulo, cuerpo, candidato_id, busqueda_id, created_at")
    .eq("leida", false)
    .order("created_at", { ascending: false })
    .limit(15)

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar
        userEmail={user?.email ?? null}
        notificaciones={notificaciones ?? []}
      />
      <main className="flex-1 overflow-y-auto h-full">{children}</main>
    </div>
  )
}
