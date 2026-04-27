import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { busquedas, candidatos, gestiones } from "@/lib/mock/data";

const estadoLabels: Record<string, string> = {
  preseleccionado: "Preseleccionado",
  presentado_cliente: "Presentado",
  entrevista_cliente: "Entrevista",
  contratado: "Contratado",
  descartado: "Descartado",
};

export default async function BusquedaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const busqueda = busquedas.find((b) => b.id === id);
  if (!busqueda) notFound();

  const candidatosBusqueda = gestiones
    .filter((g) => g.busquedaId === busqueda.id)
    .map((g) => ({
      gestion: g,
      candidato: candidatos.find((c) => c.id === g.candidatoId),
    }))
    .filter(
      (row): row is { gestion: typeof row.gestion; candidato: NonNullable<typeof row.candidato> } =>
        Boolean(row.candidato),
    )
    .sort((a, b) => (b.candidato.matchScore ?? 0) - (a.candidato.matchScore ?? 0));

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <Link
        href="/busquedas"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Busquedas
      </Link>

      <div className="flex items-start justify-between gap-6 mb-8">
        <div>
          <Badge variant={busqueda.estado === "activa" ? "default" : "outline"}>
            {busqueda.estado}
          </Badge>
          <h1 className="text-2xl font-semibold tracking-tight mt-3">
            {busqueda.puesto}
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            {busqueda.cliente}
            <span className="mx-2">·</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {busqueda.ubicacion}
            </span>
            <span className="mx-2">·</span>
            <span>abierta {busqueda.fechaApertura}</span>
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline">Editar</Button>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Sumar candidato
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mb-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Brief</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{busqueda.descripcion}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Requisitos</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2.5">
                {busqueda.requisitos.map((r, i) => (
                  <li key={r} className="flex items-start gap-3 text-sm">
                    <span className="text-xs text-muted-foreground tabular-nums shrink-0 mt-0.5 w-5">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Datos</CardTitle>
            <CardDescription>Detalles de la busqueda</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Rango</div>
              <div className="mt-0.5">{busqueda.rangoSalarial}</div>
            </div>
            <div className="border-t pt-3">
              <div className="text-xs text-muted-foreground">En gestion</div>
              <div className="mt-0.5 text-2xl font-semibold tabular-nums">
                {candidatosBusqueda.length}
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  candidatos
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Candidatos</CardTitle>
          <CardDescription>Ordenados por match con el perfil</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Actualizado</TableHead>
                <TableHead className="text-right">Match</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {candidatosBusqueda.map(({ candidato, gestion }) => (
                <TableRow key={gestion.id}>
                  <TableCell>
                    <Link
                      href={`/candidatos/${candidato.id}`}
                      className="flex items-center gap-3 hover:text-primary"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium">
                        {candidato.nombre[0]}
                        {candidato.apellido[0]}
                      </div>
                      <div>
                        <div className="font-medium">
                          {candidato.nombre} {candidato.apellido}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {candidato.ultimoPuesto}
                        </div>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {estadoLabels[gestion.estado] ?? gestion.estado}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {gestion.ultimaActualizacion}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {candidato.matchScore ?? "—"}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
