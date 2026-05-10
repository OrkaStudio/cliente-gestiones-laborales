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
      className="hidden lg:flex shrink-0 flex-col py-6 px-3"
      style={{
        width:       "248px",
        background:  "#ffffff",
        borderRight: "1px solid var(--gl-border)",
      }}
    >
      {/* Logo */}
      <div className="px-3 mb-8 flex items-center gap-2.5">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 302 375"
          height="38"
          fill="#45602a"
          aria-hidden="true"
          style={{ flexShrink: 0 }}
        >
          <path
            fillRule="evenodd"
            d="M 68.28125 45.332031 C 64.113281 48.632812 60.027344 52.195312 56.289062 56.019531 C 31.089844 81.21875 17.097656 115.113281 17.097656 150.742188 C 17.097656 186.371094 31.089844 220.261719 56.289062 245.460938 C 60.113281 249.285156 64.113281 252.847656 68.28125 256.152344 Z M 100.089844 9.09375 L 100.089844 26.820312 C 116.25 20.214844 133.457031 16.828125 151.011719 16.828125 C 168.652344 16.828125 186.121094 20.214844 202.371094 26.996094 C 218.707031 33.773438 233.480469 43.765625 245.90625 56.28125 L 248.253906 58.625 L 259.984375 46.980469 L 257.640625 44.636719 C 243.648438 30.558594 226.964844 19.347656 208.714844 11.785156 C 190.378906 4.140625 170.824219 0.230469 151.011719 0.230469 C 133.546875 0.230469 116.339844 3.183594 100.089844 9.09375 Z M 84.878906 285.957031 L 84.878906 358.261719 L 233.65625 358.261719 L 233.65625 374.769531 L 68.28125 374.769531 L 68.28125 276.488281 C 59.765625 270.835938 51.769531 264.40625 44.558594 257.109375 C 16.230469 228.777344 0.5 190.714844 0.5 150.742188 C 0.5 110.679688 16.230469 72.617188 44.558594 44.375 C 54.988281 33.945312 66.890625 25.082031 79.925781 18.128906 L 84.878906 15.523438 L 84.878906 267.363281 C 105.042969 278.832031 127.722656 284.828125 151.011719 284.828125 C 186.640625 284.828125 220.53125 270.835938 245.734375 245.636719 C 268.9375 222.433594 282.753906 191.84375 284.664062 159.257812 L 147.625 159.257812 L 147.625 142.660156 L 301.265625 142.660156 L 301.351562 145.875 C 301.4375 147.527344 301.4375 149.261719 301.4375 150.914062 C 301.4375 190.976562 285.707031 229.039062 257.378906 257.28125 C 229.050781 285.609375 190.988281 301.339844 151.011719 301.339844 C 127.984375 301.167969 105.476562 296.039062 84.878906 285.957031 Z"
          />
        </svg>
        <div style={{ lineHeight: 1.15 }}>
          <div style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.05em", color: "#45602a", textTransform: "uppercase" }}>Gestiones</div>
          <div style={{ fontSize: "12px", fontWeight: 400, letterSpacing: "0.05em", color: "#45602a", textTransform: "uppercase" }}>Laborales</div>
        </div>
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
