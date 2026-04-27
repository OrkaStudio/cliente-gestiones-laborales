"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const variants = [
  { id: "m1", label: "Modelo 1", prefix: "/" },
  { id: "agro", label: "Agro", prefix: "/agro" },
  { id: "estudio", label: "Estudio", prefix: "/estudio" },
];

export function VariantSwitcher() {
  const pathname = usePathname();
  const active = pathname.startsWith("/agro")
    ? "agro"
    : pathname.startsWith("/estudio")
      ? "estudio"
      : "m1";

  return (
    <div className="fixed top-3 right-3 z-50 flex items-center gap-0.5 rounded-full border bg-card/95 p-0.5 shadow-sm backdrop-blur">
      {variants.map((v) => (
        <Link
          key={v.id}
          href={v.prefix}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
            active === v.id
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {v.label}
        </Link>
      ))}
    </div>
  );
}
