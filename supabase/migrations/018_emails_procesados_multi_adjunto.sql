-- Permite procesar múltiples adjuntos del mismo email.
-- Antes: UNIQUE(email_id) → solo 1 CV por email.
-- Ahora: UNIQUE(email_id, archivo_nombre) → 1 entrada por adjunto.

ALTER TABLE emails_procesados ADD COLUMN IF NOT EXISTS archivo_nombre TEXT;

ALTER TABLE emails_procesados DROP CONSTRAINT IF EXISTS emails_procesados_email_id_key;

ALTER TABLE emails_procesados
  ADD CONSTRAINT emails_procesados_email_id_archivo_key
  UNIQUE (email_id, archivo_nombre);
