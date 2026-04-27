import Link from "next/link";
import { ArrowUpRight, Briefcase, FileText, Sparkles, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { busquedas, candidatos, gestiones, stats } from "@/lib/mock/data";

export default function Home() {
  const today = new Date("2026-04-25").toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const busquedasActivas = busquedas.filter((b) => b.estado === "activa");
  const ultimosCandidatos = candidatos
    .filter((c) => c.estado === "activo")
    .slice(0, 4);

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <div className="flex items-end justify-between gap-6 mb-8">
        <div>
          <p className="text-sm text-muted-foreground capitalize">{today}</p>
          <h1 className="text-3xl font-semibold tracking-tight mt-1">Inicio</h1>
        </div>
        <Link href="/procesar">
          <Button className="gap-2">
            <Sparkles className="h-4 w-4" />
            Procesar CV
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <StatCard
          icon={Users}
          label="Candidatos activos"
          value={stats.candidatosActivos}
        />
        <StatCard
          icon={Briefcase}
          label="Busquedas abiertas"
          value={stats.busquedasActivas}
        />
        <StatCard
          icon={FileText}
          label="Gestiones en curso"
          value={stats.gestionesEnCurso}
        />
        <StatCard
          icon={Sparkles}
          label="CVs ult. 7 dias"
          value={stats.cvsProcesadosUltimos7d}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Busquedas activas</CardTitle>
              <CardDescription>{busquedasActivas.length} abiertas</CardDescription>
            </div>
            <Link href="/busquedas">
              <Button variant="ghost" size="sm" className="gap-1">
                Ver todas
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {busquedasActivas.map((b) => {
              const cands = gestiones.filter((g) => g.busquedaId === b.id).length;
              return (
                <Link
                  key={b.id}
                  href={`/busquedas/${b.id}`}
                  className="block rounded-md border p-3 hover:bg-secondary/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{b.puesto}</div>
                      <div className="text-xs text-muted-foreground truncate mt-0.5">
                        {b.cliente}
                      </div>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {cands} cands.
                    </Badge>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Ultimos candidatos</CardTitle>
              <CardDescription>Activos en la base</CardDescription>
            </div>
            <Link href="/candidatos">
              <Button variant="ghost" size="sm" className="gap-1">
                Ver base
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {ultimosCandidatos.map((c) => (
              <Link
                key={c.id}
                href={`/candidatos/${c.id}`}
                className="flex items-center gap-3 rounded-md border p-3 hover:bg-secondary/40 transition-colors"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium">
                  {c.nombre[0]}
                  {c.apellido[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {c.nombre} {c.apellido}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {c.ultimoPuesto} · {c.ubicacion}
                  </div>
                </div>
                {c.matchScore ? (
                  <Badge variant="outline">{c.matchScore}%</Badge>
                ) : null}
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">{label}</span>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="text-3xl font-semibold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}
