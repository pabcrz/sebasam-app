import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui";

type AdminPageHeaderProps = {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  variant?: "compact" | "expanded";
};

export function AdminPageHeader({
  icon: Icon,
  title,
  description,
  actions,
  children,
  variant = "compact",
}: AdminPageHeaderProps) {
  return (
    <Card data-testid="admin-page-header" data-variant={variant} className={variant === "expanded" ? "p-6" : "p-4"}>
      <CardHeader className={variant === "expanded" ? "space-y-4" : undefined}>
        <div className={variant === "expanded" ? "flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between" : "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"}>
          <div className={variant === "expanded" ? "flex min-w-0 items-start gap-4" : "flex min-w-0 items-center gap-3"}>
          <div className={variant === "expanded" ? "flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-blue-tint)] text-[var(--color-primary)]" : "flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-blue-tint)] text-[var(--color-primary)]"}>
            <Icon className={variant === "expanded" ? "h-6 w-6" : "h-5 w-5"} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <CardTitle as="h1" className={variant === "expanded" ? "text-xl" : "text-lg"}>{title}</CardTitle>
            {description ? <p className="mt-1 text-sm text-[var(--color-text-muted)]">{description}</p> : null}
          </div>
          </div>
          {actions ? <div data-testid="admin-page-header-actions" className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
        {children ? <div className="border-t border-[var(--color-border-light)] pt-4">{children}</div> : null}
      </CardHeader>
    </Card>
  );
}
