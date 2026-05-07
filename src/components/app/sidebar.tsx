"use client"

import Link from "next/link"
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
      className="hidden lg:flex w-60 shrink-0 flex-col py-6 px-4"
      style={{
        background:  "var(--gl-surface)",
        borderRight: "1px solid var(--gl-border)",
      }}
    >
      {/* Brand */}
      <div className="px-3 mb-8">
        <div className="flex items-center gap-2.5">
          <div
            className="h-8 w-8 rounded-xl grid place-items-center font-bold text-sm text-white shadow-sm"
            style={{ background: "var(--gl-olive)" }}
          >
            GL
          </div>
          <div>
            <div className="text-sm font-bold leading-tight" style={{ color: "var(--gl-ink)" }}>
              Gestiones
            </div>
            <div className="text-[11px]" style={{ color: "var(--gl-ink-3)" }}>
              Panel interno
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-1">
        {items.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-all duration-150"
              style={{
                backgroundColor: isActive ? "var(--gl-olive-bg)" : "transparent",
                color:           isActive ? "var(--gl-olive)" : "var(--gl-ink-2)",
                fontWeight:      isActive ? 600 : 500,
              }}
            >
              <Icon
                className="h-4 w-4 shrink-0"
                style={{ color: isActive ? "var(--gl-olive)" : "var(--gl-ink-3)" }}
              />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer: user + logout */}
      <div className="px-1 mt-4">
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
