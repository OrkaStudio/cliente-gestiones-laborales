import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, MapPin, Phone } from "lucide-react";
import { busquedas, candidatos, gestiones } from "@/lib/mock/data";

const estadoLabels: Record<string, string> = {
  preseleccionado: "Preseleccionado",
  presentado_cliente: "Presentado",
  entrevista_cliente: "En entrevista",
  contratado: "Contratado",
  descartado: "Descartado",
};

export default async function AgroCandidatoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const candidato = candidatos.find((c) => c.id === id);
  if (!candidato) notFound();

  const gestionesDelCandidato = gestiones.filter(
    (g) => g.candidatoId === candidato.id,
  );

  return (
    <div className="px-12 py-14 max-w-5xl">
      <Link
        href="/agro/candidatos"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-[var(--agro-ink-soft)] hover:text-[var(--agro-ink)] mb-10"
      >
        <ArrowLeft className="h-3 w-3" />
        Base de candidatos
      </Link>

      {/* Header editorial */}
      <header className="border-b agro-rule pb-10">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-6">
            <div className="h-20 w-20 shrink-0 rounded-full grid place-items-center border agro-rule font-display text-2xl">
              {candidato.nombre[0]}
              {candidato.apellido[0]}
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--agro-ink-soft)]">
                {candidato.ultimoPuesto}
              </div>
              <h1 className="font-display text-6xl leading-[0.95] mt-2">
                {candidato.nombre}
                <br />
                <span className="italic">{candidato.apellido}</span>
              </h1>
              <div className="mt-4 text-sm text-[var(--agro-ink-soft)] flex items-center gap-3 italic">
                <MapPin className="h-3.5 w-3.5 not-italic" />
                {candidato.ubicacion}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <span
              className={`text-[10px] uppercase tracking-[0.22em] ${
                candidato.estado === "activo"
                  ? "text-[var(--agro-olive)]"
                  : "text-[var(--agro-ink-soft)]"
              }`}
            >
              ● {candidato.estado}
            </span>
            {candidato.matchScore && (
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--agro-ink-soft)]">
                  Match
                </div>
                <div className="font-display text-4xl tabular-nums text-[var(--agro-olive)] leading-none mt-1">
                  {candidato.matchScore}%
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button className="rounded-full border agro-rule px-5 py-2 text-xs hover:bg-[rgba(255,253,247,0.7)]">
            Editar
          </button>
          <button className="rounded-full bg-[var(--agro-ink)] text-[#f5f1e8] px-5 py-2 text-xs hover:bg-[var(--agro-olive)] transition-colors">
            Asignar a una búsqueda
          </button>
        </div>
      </header>

      {/* Cuerpo: 2 columnas asimétricas */}
      <div className="grid grid-cols-[2fr_1fr] gap-16 mt-12">
        {/* Trayectoria */}
        <div>
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="font-display text-2xl">Trayectoria</h2>
            <span className="font-mono text-[10px] tabular-nums uppercase tracking-[0.22em] text-[var(--agro-ink-soft)]">
              {candidato.experiencia.length} pasos
            </span>
          </div>

          <div className="space-y-px">
            {candidato.experiencia.map((exp) => (
              <div
                key={exp.id}
                className="py-6 border-t agro-rule grid grid-cols-[110px_1fr] gap-6"
              >
                <div className="font-mono text-[11px] tabular-nums text-[var(--agro-ink-soft)] pt-1">
                  {exp.desde}
                  <br />
                  <span className="text-[var(--agro-ink-soft)]">↓</span>
                  <br />
                  {exp.hasta ?? "hoy"}
                </div>
                <div>
                  <h3 className="font-display text-xl leading-tight">
                    {exp.rol}
                  </h3>
                  <div className="text-sm italic text-[var(--agro-olive)] mt-0.5">
                    {exp.empresa}
                  </div>
                  <p className="text-sm text-[var(--agro-ink-soft)] leading-relaxed mt-3">
                    {exp.descripcion}
                  </p>
                </div>
              </div>
            ))}
            <div className="border-t agro-rule" />
          </div>

          {candidato.notasRecruiter && (
            <div className="mt-12 pt-8 border-t agro-rule">
              <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--agro-ink-soft)] mb-3">
                Notas del recruiter
              </div>
              <p className="font-display text-lg italic leading-relaxed text-[var(--agro-ink)]">
                «{candidato.notasRecruiter}»
              </p>
            </div>
          )}
        </div>

        {/* Lado: contacto + perfil + gestiones */}
        <aside className="space-y-10">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--agro-ink-soft)] mb-3">
              Contacto
            </div>
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center gap-2.5">
                <Mail className="h-3.5 w-3.5 text-[var(--agro-ink-soft)]" />
                <span>{candidato.email}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="h-3.5 w-3.5 text-[var(--agro-ink-soft)]" />
                <span className="font-mono tabular-nums text-xs">
                  {candidato.telefono}
                </span>
              </div>
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--agro-ink-soft)] mb-3">
              Perfil
            </div>
            <dl className="space-y-3 text-sm">
              <Row label="Educación" value={candidato.educacion} />
              <Row label="Disponibilidad" value={candidato.disponibilidad} />
              <Row label="Idiomas" value={candidato.idiomas.join(" · ")} />
              {candidato.pretensionSalarial && (
                <Row
                  label="Pretensión"
                  value={candidato.pretensionSalarial}
                />
              )}
            </dl>
          </div>

          {gestionesDelCandidato.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--agro-ink-soft)] mb-3">
                Gestiones · {gestionesDelCandidato.length}
              </div>
              <div className="space-y-px">
                {gestionesDelCandidato.map((g) => {
                  const busqueda = busquedas.find((b) => b.id === g.busquedaId);
                  return (
                    <div
                      key={g.id}
                      className="py-3 border-t agro-rule"
                    >
                      <div className="font-display text-base leading-tight">
                        {busqueda?.puesto}
                      </div>
                      <div className="text-xs italic text-[var(--agro-ink-soft)] mt-0.5">
                        {busqueda?.cliente}
                      </div>
                      <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--agro-olive)] mt-2">
                        {estadoLabels[g.estado]}
                      </div>
                    </div>
                  );
                })}
                <div className="border-t agro-rule" />
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.18em] text-[var(--agro-ink-soft)]">
        {label}
      </dt>
      <dd className="text-sm mt-0.5">{value}</dd>
    </div>
  );
}
