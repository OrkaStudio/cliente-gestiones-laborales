-- Campo para capturar info del CV que no tiene campo propio:
-- aptitudes, maquinaria, cursos, habilitaciones, objetivos, etc.
ALTER TABLE candidatos ADD COLUMN IF NOT EXISTS informacion_adicional text;
