"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";

export async function updateCVProcesado(candidatoId: string, texto: string) {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("candidatos")
    .update({ cv_procesado_texto: texto })
    .eq("id", candidatoId);

  if (error) throw new Error(error.message);
  revalidatePath(`/candidatos/${candidatoId}`);
}
