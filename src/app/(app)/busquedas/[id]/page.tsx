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

export default async function BusquedaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: busqueda }, { data: gestionesData }] = await Promise.all([
    supabase.from("busquedas").select("*").eq("id", id).single(),
    supabase
      .from("gestiones")
      .select("*, candidatos(id, nombre, apellido, ultimo_puesto)")
      .eq("busqueda_id", id),
  ]);

  if (!busqueda) notFound();

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
          <h1 className="text-2xl font-semibold tracking-tight mt-3">{busqueda.puesto}</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            {busqueda.cliente}
            {busqueda.ubicacion ? (
              <>
                <span className="mx-2">·</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {busqueda.ubicacion}
                </span>
              </>
            ) : null}
            <span className="mx-2">·</span>
            <span>abierta {busqueda.fecha_apertura}</span>
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
          {busqueda.descripcion ? (
            <Card>
              <CardHeader>
                <CardTitle>Brief</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{busqueda.descripcion}</p>
              </CardContent>
            </Card>
          ) : null}

          {busqueda.requisitos.length > 0 ? (
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
          ) : null}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Datos</CardTitle>
            <CardDescription>Detalles de la busqueda</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {busqueda.rango_salarial ? (
              <div>
                <div className="text-xs text-muted-foreground">Rango</div>
                <div className="mt-0.5">{busqueda.rango_salarial}</div>
              </div>
            ) : null}
            <div className="border-t pt-3">
              <div className="text-xs text-muted-foreground">En gestion</div>
              <div className="mt-0.5 text-2xl font-semibold tabular-nums">
                {gestionesData?.length ?? 0}
                <span className="text-sm font-normal text-muted-foreground ml-1">candidatos</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Candidatos</CardTitle>
          <CardDescription>En gestion para esta busqueda</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Actualizado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gestionesData?.map(({ id: gId, candidatos: cand, estado, updated_at, notas }) => (
                <TableRow key={gId}>
                  <TableCell>
                    {cand ? (
                      <Link
                        href={`/candidatos/${cand.id}`}
                        className="flex items-center gap-3 hover:text-primary"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium">
                          {cand.nombre[0]}{cand.apellido[0]}
                        </div>
                        <div>
                          <div className="font-medium">{cand.nombre} {cand.apellido}</div>
                          <div className="text-xs text-muted-foreground">{cand.ultimo_puesto}</div>
                        </div>
                      </Link>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{estadoLabels[estado] ?? estado}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {updated_at.slice(0, 10)}
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
