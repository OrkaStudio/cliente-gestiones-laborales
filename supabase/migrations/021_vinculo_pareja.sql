-- 021_vinculo_pareja.sql
-- Vínculo de pareja entre candidatos.
--
-- Las parejas (matrimonios cuidadores, caseros) llegan como DOS CVs separados.
-- Se modelan como dos candidatos individuales unidos por un vínculo blando 1:1
-- simétrico: cada uno conserva su perfil/categoría/match; el vínculo solo agrega
-- el dato "tiene pareja: X". GL coloca a veces juntos, a veces a uno solo.
--
-- pareja_declarada = nombre que el CV menciona como pareja (lo extrae el parser).
-- Es la señal primaria para SUGERIR el vínculo; el vínculo siempre lo confirma
-- una persona a mano (nunca se linkea en silencio).
--
-- Migración puramente aditiva (ADD COLUMN / CREATE FUNCTION). No toca datos
-- existentes. Backup lógico previo: /mnt/d/dev/_backups/gl-prod-2026-06-24T15-53-18

alter table candidatos
  add column if not exists pareja_id uuid references candidatos(id) on delete set null,
  add column if not exists pareja_declarada text;

comment on column candidatos.pareja_id is
  'Pareja vinculada (otro candidato). 1:1 simétrico: ambas filas se apuntan. Se setea/limpia SOLO vía vincular_pareja()/desvincular_pareja() para mantener la simetría.';
comment on column candidatos.pareja_declarada is
  'Nombre de la pareja tal como lo menciona el CV (lo extrae el parser). Señal para sugerir el vínculo; no implica vínculo confirmado.';

create index if not exists idx_candidatos_pareja_id on candidatos(pareja_id);

-- Vincular: setea ambos lados en una sola transacción. Si alguno ya tenía pareja,
-- la desvincula primero (mantiene el 1:1, sin huérfanos). Idempotente.
create or replace function vincular_pareja(a uuid, b uuid)
returns void
language plpgsql
set search_path = public
as $$
begin
  if a = b then
    raise exception 'No se puede vincular un candidato consigo mismo';
  end if;
  if not exists (select 1 from candidatos where id = a)
     or not exists (select 1 from candidatos where id = b) then
    raise exception 'Ambos candidatos deben existir';
  end if;
  -- soltar el lado opuesto de los vínculos previos de a y b (las ex-parejas)
  update candidatos set pareja_id = null where pareja_id in (a, b) and id not in (a, b);
  -- soltar los punteros propios de a y b
  update candidatos set pareja_id = null where id in (a, b);
  -- vincular ambos lados
  update candidatos set pareja_id = b where id = a;
  update candidatos set pareja_id = a where id = b;
end;
$$;

-- Desvincular: limpia ambos lados a partir de uno de los dos.
create or replace function desvincular_pareja(a uuid)
returns void
language plpgsql
set search_path = public
as $$
declare
  partner uuid;
begin
  select pareja_id into partner from candidatos where id = a;
  update candidatos set pareja_id = null where id = a;
  if partner is not null then
    update candidatos set pareja_id = null where id = partner;
  end if;
end;
$$;

-- Endurecimiento: estas RPCs solo deben llamarse desde el server (service_role).
-- Se revoca la exposición vía PostgREST a anon/authenticated (alineado con la
-- política de cierre de anon de la migración 020).
revoke execute on function vincular_pareja(uuid, uuid) from public, anon, authenticated;
revoke execute on function desvincular_pareja(uuid) from public, anon, authenticated;
