import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { candidatos } from "@/lib/mock/data";

export default function CandidatosPage() {
  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <div className="flex items-end justify-between gap-6 mb-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Candidatos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {candidatos.length} en la base ·{" "}
            {candidatos.filter((c) => c.estado === "activo").length} activos
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo candidato
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="border-b p-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, ubicacion, puesto..."
                className="pl-9"
              />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Ultimo puesto</TableHead>
                <TableHead>Ubicacion</TableHead>
                <TableHead>Ingreso</TableHead>
                <TableHead className="text-right">Match</TableHead>
                <TableHead className="text-right">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {candidatos.map((c) => (
                <TableRow key={c.id} className="cursor-pointer">
                  <TableCell>
                    <Link
                      href={`/candidatos/${c.id}`}
                      className="flex items-center gap-3 hover:text-primary"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium">
                        {c.nombre[0]}
                        {c.apellido[0]}
                      </div>
                      <span className="font-medium">
                        {c.nombre} {c.apellido}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.ultimoPuesto}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.ubicacion}</TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {c.fechaIngreso}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.matchScore ? `${c.matchScore}%` : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={c.estado === "activo" ? "default" : "outline"}
                    >
                      {c.estado}
                    </Badge>
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
