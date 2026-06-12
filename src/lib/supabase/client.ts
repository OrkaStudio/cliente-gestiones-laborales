import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// El socket de Realtime conecta con la anon key por defecto. Las tablas ya no
// tienen policy de SELECT para anon (migración 020), así que el socket tiene que
// llevar el JWT del usuario para que postgres_changes pase RLS. Usar este helper
// (no createClient) en toda suscripción Realtime.
export async function createRealtimeClient() {
  const client = createClient();
  const { data: { session } } = await client.auth.getSession();
  if (session) client.realtime.setAuth(session.access_token);
  return client;
}
