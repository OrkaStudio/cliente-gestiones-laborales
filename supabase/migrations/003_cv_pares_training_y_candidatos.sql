-- Tabla para pares crudo/procesado usados como few-shot en el RAG pipeline
CREATE TABLE cv_pares_training (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  candidato_nombre text NOT NULL,
  cv_crudo_texto text NOT NULL,
  cv_procesado_texto text NOT NULL,
  embedding vector(1536),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX ON cv_pares_training USING hnsw (embedding vector_cosine_ops);

-- Función RPC para búsqueda vectorial por similitud coseno
CREATE OR REPLACE FUNCTION match_cv_pares_training(
  query_embedding vector(1536),
  match_count int DEFAULT 2
)
RETURNS TABLE (
  id uuid,
  candidato_nombre text,
  cv_crudo_texto text,
  cv_procesado_texto text,
  similarity float
)
LANGUAGE sql AS $$
  SELECT
    id,
    candidato_nombre,
    cv_crudo_texto,
    cv_procesado_texto,
    1 - (embedding <=> query_embedding) AS similarity
  FROM cv_pares_training
  WHERE embedding IS NOT NULL
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Nuevos campos en candidatos
ALTER TABLE candidatos
  ADD COLUMN IF NOT EXISTS cv_procesado_texto text,
  ADD COLUMN IF NOT EXISTS preguntas_sugeridas text[] DEFAULT '{}';
