import { generateText } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import { CATEGORIAS_GL } from "@/lib/cv/categorias"
import { generarPreguntasMapeadas, type CampoPendienteInput } from "@/lib/cv/generar-preguntas-mapeadas"
import { createServiceClient } from "@/lib/supabase/service"
import type { CVParseado } from "@/lib/cv/parse"

const AGRO_KW    = ["campo", "estancia", "tambo", "feedlot", "agrícol", "agropecuar", "ganade", "rural", "tambero", "puestero", "capataz", "tractorista", "cosecha", "siembra", "cultivo", "agro"]
const NO_AGRO_KW = ["distribuidora", "distribuidor", "distribución", "repositor", "supermercado", "hipermercado", "farmacia", "banco ", "financier", "seguro", "administrat", "contab", "recepcion", "cajero", "secretar", "sistemas", "software", "programad", "marketing"]

function requiereDimensionEstablecimiento(exp: { rol?: string | null; empresa?: string | null }): boolean {
  const t = `${exp.rol ?? ""} ${exp.empresa ?? ""}`.toLowerCase()
  if (AGRO_KW.some(kw => t.includes(kw)))    return true
  if (NO_AGRO_KW.some(kw => t.includes(kw))) return false
  return true
}

const CAMPOS_CONFIG = [
  { campo: "dni",                  label: "DNI"                    },
  { campo: "fecha_nacimiento",     label: "Fecha de nacimiento"    },
  { campo: "lugar_nacimiento",     label: "Lugar de nacimiento"    },
  { campo: "domicilio_completo",   label: "Domicilio completo"     },
  { campo: "email",                label: "Email"                  },
  { campo: "telefono",             label: "Teléfono"               },
  { campo: "estado_civil",         label: "Estado civil"           },
  { campo: "hijos",                label: "Hijos"                  },
  { campo: "educacion",            label: "Estudios"               },
  { campo: "disponibilidad",       label: "Disponibilidad"         },
  { campo: "pretension_salarial",  label: "Pretensión salarial"    },
  { campo: "movilidad",            label: "Movilidad"              },
  { campo: "vehiculo_propio",      label: "Vehículo propio"        },
  { campo: "licencia_conducir",    label: "Licencia de conducir"   },
  { campo: "muebles_propios",      label: "Muebles propios"        },
  { campo: "animales",             label: "Animales"               },
  { campo: "hectareas_max",        label: "Hectáreas máx."         },
  { campo: "personal_a_cargo_max", label: "Personal a cargo máx."  },
] as const

function buildCamposPendientes(data: CVParseado): CampoPendienteInput[] {
  const isMissing = (v: unknown) => v === null || v === undefined || v === ""
  const campos: CampoPendienteInput[] = []

  for (const c of CAMPOS_CONFIG) {
    if (isMissing(data[c.campo])) {
      campos.push({ tipo: "candidato", campo: c.campo, label: c.label })
    }
  }

  data.experiencia.forEach((exp, i) => {
    const empresa = exp.empresa || `Exp ${i + 1}`
    if (isMissing(exp.empresa))                  campos.push({ tipo: "experiencia", expIndex: i, empresa, campo: "empresa",                  label: "Nombre del establecimiento" })
    if (isMissing(exp.nombre_propietario))        campos.push({ tipo: "experiencia", expIndex: i, empresa, campo: "nombre_propietario",        label: "Nombre del propietario"     })
    if (isMissing(exp.rol))                       campos.push({ tipo: "experiencia", expIndex: i, empresa, campo: "rol",                       label: "Cargo/puesto"               })
    if (isMissing(exp.desde))                     campos.push({ tipo: "experiencia", expIndex: i, empresa, campo: "desde",                     label: "Fecha de ingreso"           })
    if (isMissing(exp.ubicacion))                 campos.push({ tipo: "experiencia", expIndex: i, empresa, campo: "ubicacion",                 label: "Ubicación"                  })
    if (isMissing(exp.dimension_establecimiento) && requiereDimensionEstablecimiento(exp))
                                                  campos.push({ tipo: "experiencia", expIndex: i, empresa, campo: "dimension_establecimiento", label: "Tamaño establecimiento"     })
    if (isMissing(exp.descripcion))               campos.push({ tipo: "experiencia", expIndex: i, empresa, campo: "descripcion",               label: "Tareas desarrolladas"       })
    if (isMissing(exp.personal_a_cargo))          campos.push({ tipo: "experiencia", expIndex: i, empresa, campo: "personal_a_cargo",          label: "Personas a cargo"           })
    if (exp.en_blanco === null)                   campos.push({ tipo: "experiencia", expIndex: i, empresa, campo: "en_blanco",                  label: "En blanco"                  })
    if (isMissing(exp.motivo_cambio_o_salida) && exp.hasta !== null)
                                                  campos.push({ tipo: "experiencia", expIndex: i, empresa, campo: "motivo_cambio_o_salida",   label: "Motivo de salida"           })
    if (exp.hasta === null) {
      if (isMissing(exp.ingresos_actuales)) campos.push({ tipo: "experiencia", expIndex: i, empresa, campo: "ingresos_actuales", label: "Ingresos actuales" })
      if (isMissing(exp.beneficios))        campos.push({ tipo: "experiencia", expIndex: i, empresa, campo: "beneficios",        label: "Beneficios"        })
    }
  })

  return campos
}

async function detectarCategorias(cvTexto: string): Promise<string[]> {
  if (!cvTexto.trim()) return []
  const lista = CATEGORIAS_GL.join(", ")
  const { text } = await generateText({
    model: anthropic("claude-haiku-4-5-20251001"),
    prompt: `Dado este CV de un candidato rural/agropecuario, indicá cuáles categorías aplican realmente según su experiencia comprobada. Solo incluí las que el CV evidencia claramente.

Categorías posibles: ${lista}

CV:
${cvTexto.slice(0, 3000)}

Respondé ÚNICAMENTE con un JSON array. Ejemplo: ["Peón General", "Tractorista"]`,
  })
  const match = text.match(/\[[\s\S]*?\]/)
  if (!match) return []
  try {
    const parsed: unknown = JSON.parse(match[0])
    if (!Array.isArray(parsed)) return []
    return (parsed as unknown[]).filter((c): c is string => typeof c === "string" && CATEGORIAS_GL.includes(c))
  } catch {
    return []
  }
}

export async function runPostProcess(candidatoId: string, data: CVParseado): Promise<void> {
  const supabase = createServiceClient()

  try {
    const campos = buildCamposPendientes(data)
    if (campos.length > 0) {
      const preguntas = await generarPreguntasMapeadas(data.nombre, data.cv_procesado_texto ?? "", campos)
      if (preguntas.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from("candidatos") as any).update({ preguntas_mapeadas: preguntas }).eq("id", candidatoId)
      }
    }
  } catch (err) {
    await supabase.from("webhook_logs").insert({
      email_id: "post-process",
      estado: "failed",
      detalle: `preguntas_mapeadas: ${err instanceof Error ? err.message : String(err)}`,
      archivo_nombre: null,
      remitente_email: candidatoId,
    })
  }

  try {
    const cats = await detectarCategorias(data.cv_procesado_texto ?? "")
    if (cats.length > 0) {
      await supabase.from("candidatos").update({ categorias: cats }).eq("id", candidatoId)
    }
  } catch (err) {
    await supabase.from("webhook_logs").insert({
      email_id: "post-process",
      estado: "failed",
      detalle: `detectar_categorias: ${err instanceof Error ? err.message : String(err)}`,
      archivo_nombre: null,
      remitente_email: candidatoId,
    })
  }
}
