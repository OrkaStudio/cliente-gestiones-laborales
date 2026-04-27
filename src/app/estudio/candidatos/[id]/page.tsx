import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  GraduationCap,
  Languages,
  Mail,
  MapPin,
  Phone,
  Wallet,
} from "lucide-react";
import { busquedas, candidatos, gestiones } from "@/lib/mock/data";

const estadoLabels: Record<string, string> = {
  preseleccionado: "Preseleccionado",
  presentado_cliente: "Presentado",
  entrevista_cliente: "En entrevista",
  contratado: "Contratado",
  descartado: "Descartado",
};

const estadoStyle: Record<string, string> = {
  preseleccionado:
    "bg-[var(--studio-paper-deep)] text-[var(--studio-ink-soft)] border-[var(--studio-rule)]",
  presentado_cliente:
    "bg-[var(--studio-amber-tint)] text-[var(--studio-amber)] border-[var(--studio-amber)]/25",
  entrevista_cliente:
    "bg-[var(--studio-olive-tint)] text-[var(--studio-olive)] border-[var(--studio-olive)]/25",
};

export default async function EstudioCandidatoDetailPage({
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
    <div className="px-10 py-10 max-w-[1400px]">
      <Link
        href="/estudio/candidatos"
        className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.22em] text-[var(--studio-ink-soft)] hover:text-[var(--studio-ink)] mb-6"
      >
        <ArrowLeft className="h-3 w-3" />
        Base de candidatos
      </Link>

      {/* Hero card */}
      <div className="studio-card p-8 mb-6 relative overflow-hidden">
        <div
          aria-hidden
          className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-[var(--studio-olive-tint)] blur-3xl opacity-50 pointer-events-none"
        />
        <div className="relative grid grid-cols-[auto_1fr_auto] gap-8 items-start">
          <div className="h-24 w-24 rounded-2xl grid place-items-center bg-[var(--studio-paper-deep)] font-display text-3xl shrink-0">
            {candidato.nombre[0]}
            {candidato.apellido[0]}
          </div>

          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--studio-ink-dim)]">
              {candidato.ultimoPuesto}
            </div>
            <h1 className="font-display text-5xl leading-[1] mt-2">
              {candidato.nombre}{" "}
              <span className="italic">{candidato.apellido}</span>
            </h1>
            <div className="flex items-center gap-4 mt-4 flex-wrap">
              <span
                className={`inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] px-2.5 py-1 rounded-full ${
                  candidato.estado === "activo"
                    ? "bg-[var(--studio-olive)] text-[var(--studio-cream)]"
                    : "bg-[var(--studio-paper-deep)] text-[var(--studio-ink-soft)] border border-[var(--studio-rule)]"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    candidato.estado === "activo"
                      ? "bg-[var(--studio-cream)]"
                      : "bg-[var(--studio-ink-soft)]"
                  }`}
                />
                {candidato.estado}
              </span>
              {candidato.idiomas.map((i) => (
                <span
                  key={i}
                  className="text-[11px] italic font-display px-2.5 py-1 rounded-full border studio-rule bg-[var(--studio-cream)]/60"
                >
                  {i}
                </span>
              ))}
              <span className="text-[12px] text-[var(--studio-ink-soft)] flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {candidato.ubicacion}
              </span>
            </div>
          </div>

          <div className="text-right shrink-0 flex flex-col items-end gap-3">
            {candidato.matchScore && (
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--studio-ink-dim)]">
                  Match perfil
                </div>
                <div className="font-display text-5xl tabular-nums leading-none mt-1 text-[var(--studio-olive)]">
                  {candidato.matchScore}
                  <span className="text-2xl text-[var(--studio-ink-soft)]">
                    %
                  </span>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <button className="px-4 h-10 rounded-full border studio-rule bg-[var(--studio-cream)] text-sm hover:bg-[var(--studio-card)]">
                Editar
              </button>
              <button className="px-4 h-10 rounded-full bg-[var(--studio-ink)] text-[var(--studio-cream)] text-sm hover:bg-[var(--studio-olive)] transition-colors">
                Asignar a búsqueda
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Body grid */}
      <div className="grid grid-cols-[1fr_360px] gap-6">
        {/* Trayectoria */}
        <div className="space-y-6">
          <section className="studio-card p-7">
            <div className="flex items-baseline justify-between mb-6">
              <h2 className="font-display text-2xl leading-none">
                Trayectoria <span className="italic">profesional</span>
              </h2>
              <span className="text-[11px] uppercase tracking-[0.22em] text-[var(--studio-ink-dim)]">
                {candidato.experiencia.length} experiencias
              </span>
            </div>

            <div className="relative">
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[var(--studio-rule)]" />
              <div className="space-y-6">
                {candidato.experiencia.map((exp, i) => (
                  <div
                    key={exp.id}
                    className="relative pl-7"
                  >
                    <div
                      className={`absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 ${
                        i === 0
                          ? "bg-[var(--studio-olive)] border-[var(--studio-olive)] shadow-[0_0_0_4px_var(--studio-olive-tint)]"
                          : "bg-[var(--studio-card)] border-[var(--studio-rule)]"
                      }`}
                    />
                    <div className="rounded-xl border studio-rule-soft bg-[var(--studio-cream)]/40 p-5">
                      <div className="flex items-baseline justify-between gap-3 mb-1">
                        <h3 className="font-display text-xl leading-tight">
                          {exp.rol}
                        </h3>
                        <span className="font-mono text-[11px] tabular-nums text-[var(--studio-ink-dim)] shrink-0 italic">
                          {exp.desde} → {exp.hasta ?? "actual"}
                        </span>
                      </div>
                      <div className="text-sm italic font-display text-[var(--studio-olive)]">
                        {exp.empresa}
                      </div>
                      <p className="text-[13px] text-[var(--studio-ink-soft)] leading-relaxed mt-3">
                        {exp.descripcion}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {candidato.notasRecruiter && (
            <section className="rounded-2xl border border-[var(--studio-amber)]/25 bg-[var(--studio-amber-tint)]/40 p-7">
              <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--studio-amber)] font-medium mb-2">
                Notas del recruiter
              </div>
              <p className="font-display text-lg italic leading-relaxed text-[var(--studio-ink)]">
                «{candidato.notasRecruiter}»
              </p>
            </section>
          )}
        </div>

        {/* Side rail */}
        <aside className="space-y-4">
          <section className="studio-card p-6">
            <h3 className="font-display text-lg mb-4">Contacto</h3>
            <div className="space-y-3 text-sm">
              <Row icon={<Mail className="h-3.5 w-3.5" />}>
                {candidato.email}
              </Row>
              <Row icon={<Phone className="h-3.5 w-3.5" />}>
                <span className="font-mono text-[13px] tabular-nums">
                  {candidato.telefono}
                </span>
              </Row>
              <Row icon={<MapPin className="h-3.5 w-3.5" />}>
                {candidato.ubicacion}
              </Row>
            </div>
          </section>

          <section className="studio-card p-6">
            <h3 className="font-display text-lg mb-4">Perfil</h3>
            <div className="space-y-3.5 text-sm">
              <DetailRow
                icon={<GraduationCap className="h-3.5 w-3.5" />}
                label="Educación"
                value={candidato.educacion}
              />
              <DetailRow
                icon={<Calendar className="h-3.5 w-3.5" />}
                label="Disponibilidad"
                value={candidato.disponibilidad}
              />
              <DetailRow
                icon={<Languages className="h-3.5 w-3.5" />}
                label="Idiomas"
                value={candidato.idiomas.join(" · ")}
              />
              {candidato.pretensionSalarial && (
                <DetailRow
                  icon={<Wallet className="h-3.5 w-3.5" />}
                  label="Pretensión"
                  value={candidato.pretensionSalarial}
                  highlight
                />
              )}
            </div>
          </section>

          {gestionesDelCandidato.length > 0 && (
            <section className="studio-card p-6">
              <div className="flex items-baseline justify-between mb-4">
                <h3 className="font-display text-lg">Gestiones</h3>
                <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--studio-ink-dim)]">
                  {gestionesDelCandidato.length} en curso
                </span>
              </div>
              <div className="space-y-2.5">
                {gestionesDelCandidato.map((g) => {
                  const busqueda = busquedas.find((b) => b.id === g.busquedaId);
                  return (
                    <Link
                      key={g.id}
                      href={busqueda ? `/estudio/busquedas/${busqueda.id}` : "#"}
                      className="block p-4 rounded-xl border studio-rule-soft bg-[var(--studio-cream)]/40 hover:bg-[var(--studio-cream)] hover:border-[var(--studio-rule)] transition-colors"
                    >
                      <div className="text-sm font-medium leading-tight">
                        {busqueda?.puesto}
                      </div>
                      <div className="text-[12px] italic font-display text-[var(--studio-ink-soft)] mt-0.5">
                        {busqueda?.cliente}
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t studio-rule-soft">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] px-2 py-0.5 rounded-full border ${
                            estadoStyle[g.estado] ?? estadoStyle.preseleccionado
                          }`}
                        >
                          <span className="h-1 w-1 rounded-full bg-current" />
                          {estadoLabels[g.estado]}
                        </span>
                        <span className="text-[11px] text-[var(--studio-ink-dim)] tabular-nums font-mono">
                          {g.ultimaActualizacion}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

function Row({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-7 w-7 rounded-lg grid place-items-center bg-[var(--studio-cream)] border studio-rule-soft text-[var(--studio-ink-soft)] shrink-0">
        {icon}
      </div>
      <div className="min-w-0 truncate">{children}</div>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-7 w-7 rounded-lg grid place-items-center bg-[var(--studio-cream)] border studio-rule-soft text-[var(--studio-ink-soft)] shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--studio-ink-dim)]">
          {label}
        </div>
        <div
          className={`mt-0.5 text-sm leading-snug ${
            highlight ? "text-[var(--studio-olive)] font-medium" : ""
          }`}
        >
          {value}
        </div>
      </div>
    </div>
  );
}
