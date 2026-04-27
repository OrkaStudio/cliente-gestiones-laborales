"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { label: "Inicio", href: "/agro", section: "01" },
  { label: "Candidatos", href: "/agro/candidatos", section: "02" },
];

const ahora = () => {
  const d = new Date(2026, 3, 25, 9, 14);
  return d.toLocaleString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function AgroSidebar() {
  const pathname = usePathname();

  return (
    <aside className="border-l agro-rule px-7 py-10 flex flex-col gap-10 bg-[rgba(255,253,247,0.5)]">
      <div>
        <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--agro-ink-soft)]">
          Gestiones Laborales
        </div>
        <div className="font-display text-2xl mt-2 leading-[1.05]">
          Panel<br />interno
        </div>
        <div className="mt-3 text-[11px] text-[var(--agro-ink-soft)] capitalize">
          {ahora()}
        </div>
      </div>

      <nav className="space-y-px">
        {items.map((item) => {
          const isActive =
            item.href === "/agro"
              ? pathname === "/agro"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-baseline justify-between gap-3 py-2.5 border-b agro-rule text-sm",
                isActive
                  ? "text-[var(--agro-ink)]"
                  : "text-[var(--agro-ink-soft)] hover:text-[var(--agro-ink)]",
              )}
            >
              <span className="flex items-baseline gap-3">
                <span className="font-mono text-[10px] tabular-nums text-[var(--agro-ink-soft)]">
                  {item.section}
                </span>
                <span
                  className={cn(
                    "font-display text-base",
                    isActive && "italic",
                  )}
                >
                  {item.label}
                </span>
              </span>
              {isActive && (
                <span className="text-[var(--agro-olive)] text-xs">●</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-4">
        <div className="agro-divider" />
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full grid place-items-center bg-[var(--agro-olive)] text-[#f5f1e8] font-display text-sm">
            O
          </div>
          <div>
            <div className="text-sm font-medium leading-tight">Oriana</div>
            <div className="text-[11px] text-[var(--agro-ink-soft)]">
              Reclutadora
            </div>
          </div>
        </div>
        <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--agro-ink-soft)]">
          Demo · Orka Studio
        </div>
      </div>
    </aside>
  );
}
