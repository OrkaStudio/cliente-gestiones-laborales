import { createClient } from "@/lib/supabase/server"
import { Sidebar } from "@/components/app/sidebar"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar userEmail={user?.email ?? null} />
      <main className="flex-1 overflow-y-auto h-full">{children}</main>
    </div>
  )
}
