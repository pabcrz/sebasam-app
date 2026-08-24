import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";

type AdminPageHeaderProps = {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children?: ReactNode;
};

export function AdminPageHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
  actions,
  children,
}: AdminPageHeaderProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-blue-tint)] text-[var(--color-primary)]">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <CardDescription>{eyebrow}</CardDescription>
            <CardTitle as="h1">{title}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="max-w-2xl text-sm leading-6 text-[var(--color-text-muted)] md:text-base md:leading-7">
          {description}
        </p>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
        {children}
      </CardContent>
    </Card>
  );
}
