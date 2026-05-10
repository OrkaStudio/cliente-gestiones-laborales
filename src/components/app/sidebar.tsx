"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Home, Users, Search, FileText, LogOut } from "lucide-react"
import { signOut } from "@/lib/actions/auth"

const items = [
  { label: "Inicio",      href: "/",          icon: Home },
  { label: "Candidatos",  href: "/candidatos", icon: Users },
  { label: "Búsquedas",   href: "/busquedas",  icon: Search },
  { label: "Procesar CV", href: "/procesar",   icon: FileText },
]

interface SidebarProps {
  userEmail: string | null
}

function getInitial(email: string | null): string {
  if (!email) return "?"
  return email[0].toUpperCase()
}

function getDisplayName(email: string | null): string {
  if (!email) return "Usuario"
  return email.split("@")[0]
}

export function Sidebar({ userEmail }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className="hidden lg:flex shrink-0 flex-col py-6 px-3"
      style={{
        width:       "248px",
        background:  "#ffffff",
        borderRight: "1px solid var(--gl-border)",
      }}
    >
      {/* Logo */}
      <div className="px-2 mb-8">
        <Image
          src="/brand/logo-leyenda.png"
          alt="Gestiones Laborales"
          width={148}
          height={52}
          style={{ objectFit: "contain", objectPosition: "left" }}
          priority
        />
      </div>

      {/* Sección label */}
      <div
        className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest"
        style={{ color: "var(--gl-ink-3)", letterSpacing: "0.15em" }}
      >
        Menú
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-0.5">
        {items.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] transition-all duration-150"
              style={{
                backgroundColor: isActive ? "var(--gl-olive-bg)" : "transparent",
                color:           isActive ? "var(--gl-olive)" : "#4b5563",
                fontWeight:      isActive ? 600 : 450,
              }}
            >
              <div
                className="h-7 w-7 rounded-lg grid place-items-center shrink-0 transition-all"
                style={{
                  background: isActive ? "var(--gl-olive)" : "transparent",
                }}
              >
                <Icon
                  className="h-[15px] w-[15px] shrink-0"
                  style={{ color: isActive ? "#fff" : "#9ca3af" }}
                />
              </div>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="mt-4">
        <div className="h-px mb-4" style={{ background: "var(--gl-border)" }} />
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl">
          <div
            className="h-8 w-8 rounded-full grid place-items-center text-xs font-bold shrink-0 text-white"
            style={{ background: "var(--gl-olive)" }}
          >
            {getInitial(userEmail)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold leading-tight truncate" style={{ color: "var(--gl-ink)" }}>
              {getDisplayName(userEmail)}
            </div>
            <div className="text-[11px] truncate" style={{ color: "var(--gl-ink-3)" }}>
              {userEmail ?? ""}
            </div>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              title="Cerrar sesión"
              className="h-7 w-7 rounded-lg grid place-items-center transition-colors"
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--gl-ink-3)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--gl-ink)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--gl-ink-3)")}
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  )
}
