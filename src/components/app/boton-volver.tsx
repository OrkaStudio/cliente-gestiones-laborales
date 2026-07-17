"use client";

import type { CSSProperties, ReactNode } from "react";
import { useRouter } from "next/navigation";

/**
 * Flecha "volver" que hace un back de historial en vez de navegar a una URL fija.
 * Así, al volver desde el perfil de un candidato, se restaura la lista TAL COMO
 * estaba (los filtros viven en la URL — ver candidatos-client.tsx). Si no hay
 * historial dentro de la app (perfil abierto directo en una pestaña nueva), cae
 * al `fallbackHref`. Se renderiza como <a> real para que ctrl/cmd+clic siga
 * abriendo en pestaña nueva.
 */
export function BotonVolver({
  fallbackHref,
  className,
  style,
  children,
}: {
  fallbackHref: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const router = useRouter();
  return (
    <a
      href={fallbackHref}
      className={className}
      style={style}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        if (window.history.length > 1) router.back();
        else router.push(fallbackHref);
      }}
    >
      {children}
    </a>
  );
}
