-- 023_matching_v2_expand.sql
-- Slice 1 de B2 (matching V2). ADITIVO PURO — no modifica ni borra nada existente.
-- La app V1 ignora estas columnas (no las referencia) -> cero impacto en la web en uso.
--
-- DIFERIDO a una migración posterior (requiere ventana sin uso, con aviso a GL):
--   * candidatos.tipos_ganaderia (text[]) -> enum    [cambia un tipo en uso, NO aditivo]
--   * busquedas.tipos_ganaderia_req (text[]) -> enum  [idem]
-- Pendiente de definición (26 preguntas / modelo): modalidad_vivienda.

-- 1) CANDIDATO — datos nuevos que extrae el parser (CVs nuevos) y el backfill (los 195 ya cargados)
alter table public.candidatos
  add column if not exists habilidades text[] not null default '{}',
  add column if not exists residir text not null default 'sin_dato'
    check (residir in ('si', 'no', 'sin_dato')),
  add column if not exists residir_zona_preferida text;

-- 2) BÚSQUEDA — requisitos del matching V2
alter table public.busquedas
  -- una búsqueda puede aceptar varias categorías (hoy solo hay 'puesto' singular)
  add column if not exists categorias_aceptadas text[] not null default '{}',
  -- habilidades requeridas (vocabulario controlado HABILIDADES_GL); el VALOR acá,
  -- el NIVEL (obligatorio/deseable) de cada una en 'criterios'
  add column if not exists habilidades_req text[] not null default '{}',
  -- nivel Obligatorio/Deseable por requisito. jsonb para evolucionar el shape
  -- desde el código sin nuevas migraciones. Ej: {"categoria":"obligatorio","residir":"deseable", ...}
  add column if not exists criterios jsonb not null default '{}'::jsonb;

-- 3) Nuevo estado de búsqueda "Temporario" (valor nuevo del enum — ADITIVO y seguro)
alter type estado_busqueda add value if not exists 'temporario';

-- Documentación de intención (queda en el catálogo de la DB)
comment on column public.candidatos.habilidades is
  'Vocabulario controlado HABILIDADES_GL extraído del CV (Haiku). Ausencia = NO declarado, no equivale a "no sabe".';
comment on column public.candidatos.residir is
  'Disponibilidad DECLARADA a residir/mudarse. si|no|sin_dato. Solo lo explícito; sin_dato -> se pregunta (alimenta campos_faltantes).';
comment on column public.candidatos.residir_zona_preferida is
  'Zona preferida si el candidato la menciona junto a su disponibilidad. No es un "no".';
comment on column public.busquedas.categorias_aceptadas is
  'Categorías (de las 24 de GL) que la búsqueda acepta. Reemplaza el match por puesto singular en V2.';
comment on column public.busquedas.criterios is
  'Nivel obligatorio/deseable por requisito (jsonb). Shape evoluciona en código, sin migración.';
