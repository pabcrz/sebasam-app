import type { LucideIcon } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui";

type AdminPageHeaderProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
};

export function AdminPageHeader({
  icon: Icon,
  title,
  description,
}: AdminPageHeaderProps) {
  return (
    <Card className="overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-surface)]">
      <CardHeader className="bg-[var(--color-bg-soft)] px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white shadow-sm">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <CardTitle as="h1">{title}</CardTitle>
            {description ? <p className="mt-1 text-sm text-[var(--color-text-muted)]">{description}</p> : null}
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
