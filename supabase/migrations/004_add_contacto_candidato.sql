ALTER TABLE candidatos
  ADD COLUMN fecha_consultado TIMESTAMPTZ NULL,
  ADD COLUMN mensaje_whatsapp TEXT NULL;
