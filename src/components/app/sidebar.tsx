"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  LayoutDashboard,
  LogOut,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Inicio", icon: LayoutDashboard },
  { href: "/candidatos", label: "Candidatos", icon: Users },
  { href: "/busquedas", label: "Busquedas", icon: Briefcase },
  { href: "/procesar", label: "Procesar CV", icon: Sparkles },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r bg-sidebar">
      <div className="flex items-center gap-2 px-5 py-5 border-b">
        <Image
          src="/brand/logo.svg"
          alt="GL"
          width={28}
          height={28}
          className="h-7 w-7"
        />
        <div className="leading-tight">
          <div className="text-sm font-semibold">Gestiones Laborales</div>
          <div className="text-xs text-muted-foreground">Panel interno</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-secondary text-foreground font-medium"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t px-3 py-3">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
            O
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">Oriana Vera</div>
            <div className="text-xs text-muted-foreground truncate">Recruiter</div>
          </div>
          <Link
            href="/login"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Cerrar sesion"
          >
            <LogOut className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
