-- Campos del formulario de Oriana para búsquedas
ALTER TABLE busquedas
  ADD COLUMN IF NOT EXISTS reporte_directo      text,
  ADD COLUMN IF NOT EXISTS actitudes            text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS puestos_similares    text,
  ADD COLUMN IF NOT EXISTS idioma_ingles        text,
  ADD COLUMN IF NOT EXISTS edad_minima          integer,
  ADD COLUMN IF NOT EXISTS edad_maxima          integer,
  ADD COLUMN IF NOT EXISTS nivel_educacion      text,
  ADD COLUMN IF NOT EXISTS disponibilidad_viaje boolean,
  ADD COLUMN IF NOT EXISTS estado_civil         text;
