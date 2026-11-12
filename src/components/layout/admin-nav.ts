import type { IconName } from "@/components/ui/icon";

export type AdminNavGroupId = "operacion" | "herramientas" | "administracion";

export interface AdminNavItem {
  href: string;
  label: string;
  icon: IconName;
  /** Destination shown directly in the mobile bar. */
  primary?: boolean;
  /** Section of the "Más" sheet this destination belongs to. */
  group?: AdminNavGroupId;
  /** Secondary line in the "Más" sheet. */
  description?: string;
  /** Shown to ADMIN (patron). Other roles see it unless `superAdminOnly`. */
  patron?: boolean;
  /** Shown only to SUPER_ADMIN. */
  superAdminOnly?: boolean;
}

export interface AdminNavGroup {
  id: AdminNavGroupId;
  title: string;
}

export interface AdminNavSheetGroup extends AdminNavGroup {
  items: AdminNavItem[];
}

export const ADMIN_NAV_GROUPS: readonly AdminNavGroup[] = [
  { id: "operacion", title: "Operación" },
  { id: "herramientas", title: "Herramientas" },
  { id: "administracion", title: "Administración" },
];

/**
 * Single source for the mobile bar, the "Más" sheet and the desktop rail.
 * Order here is the desktop order. Routes must match the app routes exactly.
 */
export const ADMIN_NAV_ITEMS: readonly AdminNavItem[] = [
  { href: "/admin", label: "Inicio", icon: "home", primary: true, patron: true },
  { href: "/admin/quotes", label: "Cotizaciones", icon: "quotes", primary: true, patron: true },
  { href: "/admin/work-orders", label: "Trabajos", icon: "jobs", primary: true, patron: true },
  { href: "/admin/notas", label: "Notas", icon: "notes", primary: true, patron: true },
  {
    href: "/admin/customers",
    label: "Clientes",
    icon: "users",
    group: "operacion",
    description: "Fichas, vehículos y saldos",
    patron: true,
  },
  {
    href: "/admin/workers",
    label: "Trabajadores",
    icon: "workers",
    group: "operacion",
    description: "Maestros y asignaciones",
  },
  { href: "/admin/nomina", label: "Nómina", icon: "cash", group: "operacion", patron: true },
  {
    href: "/admin/historical",
    label: "Carga de histórico",
    icon: "history",
    group: "herramientas",
    description: "Importar trabajos de la libreta",
  },
  {
    href: "/asistente",
    label: "Asistente",
    icon: "assistant",
    group: "herramientas",
    description: "Consultas rápidas",
  },
  {
    href: "/admin/configuracion-pago",
    label: "Configuración",
    icon: "settings",
    group: "administracion",
    description: "Taller, cobro y apariencia",
  },
  {
    href: "/admin/users",
    label: "Usuarios",
    icon: "shield",
    group: "administracion",
    description: "Accesos y permisos",
    superAdminOnly: true,
  },
];

// ADMIN keeps the patron subset. SUPER_ADMIN sees everything. Other roles keep
// the previous behaviour: everything except the users destination.
function isVisibleTo(item: AdminNavItem, role: string): boolean {
  if (role === "ADMIN") return item.patron === true;
  if (role === "SUPER_ADMIN") return true;
  return item.superAdminOnly !== true;
}

export function getAdminNav(role: string): {
  bar: AdminNavItem[];
  sheet: AdminNavSheetGroup[];
  desktop: AdminNavItem[];
} {
  const visible = ADMIN_NAV_ITEMS.filter((item) => isVisibleTo(item, role));

  return {
    bar: visible.filter((item) => item.primary),
    sheet: ADMIN_NAV_GROUPS.map((group) => ({
      ...group,
      items: visible.filter((item) => item.group === group.id),
    })).filter((group) => group.items.length > 0),
    desktop: visible,
  };
}

/**
 * The one destination that is current for a pathname, so only one item can be
 * active. The longest matching href wins for nested routes.
 */
export function getActiveNavHref(pathname: string): string | null {
  let best: string | null = null;
  for (const item of ADMIN_NAV_ITEMS) {
    const matches =
      item.href === "/admin"
        ? pathname === item.href
        : pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (matches && (best === null || item.href.length > best.length)) {
      best = item.href;
    }
  }
  return best;
}

export const RAIL_EXPANDED_STORAGE_KEY = "sebasam.admin-nav.rail-expanded";

export function readRailExpanded(): boolean {
  try {
    return window.localStorage.getItem(RAIL_EXPANDED_STORAGE_KEY) === "1";
  } catch {
    // Storage can be blocked (private mode); the rail then stays collapsed.
    return false;
  }
}

export function writeRailExpanded(expanded: boolean): void {
  try {
    window.localStorage.setItem(RAIL_EXPANDED_STORAGE_KEY, expanded ? "1" : "0");
  } catch {
    // The preference is best effort; the toggle still works for this visit.
  }
}

const railListeners = new Set<() => void>();

/** For `useSyncExternalStore`: notifies on this tab's toggles and on other tabs' writes. */
export function subscribeRailExpanded(listener: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === RAIL_EXPANDED_STORAGE_KEY) listener();
  };
  railListeners.add(listener);
  window.addEventListener("storage", onStorage);
  return () => {
    railListeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function setRailExpanded(expanded: boolean): void {
  writeRailExpanded(expanded);
  railListeners.forEach((listener) => listener());
}
