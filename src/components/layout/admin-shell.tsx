"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleUserRound, Cog, FileText, Home, LogOut, Users, type LucideIcon } from "lucide-react";
import { logoutAdmin } from "@/features/auth/actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

interface AdminShellProps {
  displayName: string;
  role: string;
  children: React.ReactNode;
}

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  { href: "/admin", label: "Inicio", icon: Home },
  { href: "/admin/customers", label: "Clientes", icon: Users },
  { href: "/admin/quotes", label: "Cotizaciones", icon: FileText },
  { href: "/admin/configuracion-pago", label: "Configuración", icon: Cog },
];

function NavLink({ href, label, icon: Icon, mobile = false }: NavItem & { mobile?: boolean }) {
  const pathname = usePathname();
  const active =
    href === "/admin"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={
        mobile
          ? `flex min-h-[var(--tap-min-height)] flex-col items-center justify-center gap-0.5 px-3 py-1 text-xs font-medium transition-colors ${
              active ? "text-white" : "text-white/70 hover:text-white"
            }`
          : `flex min-h-[var(--tap-min-height)] items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-[image:var(--gradient-primary)] text-white shadow-sm"
                : "text-white/70 hover:bg-white/8 hover:text-white"
            }`
      }
      aria-current={active ? "page" : undefined}
    >
      <Icon className={mobile ? "h-5 w-5" : "h-4 w-4"} aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
}

export function AdminShell({ displayName, role, children }: AdminShellProps) {
  return (
    <div className="flex min-h-dvh bg-[var(--background)] pb-[calc(var(--tap-min-height)+env(safe-area-inset-bottom))] md:pb-0">
      <aside className="hidden w-64 shrink-0 flex-col bg-[var(--color-navy-900)] p-4 text-white md:flex">
        <div className="border-b border-white/12 px-3 pb-5">
          <p className="text-xl font-extrabold tracking-[-0.04em]">SEBASAM</p>
          <p className="mt-1 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-white/55">
            Operaciones
          </p>
        </div>

        <nav aria-label="Navegación principal" className="mt-6 flex flex-1 flex-col gap-1">
          {navItems.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>

        <div className="border-t border-white/12 px-3 pt-4">
          <p className="truncate text-sm font-semibold">{displayName}</p>
          <p className="mt-1 text-xs text-white/55">{role}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-[var(--color-border-light)] bg-[var(--color-surface)] text-[var(--color-text-main)]">
          <div className="mx-auto flex w-full items-center justify-between px-4 py-3 md:px-6">
            <div className="md:hidden">
              <p className="text-lg font-extrabold tracking-[-0.04em]">SEBASAM</p>
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                Operaciones
              </p>
            </div>
            <p className="hidden font-mono text-xs uppercase tracking-[0.14em] text-[var(--color-text-muted)] md:block">
              Panel de operaciones
            </p>

            <div className="flex items-center gap-1">
              <details className="relative">
                <summary className="flex min-h-[var(--tap-min-height)] cursor-pointer list-none items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-[var(--color-bg-soft)] [&::-webkit-details-marker]:hidden">
                  <CircleUserRound className="h-5 w-5" aria-hidden="true" />
                  <span className="hidden text-right sm:flex sm:flex-col">
                    <span className="text-sm font-semibold leading-tight">{displayName}</span>
                    <span className="text-xs text-[var(--color-text-muted)]">{role}</span>
                  </span>
                </summary>
                <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-surface)] p-2 shadow-lg">
                  <div className="border-b border-[var(--color-border-light)] px-3 py-2 sm:hidden">
                    <p className="truncate text-sm font-semibold">{displayName}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{role}</p>
                  </div>
                  <form action={logoutAdmin}>
                    <Button type="submit" variant="ghost" className="w-full justify-start gap-2">
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      Salir
                    </Button>
                  </form>
                </div>
              </details>

              <ThemeToggle className="text-[var(--color-text-main)] hover:bg-[var(--color-bg-soft)]" />
            </div>
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>

      <nav
        aria-label="Navegación móvil"
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--color-navy-700)] bg-[var(--color-navy-900)] text-white md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid grid-cols-4">
          {navItems.map((item) => (
            <NavLink key={item.href} {...item} mobile />
          ))}
        </div>
      </nav>
    </div>
  );
}
