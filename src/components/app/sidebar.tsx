"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Home, Users, Search, FileText, LogOut, Bell, UserPlus, Copy, ShieldCheck, AlertCircle, X, ArrowRight, Trash2 } from "lucide-react"
import { signOut } from "@/lib/actions/auth"
import { marcarTodasLeidas, marcarLeida } from "@/lib/actions/notificaciones"
import { useState, useTransition } from "react"

const items = [
  { label: "Inicio",      href: "/",          icon: Home },
  { label: "Candidatos",  href: "/candidatos", icon: Users },
  { label: "Búsquedas",   href: "/busquedas",  icon: Search },
  { label: "Procesar CV", href: "/procesar",   icon: FileText },
]

type Notificacion = {
  id: string
  tipo: "garantia" | "cv_error" | "cv_nuevo" | "cv_duplicado"
  titulo: string
  cuerpo: string
  candidato_id: string | null
  busqueda_id: string | null
  created_at: string
}

interface SidebarProps {
  userEmail: string | null
  notificaciones: Notificacion[]
}

function getInitial(email: string | null): string {
  if (!email) return "?"
  return email[0].toUpperCase()
}

function getDisplayName(email: string | null): string {
  if (!email) return "Usuario"
  return email.split("@")[0]
}

function tiempoAtras(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

const TIPO_CONFIG: Record<
  Notificacion["tipo"],
  {
    icon: React.ComponentType<{ className?: string }>
    label: string
    chipBg: string
    chipColor: string
    actionLabel?: string
    actionType: "navigate" | "dismiss" | "navigate+dismiss"
  }
> = {
  cv_nuevo:     { icon: UserPlus,    label: "CV nuevo",    chipBg: "#1a7f37", chipColor: "#fff", actionLabel: "Ver perfil",      actionType: "navigate" },
  cv_duplicado: { icon: Copy,        label: "Duplicado",   chipBg: "#7d4e00", chipColor: "#fff", actionLabel: "Ver existente",   actionType: "navigate+dismiss" },
  garantia:     { icon: ShieldCheck, label: "Garantía",    chipBg: "#0550ae", chipColor: "#fff", actionLabel: "Ver búsqueda",    actionType: "navigate" },
  cv_error:     { icon: AlertCircle, label: "Error",       chipBg: "#cf222e", chipColor: "#fff", actionLabel: "Descartar",       actionType: "dismiss" },
}

export function Sidebar({ userEmail, notificaciones: initialNotificaciones }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [notifs, setNotifs] = useState(initialNotificaciones)
  const count = notifs.length

  function dismiss(id: string) {
    setNotifs((prev) => prev.filter((n) => n.id !== id))
    startTransition(async () => {
      await marcarLeida(id)
    })
  }

  function handleMarcarLeidas() {
    setNotifs([])
    startTransition(async () => {
      await marcarTodasLeidas()
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <aside
        className="hidden lg:flex shrink-0 flex-col py-6 px-3"
        style={{
          width:       "248px",
          background:  "#ffffff",
          borderRight: "1px solid var(--gl-border)",
        }}
      >
        {/* Logo + bell */}
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
          <div style={{ lineHeight: 1.15, flex: 1 }}>
            <div style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.05em", color: "#45602a", textTransform: "uppercase" }}>Gestiones</div>
            <div style={{ fontSize: "12px", fontWeight: 400, letterSpacing: "0.05em", color: "#45602a", textTransform: "uppercase" }}>Laborales</div>
          </div>
          {/* Bell */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="relative h-8 w-8 rounded-lg grid place-items-center transition-colors shrink-0"
            style={{
              background: open ? "var(--gl-olive-bg)" : "transparent",
              border: "none",
              cursor: "pointer",
              color: open ? "var(--gl-olive)" : "var(--gl-ink-3)",
            }}
            title="Notificaciones"
          >
            <Bell className="h-4 w-4" />
            {count > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "2px",
                  right: "2px",
                  fontSize: "9px",
                  fontWeight: 700,
                  width: "14px",
                  height: "14px",
                  borderRadius: "99px",
                  background: "#cf222e",
                  color: "#fff",
                  display: "grid",
                  placeItems: "center",
                  lineHeight: 1,
                }}
              >
                {count > 9 ? "9+" : count}
              </span>
            )}
          </button>
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

      {/* Panel de notificaciones */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          {/* Panel */}
          <div
            className="fixed top-0 z-50 flex flex-col"
            style={{
              left: "248px",
              width: "320px",
              height: "100vh",
              background: "#fff",
              borderRight: "1px solid var(--gl-border)",
              boxShadow: "4px 0 16px rgba(0,0,0,0.08)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-4"
              style={{ borderBottom: "1px solid var(--gl-border)" }}
            >
              <span className="text-[14px] font-semibold" style={{ color: "var(--gl-ink)" }}>
                Notificaciones
                {count > 0 && (
                  <span
                    className="ml-2 text-[11px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: "#ffebe9", color: "#cf222e" }}
                  >
                    {count}
                  </span>
                )}
              </span>
              <button
                onClick={() => setOpen(false)}
                className="h-7 w-7 rounded-lg grid place-items-center"
                style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--gl-ink-3)" }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto">
              {notifs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2" style={{ color: "var(--gl-ink-3)" }}>
                  <Bell className="h-8 w-8 opacity-30" />
                  <span className="text-[13px]">Sin notificaciones</span>
                </div>
              ) : (
                <div className="p-3 flex flex-col gap-2">
                  {notifs.map((n) => {
                    const cfg = TIPO_CONFIG[n.tipo]
                    const Icon = cfg.icon
                    const href = n.candidato_id
                      ? `/candidatos/${n.candidato_id}`
                      : n.busqueda_id
                      ? `/busquedas/${n.busqueda_id}`
                      : null

                    return (
                      <div
                        key={n.id}
                        className="rounded-xl p-3 flex flex-col gap-2"
                        style={{
                          background: "#fff",
                          border: "1px solid var(--gl-border)",
                          boxShadow: "0 1px 3px rgba(13,17,23,0.04)",
                        }}
                      >
                        {/* Fila superior: chip + tiempo + dismiss */}
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10.5px] font-semibold shrink-0"
                            style={{ background: cfg.chipBg, color: cfg.chipColor }}
                          >
                            <Icon className="h-3 w-3" />
                            {cfg.label}
                          </span>
                          <span className="flex-1 text-[10px]" style={{ color: "var(--gl-ink-3)" }}>
                            {tiempoAtras(n.created_at)}
                          </span>
                          <button
                            onClick={() => dismiss(n.id)}
                            className="h-5 w-5 rounded-md grid place-items-center transition-colors shrink-0"
                            style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--gl-ink-3)" }}
                            title="Descartar"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>

                        {/* Título */}
                        <p className="text-[12.5px] font-semibold leading-snug" style={{ color: "var(--gl-ink)" }}>
                          {n.titulo}
                        </p>

                        {/* Cuerpo */}
                        <p className="text-[11.5px] leading-snug" style={{ color: "var(--gl-ink-3)" }}>
                          {n.cuerpo}
                        </p>

                        {/* Acciones */}
                        <div
                          className="flex items-center gap-2 pt-2"
                          style={{ borderTop: "1px solid var(--gl-border)" }}
                        >
                          {cfg.actionType === "dismiss" ? (
                            <button
                              onClick={() => dismiss(n.id)}
                              className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold rounded-lg px-2.5 py-1.5 transition-colors"
                              style={{ background: "var(--gl-surface)", color: "var(--gl-ink-3)", border: "1px solid var(--gl-border)", cursor: "pointer" }}
                            >
                              <Trash2 className="h-3 w-3" />
                              {cfg.actionLabel}
                            </button>
                          ) : (
                            <>
                              {href && (
                                <Link
                                  href={href}
                                  onClick={() => { dismiss(n.id); setOpen(false) }}
                                  className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold rounded-lg px-2.5 py-1.5 transition-colors"
                                  style={{ background: "var(--gl-olive-bg)", color: "var(--gl-olive)", border: "none" }}
                                >
                                  {cfg.actionLabel}
                                  <ArrowRight className="h-3 w-3" />
                                </Link>
                              )}
                              {cfg.actionType === "navigate+dismiss" && (
                                <button
                                  onClick={() => dismiss(n.id)}
                                  className="inline-flex items-center gap-1.5 text-[11.5px] font-medium rounded-lg px-2.5 py-1.5 transition-colors"
                                  style={{ background: "transparent", color: "var(--gl-ink-3)", border: "1px solid var(--gl-border)", cursor: "pointer" }}
                                >
                                  Ignorar
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {count > 0 && (
              <div
                className="px-4 py-3"
                style={{ borderTop: "1px solid var(--gl-border)" }}
              >
                <button
                  onClick={handleMarcarLeidas}
                  disabled={pending}
                  className="w-full text-[12.5px] font-medium py-2 rounded-lg transition-colors"
                  style={{
                    background: "var(--gl-olive-bg)",
                    color: "var(--gl-olive)",
                    border: "none",
                    cursor: pending ? "not-allowed" : "pointer",
                    opacity: pending ? 0.6 : 1,
                  }}
                >
                  {pending ? "Marcando…" : "Marcar todas como leídas"}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}
