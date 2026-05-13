CREATE TABLE webhook_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email_id text NOT NULL,
  estado text NOT NULL CHECK (estado IN ('received', 'processing', 'complete', 'failed')),
  detalle text,
  candidato_id uuid REFERENCES candidatos(id),
  archivo_nombre text,
  remitente_email text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX ON webhook_logs (email_id);
CREATE INDEX ON webhook_logs (estado);
CREATE INDEX ON webhook_logs (created_at DESC);
