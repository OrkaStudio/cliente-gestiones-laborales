-- Cierra la lectura anónima de PII (auditoría de seguridad 11/06 — TASK-042 en orka-brain).
-- Las policies anon_read existían como workaround para que Realtime pasara RLS
-- (el socket conectaba como anon). El cliente ahora manda el JWT del usuario
-- antes de suscribirse (createRealtimeClient en src/lib/supabase/client.ts),
-- así que las suscripciones pasan por las policies de authenticated.
-- IMPORTANTE: aplicar DESPUÉS de deployar el código que usa createRealtimeClient.

DROP POLICY IF EXISTS "anon_read" ON candidatos;
DROP POLICY IF EXISTS "anon_read" ON experiencia_laboral;
DROP POLICY IF EXISTS "anon_read" ON gestiones;
DROP POLICY IF EXISTS "anon_read" ON busquedas;

-- notificaciones conserva la policy authenticated_read que ya existe;
-- se elimina la abierta a anon (migración 013).
DROP POLICY IF EXISTS "anon y authenticated pueden leer notificaciones" ON notificaciones;
