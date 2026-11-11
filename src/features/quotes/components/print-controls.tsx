"use client";

import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui";
import { notasHref, parseNotasParams } from "@/features/work-orders/notas-period";

export type ReturnDestination = string;

const LEGACY_RETURN_DESTINATIONS = new Set(["/admin/quotes", "/admin/notas", "/admin/work-orders"]);
const NOTE_RETURN_KEYS = new Set(["mode", "anchor", "payment", "assignee", "page"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isCalendarDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function resolveNotesReturnTo(raw: string): ReturnDestination | null {
  if (raw.includes("#")) return null;

  const [path] = raw.split("?", 1);
  if (path !== "/admin/notas") return null;

  let url: URL;
  try {
    url = new URL(raw, "https://sebasam.invalid");
  } catch {
    return null;
  }

  if (url.origin !== "https://sebasam.invalid" || url.pathname !== "/admin/notas" || !url.search) return null;

  const rawQuery = raw.slice(raw.indexOf("?") + 1);
  if (rawQuery.split("&").some((part) => part === "")) return null;

  const params = url.searchParams;
  if ([...params.keys()].some((key) => !NOTE_RETURN_KEYS.has(key))) return null;
  if (["mode", "anchor", "payment", "assignee"].some((key) => params.getAll(key).length !== 1)) return null;
  if (params.getAll("page").length > 1) return null;

  const mode = params.get("mode");
  const anchor = params.get("anchor");
  const payment = params.get("payment");
  const assignee = params.get("assignee");
  const page = params.get("page");

  if ((mode !== "week" && mode !== "month") || !anchor || !["all", "pending", "paid"].includes(payment ?? "")) return null;
  if (mode === "week" ? !isCalendarDate(anchor) : !/^\d{4}-(0[1-9]|1[0-2])$/.test(anchor)) return null;
  if (assignee !== "all" && assignee !== "workshop" && !UUID_PATTERN.test(assignee ?? "")) return null;
  if (page !== null && (!/^[1-9]\d*$/.test(page) || !Number.isSafeInteger(Number(page)))) return null;

  return notasHref(parseNotasParams(Object.fromEntries(params)));
}

export function resolveReturnTo(raw: string | null): ReturnDestination {
  if (raw && LEGACY_RETURN_DESTINATIONS.has(raw)) return raw;
  if (raw) return resolveNotesReturnTo(raw) ?? "/admin/quotes";
  return "/admin/quotes";
}

export function PrintControls({ backLabel = "Volver" }: { backLabel?: string }) {
  const searchParams = useSearchParams();
  const returnTo = resolveReturnTo(searchParams.get("returnTo"));

  return (
    <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom)+1rem)] left-1/2 z-50 flex w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-surface)] p-1 shadow-lg print:hidden sm:bottom-4 sm:left-auto sm:right-4 sm:translate-x-0">
      <Button asChild type="button" variant="ghost" size="icon" title={backLabel} aria-label={backLabel}>
        <Link href={returnTo}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">{backLabel}</span>
        </Link>
      </Button>
      <Button type="button" variant="primary" size="icon" title="Imprimir / Guardar PDF" aria-label="Imprimir / Guardar PDF" onClick={() => window.print()}>
        <Printer className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Imprimir / Guardar PDF</span>
      </Button>
    </div>
  );
}
