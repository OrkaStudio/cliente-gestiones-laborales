import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, MapPin, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
      supabase
        .from("experiencia_laboral")
        .select("*")
        .eq("candidato_id", id)
        .order("orden"),
      supabase
        .from("gestiones")
        .select("*, busquedas(id, puesto, cliente)")
        .eq("candidato_id", id),
    ]);

  if (!candidato) notFound();

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <Link
        href="/candidatos"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Candidatos
      </Link>

      <div className="flex items-start justify-between gap-6 mb-8">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-secondary text-base font-semibold">
            {candidato.nombre[0]}{candidato.apellido[0]}
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {candidato.nombre} {candidato.apellido}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {candidato.ultimo_puesto} · {candidato.ubicacion}
            </p>
            <div className="flex items-center gap-2 mt-2.5">
              <Badge variant={candidato.estado === "activo" ? "default" : "outline"}>
                {candidato.estado}
              </Badge>
              {candidato.idiomas.map((i) => (
                <Badge key={i} variant="outline">{i}</Badge>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline">Editar</Button>
          <Button>Asignar a busqueda</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Trayectoria</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {experiencia?.map((exp) => (
                <div key={exp.id} className="rounded-md border p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-medium">{exp.rol}</h3>
                    <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                      {exp.desde} — {exp.hasta ?? "actual"}
                    </span>
                  </div>
                  <p className="text-sm text-primary font-medium mt-1">{exp.empresa}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                    {exp.descripcion}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          {candidato.notas_recruiter ? (
            <Card>
              <CardHeader>
                <CardTitle>Notas del recruiter</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{candidato.notas_recruiter}</p>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contacto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {candidato.email ? (
                <div className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{candidato.email}</span>
                </div>
              ) : null}
              {candidato.telefono ? (
                <div className="flex items-center gap-2.5">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{candidato.telefono}</span>
                </div>
              ) : null}
              {candidato.ubicacion ? (
                <div className="flex items-center gap-2.5">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{candidato.ubicacion}</span>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Perfil</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {candidato.educacion ? (
                <DetailRow label="Educacion" value={candidato.educacion} />
              ) : null}
              {candidato.disponibilidad ? (
                <>
                  <Separator />
                  <DetailRow label="Disponibilidad" value={candidato.disponibilidad} />
                </>
              ) : null}
              {candidato.fecha_nacimiento ? (
                <>
                  <Separator />
                  <DetailRow label="Nacimiento" value={candidato.fecha_nacimiento} />
                </>
              ) : null}
              {candidato.pretension_salarial ? (
                <>
                  <Separator />
                  <DetailRow label="Pretension" value={candidato.pretension_salarial} />
                </>
              ) : null}
            </CardContent>
          </Card>

          {gestionesData && gestionesData.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Gestiones</CardTitle>
                <CardDescription>{gestionesData.length} en curso</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {gestionesData.map((g) => (
                  <Link
                    key={g.id}
                    href={g.busquedas ? `/busquedas/${g.busquedas.id}` : "#"}
                    className="block rounded-md border p-3 hover:bg-secondary/40 transition-colors"
                  >
                    <div className="text-sm font-medium">{g.busquedas?.puesto}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {g.busquedas?.cliente} · {estadoLabels[g.estado] ?? g.estado}
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
