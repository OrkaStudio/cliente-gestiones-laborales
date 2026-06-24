import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import mammoth from "mammoth";
import { z } from "zod";

// pdf-parse v1 — importar desde lib/ directamente para evitar que el módulo lea
// ./test/data/05-versions-space.pdf al inicializarse (rompe el build en Vercel/Next.js)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pdfParse: (buf: Buffer) => Promise<{ text: string }> = require("pdf-parse/lib/pdf-parse.js");

// Strings usan "" como sentinel de "desconocido" para no superar el límite de
// 16 union types de Anthropic. Solo boolean/number/hasta quedan como nullable.
const ExperienciaSchema = z.object({
  empresa: z.string().describe("Nombre del establecimiento o empresa. Si no está nombrado, usar descripción aproximada como 'Campo en Coronel Suárez' o 'Establecimiento familiar en Balcarce'. Vacío solo si no hay ninguna referencia posible."),
  nombre_propietario: z.string().describe("Nombre del propietario o empleador. Vacío si no se menciona"),
  rol: z.string().describe("Cargo o puesto tal como figura escrito en el CV. Si el CV solo lista tareas sin nombrar el cargo, dejar vacío — NO inferir ni inventar. Se le preguntará al candidato."),
  desde: z.string().describe('Fecha de inicio. Ej: "2020", "03/2022", "2020-03". Si es narrativo ("hace 3 años", "desde 2018 aproximadamente"), convertir a año estimado.'),
  hasta: z.string().nullable().describe("Fecha de fin. null si es el trabajo actual"),
  ubicacion: z.string().describe("Localidad y provincia del establecimiento. Vacío si no se menciona"),
  descripcion: z.string().describe("Descripción de tareas. Vacío si no se menciona"),
  dimension_establecimiento: z.string().describe("Hectáreas, cabezas de ganado u otra medida. Vacío si no se menciona"),
  personal_a_cargo: z.string().describe("Cantidad de personas a cargo. Vacío si no se menciona"),
  en_blanco: z.boolean().nullable().describe("true si la relación laboral es formal/en blanco. null si no se menciona"),
  ingresos_actuales: z.string().describe("Solo trabajo actual: ingresos en pesos. Vacío si no aplica"),
  beneficios: z.string().describe("Solo trabajo actual: carne, gas, combustible, etc. Vacío si no aplica"),
  motivo_cambio_o_salida: z.string().describe("Motivo de cambio o salida. Vacío si no se menciona"),
});

const ReferenciaSchema = z.object({
  nombre: z.string(),
  contacto: z.string().describe("Teléfono u otro contacto. Vacío si no se menciona"),
  relacion: z.string().describe("Dueño, administrador, encargado, etc. Vacío si no se menciona"),
});

const CVParseadoSchema = z.object({
  nombre: z.string(),
  apellido: z.string(),
  email: z.string().describe("Email del candidato. Vacío si no se menciona"),
  telefono: z.string().describe("Teléfono del candidato. Vacío si no se menciona"),
  dni: z.string().describe("Número de DNI sin puntos. Vacío si no se menciona"),
  fecha_nacimiento: z.string().describe("Formato YYYY-MM-DD. Vacío si no se puede determinar"),
  lugar_nacimiento: z.string().describe("Ciudad y provincia de nacimiento. Vacío si no se menciona"),
  estado_civil: z.string().describe("Soltero, casado, etc. Vacío si no se menciona"),
  hijos: z.string().describe("Ej: '2 hijos, 5 y 8 años'. Vacío si no se menciona"),
  pareja_declarada: z.string().describe("Nombre y apellido de la pareja/cónyuge SOLO si el CV lo menciona explícitamente (ej. 'casado con María Pérez', 'su esposo Juan Díaz'). Vacío si no figura el nombre"),
  ubicacion: z.string().describe("Ciudad y provincia donde vive. Vacío si no se menciona"),
  domicilio_completo: z.string().describe("Calle, número, localidad, provincia. Vacío si no se menciona"),
  educacion: z.string().describe("Nivel y título educativo. Vacío si no se menciona"),
  vehiculo_propio: z.boolean().nullable().describe("true si tiene vehículo propio. null si no se menciona"),
  licencia_conducir: z.boolean().nullable().describe("true si tiene licencia de conducir. null si no se menciona"),
  muebles_propios: z.string().describe("Descripción de muebles propios. Vacío si no se menciona"),
  animales: z.string().describe("Animales que posee. Vacío si no se menciona"),
  pretension_salarial: z.string().describe("Pretensión salarial. Vacío si no se menciona"),
  disponibilidad: z.string().describe("Disponibilidad para trabajar o viajar. Vacío si no se menciona"),
  movilidad: z.boolean().nullable().describe("true si acepta mudarse o vivir en campo. null si no se menciona"),
  tipos_ganaderia: z.array(z.string()).describe("Tipos de ganadería: bovina, ovina, tambo, feedlot, mixto, porcinos, aviar"),
  hectareas_max: z.number().nullable().describe("Máximas hectáreas manejadas. null si no se menciona"),
  personal_a_cargo_max: z.number().nullable().describe("Máximo personas a cargo. null si no se menciona"),
  ultimo_puesto: z.string().describe("Último cargo desempeñado. Vacío si no se puede determinar"),
  idiomas: z.array(z.string()).describe("Idiomas que habla además de español"),
  experiencia: z.array(ExperienciaSchema),
  referencias: z.array(ReferenciaSchema).describe("Referencias laborales mencionadas en el CV"),
  cv_procesado_texto: z.string().describe(
    `CV reformateado completo en el estilo de Gestiones Laborales. Seguir EXACTAMENTE este formato:

DATOS PERSONALES
─────────────────────────────────────────────────
Nombre y Apellido: Juan García
Fecha de nacimiento: 15/05/1986
DNI: sin dato
Domicilio: Calle Mitre 259, Maciá, Entre Ríos
Teléfono: 3445-535086
Email: sin dato
Estado civil: Soltero
Hijos: 2 hijos, 5 y 8 años
Estudios: Secundaria completa
Vehículo propio: Sí
Licencia de conducir: sin dato
Disponibilidad: Disponible para mudarse
Pretensión salarial: sin dato

PERFIL LABORAL
─────────────────────────────────────────────────
Trabajador rural con experiencia en ganadería bovina y tambo...

EXPERIENCIA LABORAL
─────────────────────────────────────────────────
▸ TRABAJO ACTUAL
Cargo: Encargado General
Establecimiento: Estancia La Pampa
Período: 2022 – Actualidad
Ubicación: Coronel Suárez, Buenos Aires
Propietario: Juan Pérez
Hectáreas: 1.200
Personal a cargo: 3 personas
En blanco: Sí
Tareas: Conducción general del establecimiento. Manejo de rodeo bovino.
Ingresos actuales: $450.000
Beneficios: carne, vivienda

▸ TRABAJO ANTERIOR 1
Cargo: Peón General
Establecimiento: Estancia San Juan
Período: 2018 – 2022
Ubicación: General Villegas, Buenos Aires
Propietario: sin dato
Hectáreas: 800
Personal a cargo: sin dato
En blanco: sin dato
Tareas: Tareas de campo: rodeo, alambrado, mantenimiento general.
Motivo de salida: fin de contrato

FORMACIÓN
─────────────────────────────────────────────────
• Secundaria completa — Escuela Agrotécnica N°1

REFERENCIAS
─────────────────────────────────────────────────
Juan Pérez
Tel: 1234-5678
Propietario — Estancia La Pampa

Reglas:
- Separar secciones SIEMPRE con ─────────────────────────────────────────────────── (49 guiones, no ═══ ni ***)
- EXPERIENCIA LABORAL: usar marcadores ▸ TRABAJO ACTUAL y ▸ TRABAJO ANTERIOR N (N = 1, 2, 3...). El trabajo actual va primero.
- Cada trabajo tiene EXACTAMENTE los campos: Cargo, Establecimiento, Período, Ubicación, Propietario, Hectáreas, Personal a cargo, En blanco, Tareas. Más Ingresos actuales + Beneficios si es actual, o Motivo de salida si es anterior.
- Si un campo no está disponible, escribir "sin dato" (no omitir la línea).
- DATOS PERSONALES: incluir todos los campos del ejemplo. Si falta, escribir "sin dato".
- FORMACIÓN: usar viñetas "• " al inicio de cada ítem.
- Solo incluir las secciones que correspondan al candidato (si no tiene FORMACIÓN o CONOCIMIENTOS, no incluir esa sección).`,
  ),
  preguntas_sugeridas: z.array(z.string()).describe(
    `Preguntas para hacerle al candidato para completar los datos faltantes de la planilla de Gestiones Laborales.
Solo incluir preguntas para campos que NO se pudieron determinar del CV. Sin límite de cantidad.
Agrupá las relacionadas en una sola cuando tiene sentido (ej: vehículo + licencia juntas; estado civil + hijos juntas).
En español rioplatense informal, como las haría una recruitera.
Campos a cubrir si faltan: DNI, fecha y lugar de nacimiento, domicilio completo, estado civil e hijos,
vehículo propio y licencia de conducir, muebles propios y animales, pretensión salarial, disponibilidad y movilidad.
Por cada trabajo: ubicación del establecimiento, tamaño (hectáreas/cabezas), si fue en blanco,
motivo de salida (o ingresos actuales + beneficios si es el trabajo actual). Referencias laborales con contacto.`,
  ),
  campos_faltantes: z.array(z.string()).describe("Nombres de los campos que no se pudieron determinar del CV"),
  informacion_adicional: z.string().describe(
    `Todo lo que está en el CV y no tiene campo propio. Nunca tirar información — si algo no encaja en los campos anteriores, va acá.
Incluir si el CV menciona:
- Aptitudes y habilidades técnicas (ordeñe mecánico, inseminación artificial, vacunación, castración, alambrado, herrería, soldadura)
- Maquinaria específica que maneja (marcas, modelos, implementos)
- Cursos, capacitaciones y habilitaciones (ej: "Curso de agroquímicos 2021", "Habilitación categoría E para maquinaria vial", "Curso de inseminación artificial")
- Software o sistemas de gestión (InfoGan, SiGGA, Haras, Excel ganadero)
- Categorías específicas del carnet de conducir más allá del booleano
- Objetivos personales, perfil o presentación escrita por el candidato
- Logros, reconocimientos, membresías
- Cualquier otro dato relevante sin campo propio
Formatear en texto libre agrupado por categoría. Vacío solo si realmente no hay nada más allá de lo capturado.`
  ),
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

Reglas generales:
- Entendé expresiones variadas del español rioplatense rural: "gurises de 5 y 8" → hijos: "2 hijos, 5 y 8 años"
- Inferí lo razonable: menciona que vive en campo → movilidad: true
- tipos_ganaderia: solo los que el candidato mencione explícita o implícitamente (crianza de vacas → bovina, tambo → tambo)
- hectareas_max: la mayor cifra mencionada en cualquier trabajo
- personal_a_cargo_max: el mayor número de personas a cargo en cualquier trabajo
- Si el domicilio es parcial (solo ciudad): ponelo en ubicacion, dejá domicilio_completo null

REGLA FUNDAMENTAL: Solo extraé información que esté escrita en el CV. NUNCA inventar, asumir ni completar datos que no están. Si algo no figura → campo vacío.

Reglas para CVs en formatos no estándar:
- CV narrativo (párrafos sin estructura): igualmente extraé cada trabajo como item separado de experiencia
- CV sin secciones claras: inferí las secciones desde el contenido
- Sin cargo explícito: dejar rol vacío — NO inventar ni inferir. Se preguntará al candidato.
- Empresa sin nombre: usar lo que haya ("Establecimiento Santa María", "campo en Balcarce"). Vacío solo si no hay ninguna referencia.
- Fechas narrativas ("hace 3 años", "desde que salí del colegio"): estimá el año aproximado
- NUNCA omitir un trabajo — si hay evidencia de actividad laboral, crear el item de experiencia
- Toda información del CV que no tenga campo propio va en informacion_adicional — no tirar nada

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
• ESPECÍFICAS: mencioná el establecimiento real por nombre. No preguntes "¿cuál era tu cargo?" sino "¿Cuál era tu cargo en [Establecimiento Santa María]?"
• CONTEXTUALES: adaptá cada pregunta al tipo de trabajo. Para alguien que manejó hacienda, preguntá "¿Cuántas cabezas manejabas en [Estancia X]?" o "¿Cuántas hectáreas tiene [Establecimiento Y]?", no preguntas genéricas.
• PERSONAL A CARGO: solo preguntá si tiene sentido según el rol. Para tareas básicas de campo, formulalo naturalmente: "¿Trabajabas solo en [establecimiento] o había más personal?"
• Si tiene la ciudad pero no la dirección: preguntá solo calle y número
• Si ya mencionó hijos: no preguntes si tiene hijos, preguntá solo las edades si no las dijo
• Agrupar cuando tiene sentido: "¿Cuál es tu estado civil? ¿Tenés hijos?" es una pregunta`;
}

export async function parsearCV(
  buffer: Buffer,
  mimeType: string,
  nombreArchivo: string,
  signal?: AbortSignal,
): Promise<CVParseado> {
  type Parte =
    | { type: "text"; text: string }
    | { type: "image"; image: Buffer; mimeType: string }
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
  } else if (mimeType === "application/pdf") {
    // Pre-extraer texto con pdf-parse → Claude recibe texto plano en vez del archivo binario.
    // Esto reduce el tiempo de respuesta de ~55s a ~5-10s en el plan Hobby de Vercel (límite 60s).
    // Fallback a file nativo si pdf-parse no extrae nada (PDF escaneado/imagen).
    try {
      const { text: pdfTexto } = await pdfParse(buffer);
      if (pdfTexto.trim().length > 50) {
        partes = [{ type: "text", text: `Archivo: ${nombreArchivo}\n\nContenido extraído del PDF:\n${pdfTexto}` }];
      } else {
        // PDF escaneado — sin texto extraíble, mandar como file nativo
        partes = [{ type: "file", data: buffer, mediaType: mimeType }];
      }
    } catch {
      // pdf-parse falló — fallback a file nativo
      partes = [{ type: "file", data: buffer, mediaType: mimeType }];
    }
  } else if (mimeType.startsWith("image/")) {
    partes = [{ type: "image", image: buffer, mimeType }];
  } else {
    partes = [{ type: "file", data: buffer, mediaType: mimeType }];
  }

  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-6"),
    schema: CVParseadoSchema,
    abortSignal: signal,
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
