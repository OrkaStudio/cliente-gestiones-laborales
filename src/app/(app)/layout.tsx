import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { Sidebar } from "@/components/app/sidebar"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  // getSession lee de cookie (sin red) — getUser() valida en middleware, no repetir acá
  const [{ data: { session } }, { data: notificaciones }] = await Promise.all([
    supabase.auth.getSession().catch(() => ({ data: { session: null } })),
    createServiceClient()
      .from("notificaciones")
      .select("id, tipo, titulo, cuerpo, candidato_id, busqueda_id, created_at")
      .eq("leida", false)
      .order("created_at", { ascending: false })
      .limit(15),
  ])

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar
        userEmail={session?.user?.email ?? null}
        notificaciones={notificaciones ?? []}
      />
      <main className="flex-1 overflow-y-auto h-full">{children}</main>
    </div>
  )
}
