-- Campo "Categoría a aplicar" multi-valor en candidatos
-- Reemplaza el campo tipo text libre "ultimo_puesto" para matching V2
ALTER TABLE candidatos ADD COLUMN IF NOT EXISTS categorias text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS candidatos_categorias_idx ON candidatos USING gin (categorias);
