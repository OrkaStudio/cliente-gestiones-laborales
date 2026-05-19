ALTER TABLE candidatos
  ADD COLUMN IF NOT EXISTS conversaciones_historial jsonb DEFAULT '[]'::jsonb;
