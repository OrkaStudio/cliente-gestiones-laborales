-- Habilitar Realtime para notificaciones (faltaba desde TASK-022)
-- El canal JS mostraba SUBSCRIBED pero no recibía eventos.
-- Causa raíz: @supabase/ssr conecta el WebSocket como anon aunque el usuario
-- esté autenticado. La policy debe permitir anon + authenticated.
-- La app ya tiene auth enforced en middleware, así que no hay riesgo de exposición.

-- candidato_id: agregado manualmente en prod, hacer idempotente con IF NOT EXISTS
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS candidato_id uuid REFERENCES candidatos(id);

-- Actualizar CHECK constraint para incluir cv_duplicado
ALTER TABLE notificaciones DROP CONSTRAINT IF EXISTS notificaciones_tipo_check;
ALTER TABLE notificaciones ADD CONSTRAINT notificaciones_tipo_check
  CHECK (tipo IN ('garantia', 'cv_error', 'cv_nuevo', 'cv_duplicado'));

-- REPLICA IDENTITY FULL: Supabase envía la fila completa en cada evento
ALTER TABLE notificaciones REPLICA IDENTITY FULL;

-- La tabla ya estaba en la publicación (agregada manualmente desde el dashboard)
-- ALTER PUBLICATION supabase_realtime ADD TABLE notificaciones;

-- RLS: necesario para que Realtime emita eventos a clientes suscritos
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

-- Policy: anon + authenticated pueden leer (WebSocket conecta como anon con @supabase/ssr)
CREATE POLICY "anon y authenticated pueden leer notificaciones"
ON notificaciones
FOR SELECT
USING (true);
