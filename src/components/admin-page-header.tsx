import type { LucideIcon } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui";

type AdminPageHeaderProps = {
  icon: LucideIcon;
  title: string;
};

export function AdminPageHeader({
  icon: Icon,
  title,
}: AdminPageHeaderProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-blue-tint)] text-[var(--color-primary)]">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <CardTitle as="h1">{title}</CardTitle>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
