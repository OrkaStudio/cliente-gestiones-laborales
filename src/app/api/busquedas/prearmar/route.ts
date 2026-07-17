import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { type NextRequest, NextResponse } from "next/server";
import { CATEGORIAS_GL } from "@/lib/cv/categorias";
import { HABILIDADES_GL, HABILIDADES_GL_PISTAS } from "@/lib/cv/habilidades";
import { createClient } from "@/lib/supabase/server";
import { borradorDesdeBusqueda, type CriteriosV2, parseCriterios } from "@/lib/v2/criterios";
import { EDU_NIVELES } from "@/lib/v2/matching";

export const maxDuration = 60;

/**
 * "Pegá el pedido del cliente" → la IA PRE-ARMA el formulario de la búsqueda.
 *
 * Regla dura del producto: la IA **llena el formulario**, NO elige ni rankea candidatos.
 * El ranking lo hace el motor determinístico, y la recruiter revisa los criterios antes de
 * crear la búsqueda. Si la IA falla o devuelve cualquier cosa, caemos al borrador
 * determinístico (mismas pistas del vocabulario) — nunca se rompe la pantalla.
 */

const PROMPT = `Sos un asistente de una consultora de RRHH del agro argentino. Te pasan el PEDIDO de un cliente (WhatsApp, mail o notas sueltas) y tenés que completar el formulario de la búsqueda.

NO elegís candidatos ni rankeás: solo estructurás lo que el pedido dice.

Reglas:
- Extraé SOLO lo que el pedido dice o implica claramente. Lo que no está, se omite. Nunca inventes.
- NIVEL: marcá "obligatorio" SOLO si el pedido usa palabras de no-negociable ("indispensable", "excluyente", "imprescindible", "tiene que", "sí o sí", "requisito"). TODO lo demás va "deseable", aunque suene importante — que el pedido mencione una tarea no la vuelve excluyente. Ante la duda, SIEMPRE "deseable": un obligatorio de más descarta gente injustamente, y la recruiter puede subirlo con un clic.
- La superficie (ha) va SIEMPRE "deseable", salvo que el pedido diga explícitamente que es excluyente.
- Categorías: SOLO de la lista. Elegí las que realmente podrían cubrir el puesto (si piden un peón, no pongas encargados).
- Habilidades: SOLO labels EXACTOS de la lista de habilidades.
- educacion es un índice: ${EDU_NIVELES.map((n, i) => `${i}=${n}`).join(", ")}.
- ha = superficie que el CANDIDATO manejó antes, en hectáreas. Si el pedido dice el tamaño del campo (ej: "2.000 ha"), eso es un PISO de experiencia: poné solo "min". NUNCA pongas "max": alguien que manejó MÁS superficie sirve igual, y un max lo dejaría afuera.
- gente = personas a cargo (mínimo). edad = min/max.
- matrimonio = true SOLO si el cliente quiere contratar a la PAREJA (los dos trabajan: "matrimonio", "trabajo para los dos", "puesto para la pareja"). Que el candidato se mude "con la familia" NO es matrimonio: es residir.

Respondé SOLO un JSON válido, sin texto alrededor:
{
  "puesto": "<nombre del puesto>",
  "cliente": "<empresa/estancia, o vacío>",
  "ubicacion": "<zona, o vacío>",
  "rango_salarial": "<o vacío>",
  "descripcion": "<brief: las tareas y el contexto, en prosa breve>",
  "criterios": {
    "categorias": ["<de la lista>"],
    "matrimonio": true|false,
    "requisitos": [
      {"campo":"hab","hab":"<label exacto>","nivel":"obligatorio|deseable"},
      {"campo":"vehiculo"|"residir"|"licencia"|"hijos","nivel":"...","val":true|false},
      {"campo":"edad"|"ha","nivel":"...","min":<n>,"max":<n>},
      {"campo":"educacion"|"gente","nivel":"...","val":<n>},
      {"campo":"civil","nivel":"...","val":"<texto>"}
    ]
  }
}`;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const devNoAuth =
    process.env.NODE_ENV === "development" && process.env.GL_DEV_NO_AUTH === "1";
  if (!user && !devNoAuth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { pedido } = (await req.json()) as { pedido?: string };
  if (!pedido?.trim()) return NextResponse.json({ error: "pedido vacío" }, { status: 400 });

  const vocab = HABILIDADES_GL.map(
    (h) => `- "${h}" (${HABILIDADES_GL_PISTAS[h].slice(0, 4).join(", ")})`,
  ).join("\n");

  try {
    const { text } = await generateText({
      model: anthropic("claude-haiku-4-5-20251001"),
      prompt: `${PROMPT}\n\nCATEGORÍAS:\n${CATEGORIAS_GL.map((c) => `- ${c}`).join("\n")}\n\nHABILIDADES:\n${vocab}\n\nPEDIDO DEL CLIENTE:\n${pedido}`,
    });

    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("sin JSON");
    const raw = JSON.parse(m[0]) as Record<string, unknown>;

    const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
    const puesto = str(raw.puesto);
    const descripcion = str(raw.descripcion);

    // Red de seguridad (el prompt puede ignorarse): la superficie manejada es un PISO.
    // El modelo tiende a copiar el tamaño del campo como min Y max ("2.000 ha" → 2000–2000),
    // y ese max dejaría afuera a quien manejó MÁS campo. Le sacamos el techo siempre.
    const c = raw.criterios as { requisitos?: unknown[] } | undefined;
    if (Array.isArray(c?.requisitos)) {
      for (const r of c.requisitos as Record<string, unknown>[]) {
        if (r?.campo === "ha") r.max = undefined;
      }
    }

    // El shape se valida con el MISMO parser que usa la DB: cualquier requisito inventado,
    // categoría fuera del catálogo o habilidad fuera del vocabulario se cae acá.
    const criterios: CriteriosV2 =
      parseCriterios({ v: 1, ...(raw.criterios as object) }) ??
      borradorDesdeBusqueda({
        puesto: puesto || pedido.slice(0, 60),
        cliente: null,
        descripcion: descripcion || pedido,
        requisitos: null,
        edad_minima: null,
        edad_maxima: null,
        hectareas_min: null,
        personal_a_cargo_min: null,
        movilidad_requerida: null,
        nivel_educacion: null,
        estado_civil: null,
        tipos_ganaderia_req: null,
      });

    return NextResponse.json({
      puesto,
      cliente: str(raw.cliente),
      ubicacion: str(raw.ubicacion),
      rango_salarial: str(raw.rango_salarial),
      descripcion,
      criterios,
    });
  } catch {
    // Fallback determinístico: el pedido crudo como brief y las pistas del vocabulario.
    // La recruiter igual revisa todo antes de crear.
    const criterios = borradorDesdeBusqueda({
      puesto: pedido.slice(0, 60),
      cliente: null,
      descripcion: pedido,
      requisitos: null,
      edad_minima: null,
      edad_maxima: null,
      hectareas_min: null,
      personal_a_cargo_min: null,
      movilidad_requerida: null,
      nivel_educacion: null,
      estado_civil: null,
      tipos_ganaderia_req: null,
    });
    return NextResponse.json({
      puesto: "",
      cliente: "",
      ubicacion: "",
      rango_salarial: "",
      descripcion: pedido,
      criterios,
      degradado: true,
    });
  }
}
