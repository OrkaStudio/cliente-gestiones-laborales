import { CrearBusquedaV2 } from "@/components/app/crear-busqueda-v2";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { candidatoDesdeRow } from "@/lib/v2/desde-busqueda";

export default async function NuevaBusquedaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const devNoAuth =
    process.env.NODE_ENV === "development" && process.env.GL_DEV_NO_AUTH === "1" && !user;
  const reader = devNoAuth ? createServiceClient() : supabase;

  // Los candidatos reales viajan al cliente para poder rankear EN VIVO mientras la recruiter
  // carga los criterios (sin ida y vuelta al server por cada chip que toca).
  const { data: candidatos } = await reader
    .from("candidatos")
    .select(
      "id, nombre, apellido, ubicacion, fecha_nacimiento, educacion, hectareas_max, personal_a_cargo_max, tipos_ganaderia, vehiculo_propio, licencia_conducir, estado_civil, hijos, categorias, cv_procesado_texto, habilidades, residir, pareja_declarada",
    )
    .eq("estado", "activo")
    .order("apellido");

  return <CrearBusquedaV2 candidatos={(candidatos ?? []).map(candidatoDesdeRow)} preview={devNoAuth} />;
}
