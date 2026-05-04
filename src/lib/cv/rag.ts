import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import { createServiceClient } from "@/lib/supabase/service";

export interface ParTraining {
  id: string;
  candidato_nombre: string;
  cv_crudo_texto: string;
  cv_procesado_texto: string;
  similarity: number;
}

export async function embedTexto(texto: string): Promise<number[]> {
  const { embedding } = await embed({
    model: openai.embedding("text-embedding-3-small"),
    value: texto,
  });
  return embedding;
}

export async function buscarParesSimiliares(
  cvTexto: string,
  limit = 2,
): Promise<ParTraining[]> {
  try {
    const embedding = await embedTexto(cvTexto);
    const supabase = createServiceClient();

    const { data, error } = await supabase.rpc("match_cv_pares_training", {
      query_embedding: embedding as unknown as string,
      match_count: limit,
    });

    if (error) {
      console.error("[rag] Error buscando pares:", error.message);
      return [];
    }

    return (data ?? []) as ParTraining[];
  } catch (err) {
    console.error("[rag] Fallo al buscar pares similares:", err);
    return [];
  }
}
