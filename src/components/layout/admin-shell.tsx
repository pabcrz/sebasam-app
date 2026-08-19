"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bolt,
  CircleUserRound,
  ClipboardList,
  FileCheck,
  FileText,
  Home,
  Loader2,
  LogOut,
  UserCog,
  Users,
  Shield,
  Wrench,
  type LucideIcon,
} from "lucide-react";
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

/** All nav items shown in the desktop sidebar. */
const navItems: NavItem[] = [
  { href: "/admin", label: "Inicio", icon: Home },
  { href: "/admin/customers", label: "Clientes", icon: Users },
  { href: "/admin/workers", label: "Trabajadores", icon: UserCog },
  { href: "/admin/quotes", label: "Cotizaciones", icon: FileText },
  { href: "/admin/work-orders", label: "Trabajos", icon: ClipboardList },
  { href: "/admin/operations", label: "Operativos", icon: Wrench },
  { href: "/admin/notas", label: "Notas", icon: FileCheck },
  { href: "/admin/configuracion-pago", label: "Configuración", icon: Bolt },
  { href: "/admin/users", label: "Usuarios", icon: Shield }, // Added for SUPER_ADMIN
];

/** Four main items shown in the mobile bottom nav bar. */
const mobileNavItems: NavItem[] = [
  { href: "/admin", label: "Inicio", icon: Home },
  { href: "/admin/quotes", label: "Cotizaciones", icon: FileText },
  { href: "/admin/work-orders", label: "Trabajos", icon: ClipboardList },
  { href: "/admin/notas", label: "Notas", icon: FileCheck },
];

function NavLink({
  href,
  label,
  icon: Icon,
  mobile = false,
  onNavStart,
}: NavItem & { mobile?: boolean; onNavStart?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const active =
    href === "/admin"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (active || isPending) {
      if (active) e.preventDefault();
      return;
    }
    e.preventDefault();
    onNavStart?.();
    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={
        mobile
          ? `group flex min-h-[var(--tap-min-height)] flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] px-2 py-1.5 text-[0.68rem] font-semibold leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-navy-900)] ${
              active
                ? "bg-white/14 text-white shadow-sm"
                : "text-[var(--color-on-navy-tint)] hover:bg-white/8 hover:text-white"
            } ${isPending ? "opacity-75" : ""}`
          : `flex min-h-[var(--tap-min-height)] items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-[var(--color-blue-tint)] text-[var(--color-nav-active-text)] shadow-sm"
                : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-text-main)]"
            } ${isPending ? "opacity-75" : ""}`
      }
      aria-current={active ? "page" : undefined}
    >
      {isPending ? (
        <Loader2 className={mobile ? "h-5 w-5 animate-spin text-white" : "h-4 w-4 animate-spin text-[var(--color-primary)]"} aria-hidden="true" />
      ) : (
        <Icon className={mobile ? "h-5 w-5" : "h-4 w-4"} aria-hidden="true" />
      )}
      <span>{label}</span>
    </Link>
  );
}

export function AdminShell({ displayName, role, children }: AdminShellProps) {
  const [isGlobalPending, setGlobalPending] = React.useState(false);
  const pathname = usePathname();

  // Reset global pending indicator when pathname changes
  React.useEffect(() => {
    const timer = setTimeout(() => setGlobalPending(false), 0);
    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <div className="flex min-h-dvh bg-[var(--background)] pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0 print:bg-transparent print:pb-0">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-[var(--color-border-light)] bg-[var(--color-surface)] p-4 text-[var(--color-text-main)] md:flex overflow-y-auto print:hidden">
        <div className="border-b border-[var(--color-border-light)] px-3 pb-5">
          <p className="text-xl font-extrabold tracking-[-0.04em]">SEBASAM</p>
          <p className="mt-1 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
            Operaciones
          </p>
        </div>

        <nav aria-label="Navegación principal" className="mt-6 flex flex-1 flex-col gap-1">
          {navItems.filter(item => item.href !== "/admin/users" || role === "SUPER_ADMIN").map((item) => (
            <NavLink key={item.href} {...item} onNavStart={() => setGlobalPending(true)} />
          ))}
        </nav>

        <div className="border-t border-[var(--color-border-light)] px-3 pt-4">
          <p className="truncate text-sm font-semibold">{displayName}</p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">{role}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-[var(--color-border-light)] bg-[var(--color-surface)] text-[var(--color-text-main)] print:hidden">
          {isGlobalPending ? (
            <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--color-primary)] animate-pulse" />
          ) : null}
          <div className="mx-auto flex w-full items-center justify-between px-4 py-3 md:px-6">
            <div className="md:hidden">
              <p className="text-lg font-extrabold tracking-[-0.04em]">SEBASAM</p>
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                Operaciones
              </p>
            </div>
            <div className="flex items-center gap-2">
              <p className="hidden font-mono text-xs uppercase tracking-[0.14em] text-[var(--color-text-muted)] md:block">
                Panel de operaciones
              </p>
              {isGlobalPending ? (
                <span className="flex items-center gap-1 text-xs text-[var(--color-primary)] font-medium">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  Cargando…
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-1">
              <Link
                href="/admin/configuracion-pago"
                className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-text-main)]"
                title="Configuración"
                aria-label="Configuración"
              >
                <Bolt className="h-5 w-5" aria-hidden="true" />
              </Link>

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
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--color-navy-700)] bg-[var(--color-navy-900)] text-white md:hidden print:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto grid max-w-md grid-cols-4 gap-1 px-2 pt-2">
          {mobileNavItems.map((item) => (
            <NavLink key={item.href} {...item} mobile onNavStart={() => setGlobalPending(true)} />
          ))}
        </div>
      </nav>
    </div>
  );
}
