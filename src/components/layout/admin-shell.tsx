"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Banknote,
  Bolt,
  CircleUserRound,
  ClipboardList,
  FileCheck,
  FileText,
  History,
  Home,
  Loader2,
  LogOut,
  MessageCircleQuestion,
  MoreHorizontal,
  UserCog,
  Users,
  Shield,
  X,
  type LucideIcon,
} from "lucide-react";
import { logoutAdmin } from "@/features/auth/actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { FontScaleToggle } from "@/components/font-scale-toggle";
import { Button } from "@/components/ui/button";

interface AdminShellProps {
  displayName: string;
  role: string;
  children: React.ReactNode;
}

type NavItem = {
  href: string;
  label: string;
  mobileLabel?: string;
  icon: LucideIcon;
};

/** All nav items shown in the desktop sidebar. */
const navItems: NavItem[] = [
  { href: "/admin", label: "Inicio", icon: Home },
  { href: "/admin/customers", label: "Clientes", icon: Users },
  { href: "/admin/workers", label: "Trabajadores", icon: UserCog },
  { href: "/admin/quotes", label: "Cotizaciones", icon: FileText },
  { href: "/admin/work-orders", label: "Trabajos", icon: ClipboardList },
  { href: "/admin/notas", label: "Notas", icon: FileCheck },
  { href: "/admin/nomina", label: "Nómina", icon: Banknote },
  { href: "/admin/historical", label: "Histórico", icon: History },
  { href: "/asistente", label: "Asistente", icon: MessageCircleQuestion },
  { href: "/admin/configuracion-pago", label: "Configuración", icon: Bolt },
  { href: "/admin/users", label: "Usuarios", icon: Shield }, // Added for SUPER_ADMIN
];

/** Primary operational destinations shown directly in the 5-item mobile bottom nav bar. */
export const primaryMobileNavItems: NavItem[] = [
  { href: "/admin", label: "Inicio", icon: Home },
  { href: "/admin/quotes", label: "Cotizaciones", mobileLabel: "Cotiz.", icon: FileText },
  { href: "/admin/work-orders", label: "Trabajos", icon: ClipboardList },
  { href: "/admin/customers", label: "Clientes", icon: Users },
];

/** Secondary destinations accessible via the 'Más' bottom sheet. */
export const secondaryMobileNavItems: NavItem[] = [
  { href: "/admin/notas", label: "Notas", icon: FileCheck },
  { href: "/admin/nomina", label: "Nómina", icon: Banknote },
  { href: "/admin/historical", label: "Histórico", mobileLabel: "Hist.", icon: History },
  { href: "/asistente", label: "Asistente", mobileLabel: "IA", icon: MessageCircleQuestion },
  { href: "/admin/workers", label: "Trabajadores", icon: UserCog },
  { href: "/admin/configuracion-pago", label: "Configuración", icon: Bolt },
  { href: "/admin/users", label: "Usuarios", icon: Shield },
];

function NavLink({
  href,
  label,
  mobileLabel,
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
      aria-label={mobile ? label : undefined}
      className={
        mobile
          ? `group flex min-h-[var(--tap-min-height)] min-w-0 flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] px-1 py-1.5 text-[0.68rem] font-semibold leading-none transition-all duration-150 active-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-navy-900)] ${
              active
                ? "bg-white/14 text-white shadow-sm"
                : "text-[var(--color-on-navy-tint)] hover:bg-white/8 hover:text-white"
            } ${isPending ? "opacity-75" : ""}`
          : `group flex min-h-[var(--tap-min-height)] items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150 active-press-subtle ${
              active
                ? "bg-[var(--color-blue-tint)] text-[var(--color-nav-active-text)] shadow-sm"
                : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-text-main)]"
            } ${isPending ? "opacity-75" : ""}`
      }
      aria-current={active ? "page" : undefined}
    >
      <Icon
        className={`transition-transform duration-200 ease-out will-change-transform ${
          mobile ? "h-5 w-5" : "h-4 w-4"
        } ${active ? "scale-110" : "group-hover:scale-110 group-active:scale-95"}`}
        aria-hidden="true"
      />
      <span className={mobile ? "whitespace-nowrap" : undefined}>{mobileLabel ?? label}</span>
    </Link>
  );
}

export function getSectionTitle(pathname: string): string {
  if (pathname === "/admin") {
    return "Inicio";
  }
  const matched = navItems
    .filter((item) => item.href !== "/admin")
    .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  return matched?.label ?? "Inicio";
}

export function AdminShell({ displayName, role, children }: AdminShellProps) {
  const [isGlobalPending, setGlobalPending] = React.useState(false);
  const [isMoreOpen, setIsMoreOpen] = React.useState(false);
  const pathname = usePathname();

  // Reset global pending indicator and close more drawer when pathname changes
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setGlobalPending(false);
      setIsMoreOpen(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [pathname]);

  const isSecondaryActive = secondaryMobileNavItems.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  return (
    <div className="flex min-h-dvh bg-[var(--background)] pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0 print:min-h-0 print:bg-transparent print:pb-0">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-[var(--color-border-light)] bg-[var(--color-surface)] p-4 text-[var(--color-text-main)] md:flex overflow-y-auto print:hidden">
        <div className="border-b border-[var(--color-border-light)] px-3 pb-5">
          <Link
            href="/admin"
            className="inline-flex min-h-[var(--tap-min-height)] items-center rounded-md px-2 text-xl font-extrabold tracking-[-0.04em] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-focus-ring)]"
          >
            SEBASAM
          </Link>
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

      <div className="flex min-w-0 flex-1 flex-col print:min-h-0 print:flex-none">
        <header className="sticky top-0 z-40 border-b border-[var(--color-border-light)] bg-[var(--color-surface)] text-[var(--color-text-main)] print:hidden">
          {isGlobalPending ? (
            <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--color-primary)] animate-pulse" />
          ) : null}
          <div className="mx-auto flex w-full items-center justify-between px-4 py-3 md:px-6">
            <div className="md:hidden">
              <Link
                href="/admin"
                className="inline-flex min-h-[var(--tap-min-height)] items-center rounded-md px-2 text-lg font-extrabold tracking-[-0.04em] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-focus-ring)]"
              >
                SEBASAM
              </Link>
            </div>
            <div className="flex items-center gap-2">
              {isGlobalPending ? (
                <span className="flex items-center gap-1 text-xs text-[var(--color-primary)] font-medium">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  Cargando…
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-1">
              <details className="relative">
                <summary className="flex min-h-[var(--tap-min-height)] cursor-pointer list-none items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-[var(--color-bg-soft)] [&::-webkit-details-marker]:hidden">
                  <CircleUserRound className="h-5 w-5" aria-hidden="true" />
                  <span className="hidden text-right sm:flex sm:flex-col">
                    <span className="text-sm font-semibold leading-tight">{displayName}</span>
                    <span className="text-xs text-[var(--color-text-muted)]">{role}</span>
                  </span>
                </summary>
                <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-surface)] p-2 shadow-lg">
                  <div className="border-b border-[var(--color-border-light)] px-3 py-2">
                    <p className="truncate text-sm font-semibold">{displayName}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{role}</p>
                  </div>

                  <div className="py-1">
                    <Link
                      href="/admin/configuracion-pago"
                      className="flex min-h-[var(--tap-min-height)] w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-[var(--color-text-main)] hover:bg-[var(--color-bg-soft)]"
                    >
                      <Bolt className="h-4 w-4 text-[var(--color-text-muted)]" aria-hidden="true" />
                      <span>Configuración</span>
                    </Link>
                  </div>

                  <div className="border-t border-[var(--color-border-light)] px-3 py-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-[var(--color-text-muted)]">Apariencia</span>
                    <div className="flex items-center gap-1">
                      <FontScaleToggle className="text-[var(--color-text-main)] hover:bg-[var(--color-bg-soft)]" />
                      <ThemeToggle className="text-[var(--color-text-main)] hover:bg-[var(--color-bg-soft)]" />
                    </div>
                  </div>

                  <div className="border-t border-[var(--color-border-light)] pt-1">
                    <form action={logoutAdmin}>
                      <Button type="submit" variant="ghost" className="w-full justify-start gap-2 text-[var(--color-status-danger-fg)] hover:bg-[var(--color-status-danger-bg)]">
                        <LogOut className="h-4 w-4" aria-hidden="true" />
                        Salir
                      </Button>
                    </form>
                  </div>
                </div>
              </details>
            </div>
          </div>
        </header>

        <main className="flex-1 print:min-h-0 print:flex-none">{children}</main>
      </div>

      {/* Mobile "Más" drawer backdrop & sheet */}
      {isMoreOpen ? (
        <div className="fixed inset-0 z-40 md:hidden print:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMoreOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menú secundario"
            className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] mx-auto w-full max-w-md rounded-t-2xl border-t border-[var(--color-navy-700)] bg-[var(--color-navy-900)] p-4 text-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--color-navy-700)] pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-on-navy-tint)]">
                Más opciones
              </span>
              <button
                type="button"
                onClick={() => setIsMoreOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-on-navy-tint)] hover:bg-white/10 hover:text-white"
                aria-label="Cerrar menú"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2 pt-3">
              {secondaryMobileNavItems
                .filter((item) => item.href !== "/admin/users" || role === "SUPER_ADMIN")
                .map((item) => (
                  <NavLink
                    key={item.href}
                    {...item}
                    mobile
                    onNavStart={() => {
                      setIsMoreOpen(false);
                      setGlobalPending(true);
                    }}
                  />
                ))}
            </div>
          </div>
        </div>
      ) : null}

      <nav
        aria-label="Navegación móvil"
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--color-navy-700)] bg-[var(--color-navy-900)] text-white md:hidden print:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto grid w-full max-w-md grid-cols-5 gap-1 px-1 pt-2">
          {primaryMobileNavItems.map((item) => (
            <NavLink key={item.href} {...item} mobile onNavStart={() => setGlobalPending(true)} />
          ))}
          <button
            type="button"
            onClick={() => setIsMoreOpen((prev) => !prev)}
            aria-label="Más"
            aria-expanded={isMoreOpen}
            aria-haspopup="dialog"
            aria-current={isSecondaryActive ? "page" : undefined}
            className={`group flex min-h-[var(--tap-min-height)] min-w-0 flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] px-1 py-1.5 text-[0.68rem] font-semibold leading-none transition-all duration-150 active-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-navy-900)] ${
              isSecondaryActive || isMoreOpen
                ? "bg-white/14 text-white shadow-sm"
                : "text-[var(--color-on-navy-tint)] hover:bg-white/8 hover:text-white"
            }`}
          >
            <MoreHorizontal
              className={`h-5 w-5 transition-transform duration-200 ease-out will-change-transform ${
                isSecondaryActive || isMoreOpen ? "scale-110" : "group-hover:scale-110 group-active:scale-95"
              }`}
              aria-hidden="true"
            />
            <span className="whitespace-nowrap">Más</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
