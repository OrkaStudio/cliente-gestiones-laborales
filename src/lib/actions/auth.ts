"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function signIn(
  _: { error: string } | undefined,
  formData: FormData
): Promise<{ error: string }> {
  const supabase  = await createClient()
  const email     = (formData.get("email") as string)?.trim()
  const password  = formData.get("password") as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: "Email o contraseña incorrectos." }

  redirect("/")
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
