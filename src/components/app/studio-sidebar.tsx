"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Briefcase, Sparkles, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { label: "Inicio", href: "/estudio", icon: LayoutDashboard },
  { label: "Candidatos", href: "/estudio/candidatos", icon: Users },
  { label: "Búsquedas", href: "/estudio/busquedas", icon: Briefcase },
  { label: "Procesar CV", href: "/estudio/procesar", icon: Sparkles },
];

export function StudioSidebar() {
  const pathname = usePathname();

  return (
    <aside className="border-r studio-rule bg-[var(--studio-cream)]/60 backdrop-blur-sm flex flex-col">
      {/* Brand */}
      <div className="px-6 pt-7 pb-6 border-b studio-rule-soft">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl grid place-items-center bg-[var(--studio-olive)] text-[var(--studio-cream)] font-display text-lg leading-none">
            gl
          </div>
          <div>
            <div className="font-display text-base leading-tight">
              Gestiones
            </div>
            <div className="text-[11px] text-[var(--studio-ink-soft)] italic font-display -mt-0.5">
              Laborales
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="px-3 py-5 space-y-1 flex-1">
        <div className="px-3 pb-2 text-[10px] uppercase tracking-[0.22em] text-[var(--studio-ink-dim)]">
          Panel
        </div>
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/estudio"
              ? pathname === "/estudio"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors group",
                isActive
                  ? "bg-[var(--studio-olive)] text-[var(--studio-cream)] shadow-sm"
                  : "text-[var(--studio-ink-soft)] hover:bg-[var(--studio-paper-deep)]/50 hover:text-[var(--studio-ink)]",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className={cn(isActive && "font-medium")}>
                {item.label}
              </span>
              {isActive && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--studio-cream)]/80" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Tip card */}
      <div className="mx-3 mb-3 p-4 rounded-xl bg-[var(--studio-amber-tint)]/60 border border-[var(--studio-amber)]/20">
        <div className="flex items-center gap-2 mb-1.5">
          <Sparkles className="h-3.5 w-3.5 text-[var(--studio-amber)]" />
          <span className="text-[11px] uppercase tracking-[0.2em] text-[var(--studio-amber)] font-medium">
            Tip del día
          </span>
        </div>
        <p className="text-[12px] leading-relaxed text-[var(--studio-ink-soft)]">
          Pegá un CV en{" "}
          <span className="italic font-display text-[var(--studio-ink)]">
            Procesar CV
          </span>{" "}
          y la IA te arma las preguntas.
        </p>
      </div>

      {/* User footer */}
      <div className="border-t studio-rule-soft px-4 py-4 flex items-center gap-3">
        <div className="h-9 w-9 rounded-full grid place-items-center bg-[var(--studio-olive)] text-[var(--studio-cream)] font-display text-sm shrink-0">
          O
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm leading-tight">Oriana Vera</div>
          <div className="text-[11px] text-[var(--studio-ink-dim)] italic font-display">
            Reclutadora
          </div>
        </div>
        <button className="text-[var(--studio-ink-dim)] hover:text-[var(--studio-clay)] transition-colors">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
