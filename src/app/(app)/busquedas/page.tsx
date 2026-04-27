import Link from "next/link";
import { ArrowUpRight, MapPin, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { busquedas, gestiones } from "@/lib/mock/data";

export default function BusquedasPage() {
  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <div className="flex items-end justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Busquedas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {busquedas.filter((b) => b.estado === "activa").length} activas
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nueva busqueda
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {busquedas.map((b) => {
          const cands = gestiones.filter((g) => g.busquedaId === b.id).length;
          return (
            <Link key={b.id} href={`/busquedas/${b.id}`} className="block group">
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant={b.estado === "activa" ? "default" : "outline"}>
                      {b.estado}
                    </Badge>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <CardTitle className="mt-3">{b.puesto}</CardTitle>
                  <CardDescription>{b.cliente}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {b.ubicacion}
                  </div>
                  <div className="flex items-center justify-between border-t pt-3">
                    <span className="text-xs text-muted-foreground">Candidatos</span>
                    <span className="text-lg font-semibold tabular-nums">{cands}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
