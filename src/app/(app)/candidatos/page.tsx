import Link from "next/link";
import { Search, Users, MessageCircle, ThumbsUp, ThumbsDown } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CandidatoSheet } from "@/components/app/candidato-sheet";
import { waUrl } from "@/lib/cv/utils";

const STAGE_ORDER = [
  "preseleccionado", "entrevista_orka", "presentado_cliente",
  "entrevista_cliente", "ofertado", "contratado",
];

const STAGE_LABEL: Record<string, string> = {
  preseleccionado:    "Preseleccionado",
  entrevista_orka:    "Entrevista GL",
  presentado_cliente: "Presentado",
  entrevista_cliente: "2ª Entrevista",
  ofertado:           "Ofertado",
  contratado:         "Contratado",
};

type GestionRaw = { estado: string; busquedas: { puesto: string } | null };

function mejorGestion(gestiones: GestionRaw[]) {
  const activas = gestiones.filter((g) => g.estado !== "descartado" && g.estado !== "contratado");
  if (!activas.length) return null;
  return activas.sort((a, b) => STAGE_ORDER.indexOf(b.estado) - STAGE_ORDER.indexOf(a.estado))[0];
}

function calcEdad(fechaNac: string | null): number | null {
  if (!fechaNac) return null;
  const b = new Date(fechaNac);
  if (isNaN(b.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - b.getFullYear();
  const m = today.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
  return age;
}

// Columnas: nombre | último puesto | edad | localidad | WA | categorías | gestión | estado+refs
const COLS = "minmax(180px,2fr) minmax(140px,1.5fr) 52px minmax(120px,1.2fr) 48px minmax(160px,1.8fr) minmax(110px,1fr) 110px"

export default async function CandidatosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("candidatos")
    .select("id, nombre, apellido, ultimo_puesto, fecha_nacimiento, ubicacion, telefono, estado, referencias, categorias, idiomas, fecha_consultado, gestiones(estado, busquedas(puesto))")
    .order("fecha_ingreso", { ascending: false })
    .limit(300);

  if (q?.trim()) {
    const term = q.trim();
    query = query.or(
      `nombre.ilike.%${term}%,apellido.ilike.%${term}%,ultimo_puesto.ilike.%${term}%,ubicacion.ilike.%${term}%`
    );
  }

  const { data: candidatos } = await query;

  const total  = candidatos?.length ?? 0;
  const activos = candidatos?.filter((c) => c.estado === "activo").length ?? 0;

  return (
    <div className="px-10 py-10">

      {/* Header */}
      <header className="mb-6">
        <p className="gl-eyebrow mb-2">Base de candidatos</p>
        <div className="flex items-center justify-between gap-4">
          <h1
            className="font-display tracking-tight leading-none"
            style={{ fontSize: "clamp(2rem, 4vw, 2.75rem)", color: "var(--gl-ink)" }}
          >
            {total} persona{total !== 1 ? "s" : ""}
          </h1>
          <div className="flex items-center gap-3">
            <span
              className="text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{ background: "#dafbe1", color: "#1a7f37" }}
            >
              {activos} activo{activos !== 1 ? "s" : ""}
            </span>
            <CandidatoSheet />
          </div>
        </div>
      </header>

      {/* Buscador */}
      <form action="/candidatos" method="GET" className="mb-6">
        <div
          className="flex items-center gap-2.5 rounded-lg px-3.5 py-2.5"
          style={{
            background: "var(--gl-surface)",
            border: "1px solid var(--gl-border)",
            maxWidth: "360px",
          }}
        >
          <Search className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--gl-ink-3)" }} />
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar por nombre, puesto o ubicación..."
            autoComplete="off"
            className="bg-transparent text-[13px] flex-1 outline-none"
            style={{ color: "var(--gl-ink)" }}
          />
          {q && (
            <Link
              href="/candidatos"
              className="text-[11px] font-medium shrink-0"
              style={{ color: "var(--gl-ink-3)" }}
            >
              Limpiar
            </Link>
          )}
        </div>
      </form>

      {/* Empty state */}
      {total === 0 && (
        <div className="flex flex-col items-center text-center py-20">
          <div
            className="h-13 w-13 rounded-full grid place-items-center mb-5"
            style={{ background: "var(--gl-olive-bg)" }}
          >
            <Users className="h-6 w-6" style={{ color: "var(--gl-olive)" }} />
          </div>
          <h3 className="font-display mb-1.5" style={{ fontSize: "1.375rem", color: "var(--gl-ink)" }}>
            {q ? `Sin resultados para "${q}"` : "Sin candidatos todavía"}
          </h3>
          <p className="text-sm mb-6" style={{ color: "var(--gl-ink-3)" }}>
            {q ? "Probá con otro término o limpiá el filtro." : "Agregá el primero para empezar a gestionar la base."}
          </p>
          {!q && <CandidatoSheet />}
        </div>
      )}

      {/* Lista */}
      {total > 0 && (
        <div
          style={{
            background:   "#fff",
            border:       "1px solid var(--gl-border)",
            borderRadius: 14,
            overflow:     "hidden",
          }}
        >
          {/* Cabecera */}
          <div
            style={{
              display:             "grid",
              gridTemplateColumns: COLS,
              gap:                 "0 12px",
              padding:             "10px 16px",
              background:          "var(--gl-surface)",
              borderBottom:        "1px solid var(--gl-border)",
            }}
          >
            {["Nombre", "Último puesto", "Edad", "Localidad", "WA", "Categorías", "Gestión activa", "Estado"].map((h) => (
              <span
                key={h}
                style={{
                  fontSize:      10,
                  fontWeight:    700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color:         "var(--gl-ink-3)",
                  whiteSpace:    "nowrap",
                  overflow:      "hidden",
                  textOverflow:  "ellipsis",
                }}
              >
                {h}
              </span>
            ))}
          </div>

          {/* Filas */}
          {candidatos?.map((c) => {
            const edad    = calcEdad(c.fecha_nacimiento ?? null)
            const gestion = mejorGestion((c.gestiones as GestionRaw[]) ?? [])
            const cats    = (c.categorias as string[] | null) ?? []
            const refs    = (c.referencias as { calificacion: "buena" | "mala" | null }[] | null) ?? []
            const buenas  = refs.filter(r => r?.calificacion === "buena").length
            const malas   = refs.filter(r => r?.calificacion === "mala").length
            const isActivo = c.estado === "activo"

            return (
              <div
                key={c.id}
                style={{
                  position:            "relative",
                  display:             "grid",
                  gridTemplateColumns: COLS,
                  gap:                 "0 12px",
                  padding:             "11px 16px",
                  borderBottom:        "1px solid var(--gl-border)",
                  alignItems:          "center",
                }}
                className="hover:bg-[var(--gl-surface)]"
              >
                {/* Cubre toda la fila para que sea clickeable */}
                <Link
                  href={`/candidatos/${c.id}`}
                  style={{ position: "absolute", inset: 0, zIndex: 1 }}
                  aria-label={`Ver perfil de ${c.nombre} ${c.apellido}`}
                />
                {/* Nombre */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
                    <span
                      style={{
                        fontSize:   13.5,
                        fontWeight: 600,
                        color:      "var(--gl-ink)",
                        overflow:   "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c.nombre} {c.apellido}
                    </span>
                    {(buenas > 0 || malas > 0) && (
                      <span style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                        {buenas > 0 && (
                          <span style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 10.5, fontWeight: 600, color: "#16a34a" }}>
                            <ThumbsUp style={{ width: 11, height: 11 }} />{buenas}
                          </span>
                        )}
                        {malas > 0 && (
                          <span style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 10.5, fontWeight: 600, color: "#dc2626" }}>
                            <ThumbsDown style={{ width: 11, height: 11 }} />{malas}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* Último puesto */}
                <span
                  style={{
                    fontSize:     12.5,
                    color:        "var(--gl-ink-3)",
                    overflow:     "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace:   "nowrap",
                  }}
                  title={c.ultimo_puesto ?? ""}
                >
                  {c.ultimo_puesto ?? "—"}
                </span>

                {/* Edad */}
                <span
                  style={{
                    fontSize:   12.5,
                    color:      "var(--gl-ink)",
                    fontWeight: 500,
                    textAlign:  "center",
                  }}
                >
                  {edad != null ? edad : "—"}
                </span>

                {/* Localidad */}
                <span
                  style={{
                    fontSize:     12.5,
                    color:        "var(--gl-ink-3)",
                    overflow:     "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace:   "nowrap",
                  }}
                  title={c.ubicacion ?? ""}
                >
                  {c.ubicacion ?? "—"}
                </span>

                {/* WhatsApp — z-index 2 para quedar encima del Link de fila */}
                <div style={{ display: "flex", justifyContent: "center", position: "relative", zIndex: 2 }}>
                  {c.telefono ? (
                    <a
                      href={waUrl(c.telefono)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={c.telefono}
                      style={{
                        display:        "grid",
                        placeItems:     "center",
                        width:          28,
                        height:         28,
                        borderRadius:   8,
                        background:     "#dafbe1",
                        color:          "#1a7f37",
                        textDecoration: "none",
                        flexShrink:     0,
                      }}
                    >
                      <MessageCircle style={{ width: 13, height: 13 }} />
                    </a>
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--gl-border)" }}>—</span>
                  )}
                </div>

                {/* Categorías */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                  {cats.length > 0 ? cats.slice(0, 3).map((cat) => (
                    <span
                      key={cat}
                      style={{
                        fontSize:     10.5,
                        fontWeight:   500,
                        padding:      "2px 7px",
                        borderRadius: 5,
                        background:   "var(--gl-olive-bg)",
                        color:        "var(--gl-olive)",
                        whiteSpace:   "nowrap",
                      }}
                    >
                      {cat}
                    </span>
                  )) : <span style={{ fontSize: 12, color: "var(--gl-border)" }}>—</span>}
                  {cats.length > 3 && (
                    <span style={{ fontSize: 10.5, color: "var(--gl-ink-3)", alignSelf: "center" }}>
                      +{cats.length - 3}
                    </span>
                  )}
                </div>

                {/* Gestión activa */}
                <div>
                  {gestion ? (
                    <span
                      style={{
                        display:      "inline-block",
                        fontSize:     10.5,
                        fontWeight:   600,
                        padding:      "2px 8px",
                        borderRadius: 5,
                        background:   "var(--gl-olive-bg)",
                        color:        "var(--gl-olive)",
                        whiteSpace:   "nowrap",
                        maxWidth:     "100%",
                        overflow:     "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={gestion.busquedas?.puesto ?? ""}
                    >
                      {STAGE_LABEL[gestion.estado] ?? gestion.estado}
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--gl-border)" }}>—</span>
                  )}
                </div>

                {/* Estado */}
                <span
                  style={{
                    display:      "inline-flex",
                    alignItems:   "center",
                    gap:          5,
                    fontSize:     11,
                    fontWeight:   600,
                    padding:      "3px 9px",
                    borderRadius: 99,
                    background:   isActivo ? "#dafbe1" : "#f6f8fa",
                    color:        isActivo ? "#1a7f37" : "#57606a",
                    whiteSpace:   "nowrap",
                  }}
                >
                  <span
                    style={{
                      width:        5,
                      height:       5,
                      borderRadius: "50%",
                      background:   isActivo ? "#1a7f37" : "#8b949e",
                      flexShrink:   0,
                    }}
                  />
                  {isActivo ? "Activo" : "Inactivo"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
