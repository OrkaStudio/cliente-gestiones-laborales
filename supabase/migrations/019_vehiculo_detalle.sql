-- 019_vehiculo_detalle.sql
-- Unificación movilidad/vehículo: para GL "movilidad a campo" y "vehículo propio"
-- son lo mismo. Se deja solo el eje "vehículo" y se agrega el detalle (el "¿cuál?":
-- moto, bici, camioneta, camión, etc.). La columna `movilidad` se conserva por
-- compatibilidad de datos pero deja de usarse en UI, preguntas y completitud.

alter table candidatos
  add column if not exists vehiculo_detalle text;

comment on column candidatos.vehiculo_detalle is
  'Tipo de vehículo/movilidad propia (texto libre: moto, camioneta, camión, etc.). Complementa vehiculo_propio (Sí/No). Reemplaza el uso de la columna movilidad.';
