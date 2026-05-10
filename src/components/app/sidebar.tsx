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

export function Sidebar({ userEmail }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className="hidden lg:flex shrink-0 flex-col items-center py-5"
      style={{
        width:       "72px",
        background:  "#ffffff",
        borderRight: "1px solid var(--gl-border)",
        gap:         0,
      }}
    >
      {/* Logo mark */}
      <div className="mb-8 mt-1">
        <div
          className="h-9 w-9 rounded-xl grid place-items-center font-bold text-sm text-white"
          style={{ background: "var(--gl-olive)", letterSpacing: "0.04em", fontSize: 13 }}
        >
          GL
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col items-center gap-1 w-full px-2">
        {items.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className="relative group flex items-center justify-center w-full rounded-xl transition-all duration-150"
              style={{
                height:          44,
                backgroundColor: isActive ? "var(--gl-olive-bg)" : "transparent",
              }}
            >
              <Icon
                className="h-[18px] w-[18px] shrink-0 transition-colors"
                style={{ color: isActive ? "var(--gl-olive)" : "var(--gl-ink-3)" }}
              />

              {/* Tooltip */}
              <div
                className="pointer-events-none absolute left-full ml-3 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50"
                style={{
                  background: "#0d1117",
                  color:      "#fff",
                  boxShadow:  "0 4px 12px rgba(13,17,23,0.18)",
                }}
              >
                {item.label}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Footer: avatar + logout */}
      <div className="flex flex-col items-center gap-2 w-full px-2 mt-4">
        <div className="h-px w-full" style={{ background: "var(--gl-border)" }} />

        <div
          className="h-8 w-8 rounded-full grid place-items-center text-xs font-bold text-white mt-1"
          style={{ background: "var(--gl-olive)" }}
          title={userEmail ?? ""}
        >
          {getInitial(userEmail)}
        </div>

        <form action={signOut} className="w-full flex justify-center">
          <button
            type="submit"
            title="Cerrar sesión"
            className="h-9 w-full rounded-xl grid place-items-center transition-colors group"
            style={{ background: "transparent", border: "none", cursor: "pointer" }}
          >
            <LogOut
              className="h-[16px] w-[16px] transition-colors"
              style={{ color: "var(--gl-ink-3)" }}
            />
          </button>
        </form>
      </div>
    </aside>
  )
}
