"use server"

import { createServiceClient } from "@/lib/supabase/service"
import { revalidatePath } from "next/cache"

export async function marcarTodasLeidas() {
  const supabase = createServiceClient()
  await supabase.from("notificaciones").update({ leida: true }).eq("leida", false)
  revalidatePath("/", "layout")
}

export async function marcarLeida(id: string) {
  const supabase = createServiceClient()
  await supabase.from("notificaciones").update({ leida: true }).eq("id", id)
  revalidatePath("/", "layout")
}
