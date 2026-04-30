import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

const estadoLabels: Record<string, string> = {
  preseleccionado: "Preseleccionado",
  entrevista_orka: "Entrevista Orka",
  presentado_cliente: "Presentado",
  entrevista_cliente: "Entrevista",
  ofertado: "Ofertado",
  contratado: "Contratado",
  descartado: "Descartado",
};

export default async function CandidatoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: candidato }, { data: experiencia }, { data: gestionesData }] =
    await Promise.all([
      supabase.from("candidatos").select("*").eq("id", id).single(),
      supabase.from("experiencia_laboral").select("*").eq("candidato_id", id).order("orden"),
      supabase.from("gestiones").select("*, busquedas(id, puesto, cliente)").eq("candidato_id", id),
    ]);

  if (!candidato) notFound();

  const infoContacto = [
    { label: "Email", value: candidato.email },
    { label: "Teléfono", value: candidato.telefono },
    { label: "Ubicación", value: candidato.ubicacion },
  ].filter((f) => f.value);

  const infoPerfil = [
    { label: "Educación", value: candidato.educacion },
    { label: "Disponibilidad", value: candidato.disponibilidad },
    { label: "Nacimiento", value: candidato.fecha_nacimiento },
    { label: "Pretensión", value: candidato.pretension_salarial },
  ].filter((f) => f.value);

  return (
    <div className="px-12 py-14 max-w-5xl">
      <Link
        href="/candidatos"
        className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-[var(--agro-ink-soft)] hover:text-[var(--agro-ink)] mb-10 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Candidatos
      </Link>

      <header className="pb-10 border-b agro-rule">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-6">
            <div className="h-16 w-16 shrink-0 rounded-full grid place-items-center border agro-rule font-display text-xl">
              {candidato.nombre[0]}{candidato.apellido[0]}
            </div>
            <div>
              <h1 className="font-display text-4xl leading-tight">
                {candidato.nombre} {candidato.apellido}
              </h1>
              <p className="text-sm text-[var(--agro-ink-soft)] mt-2 italic">
                {candidato.ultimo_puesto} · {candidato.ubicacion}
              </p>
              <div className="flex items-center gap-3 mt-3">
                <span
                  className={`text-[10px] uppercase tracking-[0.2em] ${
                    candidato.estado === "activo"
                      ? "text-[var(--agro-olive)]"
                      : "text-[var(--agro-ink-soft)]"
                  }`}
                >
                  {candidato.estado}
                </span>
                {candidato.idiomas?.map((i: string) => (
                  <span
                    key={i}
                    className="text-[10px] uppercase tracking-[0.2em] text-[var(--agro-ink-soft)] border agro-rule px-2 py-0.5 rounded-full"
                  >
                    {i}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button className="px-4 py-2 text-sm border agro-rule text-[var(--agro-ink-soft)] hover:text-[var(--agro-ink)] transition-colors">
              Editar
            </button>
            <button className="px-4 py-2 text-sm bg-[var(--agro-ink)] text-[#f5f1e8] hover:bg-[var(--agro-olive)] transition-colors">
              Asignar a búsqueda
            </button>
          </div>
        </div>
      </header>

      <div className="grid gap-16 lg:grid-cols-3 mt-12">
        <div className="lg:col-span-2 space-y-12">
          <section>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--agro-ink-soft)] mb-6">
              Trayectoria
            </div>
            <div className="space-y-px">
              {experiencia?.map((exp) => (
                <div key={exp.id} className="py-5 border-t agro-rule">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-display text-lg">{exp.rol}</h3>
                    <span className="font-mono text-[11px] tabular-nums text-[var(--agro-ink-soft)] shrink-0">
                      {exp.desde} — {exp.hasta ?? "actual"}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--agro-olive)] mt-1 italic">{exp.empresa}</p>
                  <p className="text-sm text-[var(--agro-ink-soft)] leading-relaxed mt-2">
                    {exp.descripcion}
                  </p>
                </div>
              ))}
              <div className="border-t agro-rule" />
            </div>
          </section>

          {candidato.notas_recruiter ? (
            <section>
              <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--agro-ink-soft)] mb-4">
                Notas del recruiter
              </div>
              <p className="text-sm leading-relaxed">{candidato.notas_recruiter}</p>
            </section>
          ) : null}
        </div>

        <div className="space-y-10">
          {infoContacto.length > 0 ? (
            <section>
              <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--agro-ink-soft)] mb-4">
                Contacto
              </div>
              <div className="space-y-px">
                {infoContacto.map((f) => (
                  <div
                    key={f.label}
                    className="flex items-baseline justify-between gap-3 py-2.5 border-b agro-rule"
                  >
                    <span className="text-[11px] uppercase tracking-[0.15em] text-[var(--agro-ink-soft)] shrink-0">
                      {f.label}
                    </span>
                    <span className="text-sm text-right">{f.value}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {infoPerfil.length > 0 ? (
            <section>
              <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--agro-ink-soft)] mb-4">
                Perfil
              </div>
              <div className="space-y-px">
                {infoPerfil.map((f) => (
                  <div
                    key={f.label}
                    className="flex items-baseline justify-between gap-3 py-2.5 border-b agro-rule"
                  >
                    <span className="text-[11px] uppercase tracking-[0.15em] text-[var(--agro-ink-soft)] shrink-0">
                      {f.label}
                    </span>
                    <span className="text-sm text-right max-w-[60%]">{f.value}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {gestionesData && gestionesData.length > 0 ? (
            <section>
              <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--agro-ink-soft)] mb-4">
                Gestiones · {gestionesData.length}
              </div>
              <div className="space-y-px">
                {gestionesData.map((g) => (
                  <Link
                    key={g.id}
                    href={g.busquedas ? `/busquedas/${g.busquedas.id}` : "#"}
                    className="group flex items-baseline justify-between gap-3 py-3 border-t agro-rule hover:text-[var(--agro-olive)] transition-colors"
                  >
                    <div>
                      <div className="text-sm">{g.busquedas?.puesto}</div>
                      <div className="text-xs text-[var(--agro-ink-soft)] mt-0.5 italic">
                        {g.busquedas?.cliente}
                      </div>
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--agro-ink-soft)] shrink-0">
                      {estadoLabels[g.estado] ?? g.estado}
                    </span>
                  </Link>
                ))}
                <div className="border-t agro-rule" />
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
