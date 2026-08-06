import type { Metadata } from "next";
import Link from "next/link";
import { Users, FileText, LayoutDashboard, UserCog } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Panel",
};

const modules = [
  {
    href: "/admin/customers",
    title: "Clientes",
    description: "Alta, búsqueda y edición de clientes.",
    icon: Users,
  },
  {
    href: "/admin/quotes",
    title: "Cotizaciones",
    description: "Crear borradores y aprobar cotizaciones.",
    icon: FileText,
  },
  {
    href: "/admin/workers",
    title: "Trabajadores",
    description: "Gestionar maestros y ayudantes operativos.",
    icon: UserCog,
  },
];

export default function AdminHomePage() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-10">
      <div className="mb-6 flex items-center gap-3 md:mb-8">
        <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white">
          <LayoutDashboard className="h-6 w-6" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-main)] md:text-3xl">
            Panel de operaciones
          </h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Administra clientes, trabajadores y cotizaciones desde cualquier dispositivo.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((module) => (
          <Link
            key={module.href}
            href={module.href}
            className="group rounded-[var(--radius-md)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-focus-ring)]"
          >
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-blue-tint)] text-[var(--color-primary)]">
                    <module.icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <CardTitle as="h2">{module.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[var(--color-text-muted)]">{module.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
