"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { logoutAdmin } from "@/features/auth/actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { FontScaleToggle } from "@/components/font-scale-toggle";
import { Button } from "@/components/ui/button";
import {
  DialogMobileBody,
  DialogMobileClose,
  DialogMobileContent,
  DialogMobileHeader,
  DialogTitle,
  Sheet,
} from "@/components/ui/dialog";
import {
  ADMIN_NAV_ITEMS,
  type AdminNavItem,
  getActiveNavHref,
  getAdminNav,
  readRailExpanded,
  setRailExpanded,
  subscribeRailExpanded,
} from "./admin-nav";
import { AdminFullScreenFlowContext } from "./admin-full-screen-flow";

interface AdminShellProps {
  displayName: string;
  role: string;
  children: React.ReactNode;
}

const railServerSnapshot = () => false;

export function getSectionTitle(pathname: string): string {
  const href = getActiveNavHref(pathname);
  return ADMIN_NAV_ITEMS.find((item) => item.href === href)?.label ?? "Inicio";
}

interface NavLinkProps {
  item: AdminNavItem;
  active: boolean;
  variant: "bar" | "rail" | "sheet";
  expanded?: boolean;
  onNavStart?: () => void;
}

function NavLink({ item, active, variant, expanded = false, onNavStart }: NavLinkProps) {
  const { href, label, icon, description } = item;
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

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

  const pendingClass = isPending ? "opacity-75" : "";
  const current = active ? "page" : undefined;

  if (variant === "bar") {
    return (
      <Link
        href={href}
        onClick={handleClick}
        aria-label={label}
        title={label}
        aria-current={current}
        className={`group flex min-h-[var(--tap-min-height)] min-w-0 flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] py-1 transition-colors duration-150 active-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] ${pendingClass}`}
      >
        <span
          className={`flex h-[34px] w-14 items-center justify-center rounded-[17px] transition-colors duration-150 ${
            active
              ? "bg-[image:var(--gradient-primary)] text-white"
              : "text-[var(--color-text-muted)] group-hover:bg-[var(--color-bg-soft)] group-hover:text-[var(--color-text-main)]"
          }`}
        >
          <Icon name={icon} className="h-[22px] w-[22px]" aria-hidden="true" />
        </span>
      </Link>
    );
  }

  if (variant === "rail") {
    return (
      <Link
        href={href}
        onClick={handleClick}
        title={label}
        aria-current={current}
        className={`flex h-9 w-full items-center gap-3 overflow-hidden whitespace-nowrap rounded-[var(--radius-sm)] pl-[9px] pr-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-focus-ring)] ${
          active
            ? "bg-[image:var(--gradient-primary)] font-semibold text-white"
            : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-text-main)]"
        } ${pendingClass}`}
      >
        <Icon name={icon} className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
        <span className={`transition-opacity duration-150 ${expanded ? "opacity-100" : "opacity-0"}`}>{label}</span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      aria-current={current}
      className={`flex min-h-[var(--tap-min-height)] items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-focus-ring)] ${
        active
          ? "bg-[var(--color-tonal-bg)] font-semibold text-[var(--color-tonal-fg)]"
          : "text-[var(--color-text-main)] hover:bg-[var(--color-bg-soft)]"
      } ${pendingClass}`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center ${
          active ? "text-[var(--color-tonal-fg)]" : "text-[var(--color-text-muted)]"
        }`}
      >
        <Icon name={icon} className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-tight">{label}</span>
        {description ? (
          <span className="block truncate text-xs text-[var(--color-text-muted)]">
            {description}
          </span>
        ) : null}
      </span>
      <Icon
        name="chevron-right"
        className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]"
        aria-hidden="true"
      />
    </Link>
  );
}

export function AdminShell({ displayName, role, children }: AdminShellProps) {
  const [isGlobalPending, setGlobalPending] = React.useState(false);
  const [isMoreOpen, setIsMoreOpen] = React.useState(false);
  // Set by full-screen flows (quote builder): hides the bottom bar, rail and "Más" sheet.
  const [isFullScreenFlowActive, setFullScreenFlowActive] = React.useState(false);
  const isRailExpanded = React.useSyncExternalStore(subscribeRailExpanded, readRailExpanded, railServerSnapshot);
  const profileMenuRef = React.useRef<HTMLDetailsElement>(null);
  const mobileNavRef = React.useRef<HTMLElement>(null);
  const pathname = usePathname();

  React.useEffect(() => {
    const closeProfileMenuOnOutsideClick = (event: MouseEvent) => {
      if (
        profileMenuRef.current?.open &&
        event.target instanceof Node &&
        !profileMenuRef.current.contains(event.target)
      ) {
        profileMenuRef.current.open = false;
      }
    };

    document.addEventListener("click", closeProfileMenuOnOutsideClick);
    return () => document.removeEventListener("click", closeProfileMenuOnOutsideClick);
  }, []);

  // Reset global pending indicator and close more drawer when pathname changes
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setGlobalPending(false);
      setIsMoreOpen(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [pathname]);

  const nav = getAdminNav(role);
  // One current item for the whole shell: the longest matching destination.
  const activeHref = getActiveNavHref(pathname);
  const moreIsCurrent = activeHref !== null && nav.sheet.some((group) => group.items.some((item) => item.href === activeHref));
  const labelVisibility = isRailExpanded ? "opacity-100" : "opacity-0";

  return (
    <AdminFullScreenFlowContext.Provider value={setFullScreenFlowActive}>
    <div className={`flex min-h-dvh bg-[var(--background)] ${isFullScreenFlowActive ? "" : "pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0"} print:min-h-0 print:bg-transparent print:pb-0 print:block print:w-full`}>
      {isFullScreenFlowActive ? null : (
      <aside className="sticky top-0 z-50 hidden h-dvh w-16 shrink-0 md:flex print:hidden">
        {/* Expands over the content: the aside keeps 64px, so the content never moves. */}
        <div
          data-admin-rail
          data-expanded={isRailExpanded ? "true" : "false"}
          className={`absolute inset-y-0 left-0 flex flex-col overflow-x-hidden overflow-y-auto border-r border-[var(--color-border-light)] bg-[var(--color-surface)] px-3.5 py-4 text-[var(--color-text-main)] transition-[width,box-shadow] duration-200 ease-out ${
            isRailExpanded ? "w-[220px] shadow-lg" : "w-16"
          }`}
        >
          <button
            type="button"
            onClick={() => setRailExpanded(!isRailExpanded)}
            aria-expanded={isRailExpanded}
            aria-label={isRailExpanded ? "Contraer menú" : "Expandir menú"}
            title={isRailExpanded ? "Contraer menú" : "Expandir menú"}
            className="mb-2 flex h-10 w-full shrink-0 items-center gap-3 rounded-[var(--radius-sm)] pl-0.5 text-left hover:bg-[var(--color-bg-soft)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-focus-ring)]"
          >
            <Image
              src="/logo-white-short.png"
              alt=""
              aria-hidden="true"
              width={32}
              height={32}
              unoptimized
              className="h-8 w-8 shrink-0 object-contain [filter:brightness(0)] [.dark_&]:[filter:none]"
            />
            <span
              className={`whitespace-nowrap text-base font-extrabold tracking-[-0.03em] transition-opacity duration-150 ${labelVisibility}`}
            >
              SEBASAM
            </span>
            <Icon
              name="chevron-left"
              className={`ml-auto mr-1 h-4 w-4 shrink-0 text-[var(--color-text-muted)] transition-opacity duration-150 ${labelVisibility}`}
              aria-hidden="true"
            />
          </button>

          <nav aria-label="Navegación principal" className="mt-2 flex flex-col gap-1">
            {nav.desktop.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={item.href === activeHref}
                variant="rail"
                expanded={isRailExpanded}
                onNavStart={() => setGlobalPending(true)}
              />
            ))}
          </nav>

          <div className="mt-auto border-t border-[var(--color-border-light)] pt-3">
            <p className={`truncate text-sm font-semibold transition-opacity duration-150 ${labelVisibility}`}>
              {displayName}
            </p>
            <p className={`mt-1 truncate text-xs text-[var(--color-text-muted)] transition-opacity duration-150 ${labelVisibility}`}>
              {role}
            </p>
          </div>
        </div>
      </aside>
      )}

      <div className="flex min-w-0 flex-1 flex-col print:min-h-0 print:block print:w-full">
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
                  <Icon name="loader" className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  Cargando…
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-1">
              <details ref={profileMenuRef} className="relative">
                <summary className="flex min-h-[var(--tap-min-height)] cursor-pointer list-none items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-[var(--color-bg-soft)] [&::-webkit-details-marker]:hidden">
                  <Icon name="user" className="h-5 w-5" aria-hidden="true" />
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
                      <Icon name="settings" className="h-4 w-4 text-[var(--color-text-muted)]" aria-hidden="true" />
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
                        <Icon name="logout" className="h-4 w-4" aria-hidden="true" />
                        Salir
                      </Button>
                    </form>
                  </div>
                </div>
              </details>
            </div>
          </div>
        </header>

        <main className="flex-1 print:min-h-0 print:block print:w-full">{children}</main>
      </div>

      {/* "Más" sheet. Non-modal so the bar stays tappable: its "Más"/"Cerrar" button closes it. */}
      <Sheet open={isMoreOpen} onOpenChange={setIsMoreOpen} modal={false}>
        <DialogMobileContent
          variant="sheet"
          aria-describedby={undefined}
          className="bottom-[calc(4rem+env(safe-area-inset-bottom))] md:hidden"
          onInteractOutside={(event) => {
            if (event.target instanceof Node && mobileNavRef.current?.contains(event.target)) {
              event.preventDefault();
            }
          }}
        >
          <DialogMobileHeader>
            <DialogTitle>Más</DialogTitle>
            <DialogMobileClose aria-label="Cerrar menú" />
          </DialogMobileHeader>
          <DialogMobileBody className="grid gap-4">
            {nav.sheet.map((group) => (
              <div
                key={group.id}
                role="group"
                aria-labelledby={`admin-nav-group-${group.id}`}
                className="grid gap-1.5"
              >
                <h3
                  id={`admin-nav-group-${group.id}`}
                  className="px-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]"
                >
                  {group.title}
                </h3>
                <div className="grid gap-0.5">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.href}
                      item={item}
                      active={item.href === activeHref}
                      variant="sheet"
                      onNavStart={() => {
                        setIsMoreOpen(false);
                        setGlobalPending(true);
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </DialogMobileBody>
        </DialogMobileContent>
      </Sheet>

      {/* Hidden, not unmounted: removing the bar while a Radix layer is open dismisses the flow. */}
      <nav
        ref={mobileNavRef}
        hidden={isFullScreenFlowActive}
        aria-label="Navegación móvil"
        className="fixed bottom-0 left-0 right-[var(--removed-body-scroll-bar-size,0px)] z-[60] border-t border-[var(--color-border-light)] bg-[var(--color-surface)] text-[var(--color-text-main)] md:hidden print:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto grid w-full max-w-md grid-cols-5 gap-1 px-1 pt-1">
          {nav.bar.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={item.href === activeHref}
              variant="bar"
              onNavStart={() => setGlobalPending(true)}
            />
          ))}
          <button
            type="button"
            onClick={() => setIsMoreOpen((prev) => !prev)}
            aria-label={isMoreOpen ? "Cerrar" : "Más"}
            title={isMoreOpen ? "Cerrar" : "Más"}
            aria-expanded={isMoreOpen}
            aria-haspopup="dialog"
            aria-current={moreIsCurrent && !isMoreOpen ? "page" : undefined}
            className="group flex min-h-[var(--tap-min-height)] min-w-0 flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] py-1 transition-colors duration-150 active-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
          >
            <span
              className={`flex h-[34px] w-14 items-center justify-center rounded-[17px] transition-colors duration-150 ${
                moreIsCurrent && !isMoreOpen
                  ? "bg-[image:var(--gradient-primary)] text-white"
                  : "text-[var(--color-text-muted)] group-hover:bg-[var(--color-bg-soft)] group-hover:text-[var(--color-text-main)]"
              }`}
            >
              <Icon name={isMoreOpen ? "close" : "more"} className="h-[22px] w-[22px]" aria-hidden="true" />
            </span>
          </button>
        </div>
      </nav>
    </div>
    </AdminFullScreenFlowContext.Provider>
  );
}
