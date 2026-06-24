-- 022_parejas.sql
-- Entidad "pareja" para el CV unificado de caseros (feature B).
--
-- Modelo: componer-no-copiar. Los dos candidatos siguen siendo la única fuente
-- de verdad; esta tabla guarda SOLO lo propio de la pareja:
--   - quién es el principal (CV completo) vs el condensado,
--   - la narrativa de Situación Familiar (IA + editable).
-- El resto (datos, experiencia, referencias) se lee en vivo de los dos candidatos.
--
-- El link rápido sigue en candidatos.pareja_id (migración 021). Esta fila se crea
-- on-demand cuando se abre el CV de pareja, y se borra al desvincular (server action).
--
-- Aditiva. Backup lógico previo: /mnt/d/dev/_backups/gl-prod-<ts>.

create table if not exists parejas (
  id              uuid primary key default gen_random_uuid(),
  candidato_a_id  uuid not null references candidatos(id) on delete cascade,
  candidato_b_id  uuid not null references candidatos(id) on delete cascade,
  principal_id    uuid references candidatos(id) on delete set null,
  situacion_familiar text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- orden canónico (a < b) para que el par sea único en cualquier dirección
  constraint parejas_ab_order  check (candidato_a_id < candidato_b_id),
  constraint parejas_ab_unique unique (candidato_a_id, candidato_b_id)
);

create index if not exists idx_parejas_a on parejas(candidato_a_id);
create index if not exists idx_parejas_b on parejas(candidato_b_id);

comment on table parejas is
  'Datos propios de la pareja (casero): principal + Situación Familiar. Los datos de cada persona viven en candidatos (componer-no-copiar). Par normalizado a<b.';

-- Seguridad: igual que el resto post-020 (cierre de anon). RLS activada sin
-- policies → solo service_role (que bypassa RLS, lo que usa el server) accede;
-- anon/authenticated quedan bloqueados vía PostgREST.
alter table parejas enable row level security;
