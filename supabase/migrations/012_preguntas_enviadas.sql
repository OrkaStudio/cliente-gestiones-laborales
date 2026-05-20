-- Preguntas enviadas por WA, pendientes de respuesta
-- Formato: [{ campo, expId?, label, pregunta, enviado_at }]
alter table candidatos add column if not exists preguntas_enviadas jsonb;
