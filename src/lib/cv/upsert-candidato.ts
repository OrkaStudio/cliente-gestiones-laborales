import { createServiceClient } from "@/lib/supabase/service";
import type { CVParseado } from "./parse";

// Convierte strings de fecha variables ("2022", "03/2022", "2022-03") a ISO date
function toISODate(str: string | null | undefined): string | null {
  if (!str) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const mmyyyy = str.match(/^(\d{1,2})\/(\d{4})$/);
  if (mmyyyy) return `${mmyyyy[2]}-${mmyyyy[1].padStart(2, "0")}-01`;
  if (/^\d{4}-\d{2}$/.test(str)) return `${str}-01`;
  if (/^\d{4}$/.test(str)) return `${str}-01-01`;
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed.toISOString().split("T")[0];
}

export interface UpsertResult {
  id: string
  wasExisting: boolean
}

export async function upsertCandidato(
  data: CVParseado,
  cvCrudoPath: string | null,
): Promise<UpsertResult> {
  const supabase = createServiceClient();

  // Buscar candidato existente: primero por email, luego por nombre+apellido
  let candidatoId: string | null = null;

  if (data.email) {
    const { data: existente } = await supabase
      .from("candidatos")
      .select("id")
      .eq("email", data.email)
      .maybeSingle();
    if (existente) candidatoId = existente.id;
  }

  if (!candidatoId) {
    const { data: existente } = await supabase
      .from("candidatos")
      .select("id")
      .ilike("nombre", data.nombre)
      .ilike("apellido", data.apellido)
      .maybeSingle();
    if (existente) candidatoId = existente.id;
  }

  const payload = {
    nombre: data.nombre,
    apellido: data.apellido,
    email: data.email ?? null,
    telefono: data.telefono ?? null,
    fecha_nacimiento: toISODate(data.fecha_nacimiento),
    ubicacion: data.ubicacion ?? null,
    domicilio_completo: data.domicilio_completo ?? null,
    lugar_nacimiento: data.lugar_nacimiento ?? null,
    dni: data.dni ?? null,
    estado_civil: data.estado_civil ?? null,
    hijos: data.hijos ?? null,
    vehiculo_propio: data.vehiculo_propio ?? null,
    licencia_conducir: data.licencia_conducir ?? null,
    muebles_propios: data.muebles_propios ?? null,
    animales: data.animales ?? null,
    educacion: data.educacion ?? null,
    perfil_laboral: null, // lo genera Claude en cv_procesado_texto — se extrae después
    pretension_salarial: data.pretension_salarial ?? null,
    disponibilidad: data.disponibilidad ?? null,
    movilidad: data.movilidad ?? null,
    tipos_ganaderia: data.tipos_ganaderia,
    hectareas_max: data.hectareas_max ?? null,
    personal_a_cargo_max: data.personal_a_cargo_max ?? null,
    ultimo_puesto: data.ultimo_puesto ?? null,
    idiomas: data.idiomas,
    referencias: data.referencias.length > 0 ? data.referencias : null,
    campos_faltantes: data.campos_faltantes.length > 0 ? data.campos_faltantes : null,
    ...(cvCrudoPath !== null && { cv_crudo_url: cvCrudoPath }),
  };

  // Candidato existente → no actualizar, devolver flag para que el caller notifique
  if (candidatoId) {
    return { id: candidatoId, wasExisting: true }
  }

  const { data: created, error } = await supabase
    .from("candidatos")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw new Error(`Error creando candidato: ${error.message}`);
  const id = created.id;

  // Reemplazar experiencia laboral (delete + insert)
  // Si el insert falla, Make reintenta y el candidato ya existe → se vuelve a intentar
  const { error: deleteError } = await supabase
    .from("experiencia_laboral")
    .delete()
    .eq("candidato_id", id);
  if (deleteError)
    throw new Error(`Error borrando experiencias: ${deleteError.message}`);

  if (data.experiencia.length > 0) {
    const { error: insertError } = await supabase
      .from("experiencia_laboral")
      .insert(
        data.experiencia.map((exp, idx) => ({
          candidato_id: id,
          empresa: exp.empresa,
          rol: exp.rol,
          desde: toISODate(exp.desde) ?? `${new Date().getFullYear()}-01-01`,
          hasta: toISODate(exp.hasta),
          descripcion: exp.descripcion ?? null,
          orden: idx,
          nombre_propietario: exp.nombre_propietario ?? null,
          ubicacion: exp.ubicacion ?? null,
          dimension_establecimiento: exp.dimension_establecimiento ?? null,
          personal_a_cargo: exp.personal_a_cargo ?? null,
          en_blanco: exp.en_blanco ?? null,
          ingresos_actuales: exp.ingresos_actuales ?? null,
          beneficios: exp.beneficios ?? null,
          motivo_cambio_o_salida: exp.motivo_cambio_o_salida ?? null,
        })),
      );
    if (insertError)
      throw new Error(`Error insertando experiencias: ${insertError.message}`);
  }

  return { id, wasExisting: false };
}
