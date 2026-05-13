-- Fecha de cierre para iniciar el período de garantía
ALTER TABLE busquedas ADD COLUMN fecha_cierre timestamptz NULL;

-- Notas del cierre de garantía (qué pasó, feedback del cliente, etc.)
ALTER TABLE busquedas ADD COLUMN notas_cierre text NULL;

-- Nuevo estado archivada (solo alcanzable desde el dialog de garantía)
ALTER TYPE estado_busqueda ADD VALUE 'archivada';

-- Tabla de notificaciones (TASK-022: tipo garantia — otros tipos en TASK-023)
CREATE TABLE notificaciones (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo text NOT NULL CHECK (tipo IN ('garantia', 'cv_error', 'cv_nuevo')),
  titulo text NOT NULL,
  cuerpo text NOT NULL,
  busqueda_id uuid REFERENCES busquedas(id) ON DELETE CASCADE,
  leida boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX ON notificaciones (leida);
CREATE INDEX ON notificaciones (created_at DESC);
CREATE INDEX ON notificaciones (busqueda_id);
