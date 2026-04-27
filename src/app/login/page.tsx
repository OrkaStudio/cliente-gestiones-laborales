import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-14 text-primary-foreground lg:flex">
        <div className="absolute inset-0 opacity-15 leaf-mark bg-repeat bg-[length:280px_280px]" />
        <header className="relative z-10 flex items-center gap-3">
          <Image
            src="/brand/logo.svg"
            alt="Gestiones Laborales"
            width={48}
            height={48}
            className="h-12 w-12 brightness-0 invert"
          />
          <span className="font-display text-2xl font-light italic tracking-tight">
            Gestiones Laborales
          </span>
        </header>

        <blockquote className="relative z-10 max-w-xl space-y-6">
          <p className="font-display text-4xl font-light italic leading-[1.15] tracking-[-0.01em]">
            &ldquo;Encontramos personas
            <br />
            para el campo desde 2013.
            <br />
            Esta es nuestra herramienta
            <br />
            de trabajo.&rdquo;
          </p>
          <footer className="editorial-eyebrow text-primary-foreground/70">
            Andrea Monreal &middot; Directora
          </footer>
        </blockquote>

        <span className="relative z-10 editorial-eyebrow text-primary-foreground/60">
          Edicion 2026
        </span>
      </aside>

      <main className="flex items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-sm space-y-10">
          <header className="space-y-3">
            <span className="editorial-eyebrow">Acceso</span>
            <h1 className="font-display text-4xl font-light leading-tight tracking-tight text-foreground">
              Bienvenida
              <span className="italic text-primary"> de vuelta</span>.
            </h1>
            <p className="text-sm text-muted-foreground">
              Ingresa con tu cuenta para entrar al panel.
            </p>
          </header>

          <form className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="editorial-eyebrow">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                defaultValue="oriana@gestioneslaborales.com.ar"
                className="h-11 rounded-md border-x-0 border-t-0 border-b border-border bg-transparent px-1 shadow-none focus-visible:ring-0 focus-visible:border-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="editorial-eyebrow">
                Contrasena
              </Label>
              <Input
                id="password"
                type="password"
                defaultValue="demo-2026"
                className="h-11 rounded-md border-x-0 border-t-0 border-b border-border bg-transparent px-1 shadow-none focus-visible:ring-0 focus-visible:border-primary"
              />
            </div>
            <Link href="/" className="block pt-4">
              <Button size="lg" className="w-full rounded-full">
                Ingresar
              </Button>
            </Link>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Esto es una demo &mdash; los datos son ficticios.
          </p>
        </div>
      </main>
    </div>
  );
}
