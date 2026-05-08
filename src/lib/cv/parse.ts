import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import mammoth from "mammoth";
import { z } from "zod";

const ExperienciaSchema = z.object({
  empresa: z.string().describe("Nombre del establecimiento o empresa"),
  nombre_propietario: z.string().nullable().describe("Nombre del propietario o empleador"),
  rol: z.string().describe("Cargo o puesto desempeñado"),
  desde: z.string().describe('Fecha de inicio. Ej: "2020", "03/2022", "2020-03"'),
  hasta: z.string().nullable().describe("Fecha de fin. null si es el trabajo actual"),
  ubicacion: z.string().nullable().describe("Localidad y provincia del establecimiento"),
  descripcion: z.string().nullable().describe("Descripción de tareas, tipo de hacienda, hectáreas si no se detalla en dimension_establecimiento"),
  dimension_establecimiento: z.string().nullable().describe("Hectáreas, cabezas de ganado u otra medida del establecimiento"),
  personal_a_cargo: z.string().nullable().describe("Cantidad de personas a cargo. null si no se menciona"),
  en_blanco: z.boolean().nullable().describe("true si la relación laboral es formal/en blanco. null si no se menciona"),
  ingresos_actuales: z.string().nullable().describe("Solo para trabajo actual: ingresos en pesos"),
  beneficios: z.string().nullable().describe("Solo para trabajo actual: carne, gas, combustible, mercadería, etc."),
  motivo_cambio_o_salida: z.string().nullable().describe("Motivo de cambio (trabajo actual) o motivo de salida (trabajos anteriores)"),
});

const ReferenciaSchema = z.object({
  nombre: z.string(),
  contacto: z.string().nullable(),
  relacion: z.string().nullable().describe("Dueño, administrador, encargado, etc."),
});

const CVParseadoSchema = z.object({
  nombre: z.string(),
  apellido: z.string(),
  email: z.string().nullable(),
  telefono: z.string().nullable(),
  dni: z.string().nullable().describe("Número de DNI sin puntos"),
  fecha_nacimiento: z.string().nullable().describe("Formato YYYY-MM-DD si se puede determinar"),
  lugar_nacimiento: z.string().nullable().describe("Ciudad y provincia de nacimiento"),
  estado_civil: z.string().nullable().describe("Soltero, en pareja, casado, divorciado, etc."),
  hijos: z.string().nullable().describe("Descripción de hijos. Ej: '2 hijos, 5 y 8 años'. null si no se menciona"),
  ubicacion: z.string().nullable().describe("Ciudad y provincia donde vive actualmente"),
  domicilio_completo: z.string().nullable().describe("Calle, número, localidad, provincia completos"),
  educacion: z.string().nullable().describe("Nivel y título educativo"),
  vehiculo_propio: z.boolean().nullable().describe("true si tiene vehículo propio. null si no se menciona"),
  licencia_conducir: z.boolean().nullable().describe("true si tiene licencia de conducir. null si no se menciona"),
  muebles_propios: z.string().nullable().describe("Descripción de muebles propios si los tiene"),
  animales: z.string().nullable().describe("Animales que posee: perros, gatos, ganado propio, etc. null si no se menciona"),
  pretension_salarial: z.string().nullable(),
  disponibilidad: z.string().nullable().describe("Disponibilidad para trabajar o viajar"),
  movilidad: z.boolean().nullable().describe("true si acepta mudarse o vivir en campo"),
  tipos_ganaderia: z.array(z.string()).describe("Tipos de ganadería manejados: bovina, ovina, tambo, feedlot, mixto, porcinos, aviar"),
  hectareas_max: z.number().nullable().describe("Máximas hectáreas manejadas en cualquier trabajo"),
  personal_a_cargo_max: z.number().nullable().describe("Máximo número de personas a cargo en cualquier trabajo"),
  ultimo_puesto: z.string().nullable().describe("Último cargo o rol desempeñado"),
  idiomas: z.array(z.string()).describe("Idiomas que habla además de español"),
  experiencia: z.array(ExperienciaSchema),
  referencias: z.array(ReferenciaSchema).describe("Referencias laborales mencionadas en el CV"),
  cv_procesado_texto: z.string().describe(
    `CV reformateado completo en el estilo de Gestiones Laborales.
Secciones: DATOS PERSONALES, PERFIL LABORAL, EXPERIENCIA LABORAL (trabajo actual primero, luego anteriores), FORMACIÓN, REFERENCIAS.
Para cada trabajo incluir: establecimiento, propietario, fechas, ubicación, cargo, tareas, dimensión, personal a cargo, si está en blanco.
Completar con la información disponible. Omitir los campos desconocidos.`,
  ),
  preguntas_sugeridas: z.array(z.string()).describe(
    `Preguntas para hacerle al candidato para completar los datos faltantes de la planilla de Gestiones Laborales.
Solo incluir preguntas para campos que NO se pudieron determinar del CV.
Máximo 10 preguntas, ordenadas por prioridad (datos personales críticos primero).
En español rioplatense informal, como las haría una recruitera.
Agrupar preguntas relacionadas en una sola cuando tiene sentido.`,
  ),
  campos_faltantes: z.array(z.string()).describe("Nombres de los campos que no se pudieron determinar del CV"),
});

export type CVParseado = z.infer<typeof CVParseadoSchema>;

const MIME_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MIME_DOC = "application/msword";

function buildSystemPrompt(): string {
  return `Sos un asistente de Gestiones Laborales, consultora de RRHH especializada en el sector agropecuario argentino.
Procesás CVs de trabajadores rurales: peones, capataces, puesteros, tractoristas, operarios de maquinaria y personal administrativo de campo.

Tu tarea tiene DOS PARTES que resolvés en un solo análisis:

═══════════════════════════════════════════
PARTE 1 — EXTRACCIÓN
═══════════════════════════════════════════
Extraé toda la información disponible en el CV y mapeala a los campos del schema.
Para campos que no podés determinar, usá null.

Reglas:
- Entendé expresiones variadas del español rioplatense rural: "gurises de 5 y 8" → hijos: "2 hijos, 5 y 8 años"
- Inferí lo razonable: menciona que vive en campo → movilidad: true
- tipos_ganaderia: solo los que el candidato mencione explícita o implícitamente (crianza de vacas → bovina, tambo → tambo)
- hectareas_max: la mayor cifra mencionada en cualquier trabajo
- personal_a_cargo_max: el mayor número de personas a cargo en cualquier trabajo
- Si el domicilio es parcial (solo ciudad): ponelo en ubicacion, dejá domicilio_completo null

═══════════════════════════════════════════
PARTE 2 — PREGUNTAS PARA EL CANDIDATO
═══════════════════════════════════════════
Generá preguntas para pedirle al candidato los datos de la planilla GL que NO están en el CV.

LA PLANILLA DE GESTIONES LABORALES REQUIERE:

DATOS PERSONALES:
• Apellido y nombre
• Edad / Fecha y lugar de nacimiento
• DNI
• Estado civil y situación familiar: ¿tiene hijos? ¿edades?
• Estudios cursados
• Domicilio: calle, número, localidad, provincia
• Teléfono de contacto
• ¿Tiene vehículo propio?
• ¿Tiene licencia de conducir?
• ¿Tiene muebles propios?
• ¿Tiene animales? (perros, gatos, ganado propio, etc.)

POR CADA TRABAJO (actual y anteriores):
• Nombre del establecimiento
• Nombre del propietario
• Fecha de ingreso (y de salida si es trabajo anterior)
• Ubicación del establecimiento
• Cargo y principales tareas
• Dimensión (hectáreas, cabezas, etc.)
• Personal a cargo y cantidad
• ¿Está / Estuvo en blanco?
• [Solo trabajo actual] Ingresos actuales en pesos
• [Solo trabajo actual] Otros beneficios (carne, mercadería, gas, combustible, premios)
• Motivo por el que desea cambiar / motivo de salida
• Remuneración pretendida

REFERENCIAS:
• Nombre, teléfono y relación laboral (dueño, administrador, encargado)

Reglas para las preguntas:
• Máximo 10, priorizando: DNI y domicilio > situación familiar > datos laborales > referencias
• Solo preguntá lo que NO está en el CV — si ya lo sabés, no lo preguntes
• Si tiene la ciudad pero no la dirección: preguntá solo calle y número
• Si ya mencionó hijos: no preguntes si tiene hijos, preguntá solo las edades si no las dijo
• Si el CV dice que trabaja solo: no preguntes personal a cargo
• Agrupar cuando tiene sentido: "¿Cuál es tu estado civil? ¿Tenés hijos?" es una pregunta`;
}

export async function parsearCV(
  buffer: Buffer,
  mimeType: string,
  nombreArchivo: string,
): Promise<CVParseado> {
  type Parte =
    | { type: "text"; text: string }
    | { type: "file"; data: Uint8Array; mediaType: string };

  let partes: Parte[];

  if (mimeType === "text/plain") {
    partes = [{ type: "text", text: `CV en texto plano:\n\n${buffer.toString("utf-8")}` }];
  } else if (mimeType === MIME_DOCX) {
    const { value: texto } = await mammoth.extractRawText({ buffer });
    partes = [{ type: "text", text: `Archivo: ${nombreArchivo}\n\nContenido:\n${texto}` }];
  } else if (mimeType === MIME_DOC) {
    try {
      const { value: texto } = await mammoth.extractRawText({ buffer });
      partes = [{ type: "text", text: `Archivo: ${nombreArchivo}\n\nContenido:\n${texto}` }];
    } catch {
      throw new Error(
        `El archivo "${nombreArchivo}" está en formato .doc (Word 97-2003) que no se puede procesar. Por favor convertilo a .docx o .pdf y reenvialo.`,
      );
    }
  } else {
    partes = [{ type: "file", data: buffer, mediaType: mimeType }];
  }

  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-6"),
    schema: CVParseadoSchema,
    messages: [
      {
        role: "user" as const,
        content: [
          {
            type: "text" as const,
            text: buildSystemPrompt(),
            providerOptions: {
              anthropic: { cacheControl: { type: "ephemeral" } },
            },
          },
          ...partes,
        ],
      },
    ],
  });

  return object;
}
