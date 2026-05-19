-- Preguntas generadas por Haiku al parsear el CV, mapeadas por campo
-- Formato: [{ campo: "candidato:dni", pregunta: "¿Cuál es tu DNI?" }, ...]
alter table candidatos add column if not exists preguntas_mapeadas jsonb;
