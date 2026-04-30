import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import mammoth from "mammoth";
import { z } from "zod";

const ExperienciaSchema = z.object({
  empresa: z.string().describe("Nombre del establecimiento o empresa"),
  rol: z.string().describe("Cargo o puesto desempeñado"),
  desde: z
    .string()
    .describe('Fecha de inicio. Ej: "2020", "03/2022", "2020-03"'),
  hasta: z
    .string()
    .nullable()
    .describe("Fecha de fin. null si es el trabajo actual"),
  descripcion: z
    .string()
    .nullable()
    .describe("Descripción de tareas, tipo de hacienda, hectáreas trabajadas"),
});

const CVParseadoSchema = z.object({
  nombre: z.string(),
  apellido: z.string(),
  email: z.string().nullable(),
  telefono: z.string().nullable(),
  fecha_nacimiento: z
    .string()
    .nullable()
    .describe("Formato YYYY-MM-DD si se puede determinar"),
  ubicacion: z
    .string()
    .nullable()
    .describe("Ciudad, provincia o zona donde vive el candidato"),
  educacion: z.string().nullable().describe("Nivel y título educativo"),
  pretension_salarial: z.string().nullable(),
  disponibilidad: z
    .string()
    .nullable()
    .describe("Disponibilidad para trabajar o viajar"),
  movilidad: z
    .boolean()
    .nullable()
    .describe("true si acepta mudarse o vivir en campo"),
  tipos_ganaderia: z
    .array(z.string())
    .describe(
      "Tipos de ganadería que manejó. Posibles: bovina, ovina, tambo, feedlot, mixto, porcinos, aviar",
    ),
  hectareas_max: z
    .number()
    .nullable()
    .describe("Máximas hectáreas manejadas en cualquier trabajo"),
  personal_a_cargo_max: z
    .number()
    .nullable()
    .describe("Máximo número de personas a cargo en cualquier trabajo"),
  ultimo_puesto: z
    .string()
    .nullable()
    .describe("Último cargo o rol desempeñado"),
  idiomas: z
    .array(z.string())
    .describe("Idiomas que habla además de español"),
  experiencia: z.array(ExperienciaSchema),
  campos_faltantes: z
    .array(z.string())
    .describe(
      "Nombres de los campos que no se pudieron determinar del CV. Ej: ['email', 'movilidad']",
    ),
});

export type CVParseado = z.infer<typeof CVParseadoSchema>;

const MIME_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MIME_DOC = "application/msword";

export async function parsearCV(
  buffer: Buffer,
  mimeType: string,
  nombreArchivo: string,
): Promise<CVParseado> {
  type Parte =
    | { type: "text"; text: string }
    | { type: "file"; data: Uint8Array; mediaType: string };

  let partes: Parte[];

  if (mimeType === MIME_DOCX) {
    const { value: texto } = await mammoth.extractRawText({ buffer });
    partes = [
      { type: "text", text: `Archivo: ${nombreArchivo}\n\nContenido:\n${texto}` },
    ];
  } else if (mimeType === MIME_DOC) {
    // .doc (Word binario antiguo) — mammoth no lo soporta.
    // Intentamos extracción de texto con mammoth de todas formas (a veces funciona
    // para .doc que son en realidad DOCX con extensión incorrecta).
    try {
      const { value: texto } = await mammoth.extractRawText({ buffer });
      partes = [
        { type: "text", text: `Archivo: ${nombreArchivo}\n\nContenido:\n${texto}` },
      ];
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
    system: `Sos un extractor de datos de CVs para Gestiones Laborales, una consultora de RRHH del sector agropecuario argentino.
Tu tarea es extraer información estructurada de CVs de trabajadores rurales: peones, capataces, puesteros, tractoristas y operarios de maquinaria.

Prestá especial atención a los campos del sector agro:
- tipos_ganaderia: solo los que el candidato mencione explícita o implícitamente (crianza de vacas → bovina, tambo → tambo, etc.)
- hectareas_max: la mayor cantidad de hectáreas que haya manejado en cualquier trabajo
- personal_a_cargo_max: el mayor número de personas a cargo en cualquier trabajo
- movilidad: true si menciona que acepta mudarse, vivir en campo, o trabajar en zona rural

Para campos que no podés determinar del CV, poné null.
Listá todos los campos que no encontraste en campos_faltantes.
Para tipos_ganaderia e idiomas, usá array vacío [] si no se menciona nada.`,
    messages: [
      {
        role: "user",
        content: partes,
      },
    ],
  });

  return object;
}
