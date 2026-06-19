"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Home, LogOut, Users } from "lucide-react";
import { logoutAdmin } from "@/features/auth/actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

interface AdminShellProps {
  displayName: string;
  role: string;
  children: React.ReactNode;
}

const navItems = [
  { href: "/admin", label: "Inicio", icon: Home },
  { href: "/admin/customers", label: "Clientes", icon: Users },
  { href: "/admin/quotes", label: "Cotizaciones", icon: FileText },
];

function NavLink({ href, label, icon: Icon }: (typeof navItems)[number]) {
  const pathname = usePathname();
  const active =
    href === "/admin"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={`flex min-h-[var(--tap-min-height)] flex-col items-center justify-center gap-0.5 px-3 py-1 text-xs font-medium transition-colors md:flex-row md:gap-2 md:rounded-md md:px-3 md:py-2 md:text-sm ${
        active
          ? "text-white md:bg-white/10"
          : "text-white/70 hover:text-white md:hover:bg-white/10"
      }`}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="h-5 w-5 md:h-4 md:w-4" aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
}

export function AdminShell({ displayName, role, children }: AdminShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-[var(--background)] pb-[calc(var(--tap-min-height)+env(safe-area-inset-bottom))] md:pb-0">
      <header className="sticky top-0 z-40 border-b border-[var(--color-navy-700)] bg-[var(--color-navy-900)] text-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold tracking-tight">SEBASAM</span>
            <span className="hidden text-xs text-white/60 md:inline">Operaciones</span>
          </div>

          <div className="flex items-center gap-1 md:gap-3">
            <nav aria-label="Navegación principal" className="hidden items-center md:flex">
              {navItems.map((item) => (
                <NavLink key={item.href} {...item} />
              ))}
            </nav>

            <div className="hidden h-6 w-px bg-white/20 md:block" />

            <div className="hidden flex-col items-end md:flex">
              <span className="text-sm font-medium leading-none">{displayName}</span>
              <span className="text-xs text-white/60">{role}</span>
            </div>

            <ThemeToggle className="text-white hover:bg-white/10" />

            <form action={logoutAdmin}>
              <Button
                type="submit"
                variant="ghost"
                aria-label="Cerrar sesión"
                className="text-white hover:bg-white/10"
              >
                <LogOut className="h-5 w-5" aria-hidden="true" />
                <span className="hidden md:inline">Salir</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <nav
        aria-label="Navegación móvil"
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--color-navy-700)] bg-[var(--color-navy-900)] text-white md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid grid-cols-3">
          {navItems.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </div>
      </nav>
    </div>
  );
}
