import Link from "next/link";
import { Icon, PageHeader } from "@/components/ui";

/** Frame for one configuration setting: back link to the index, then its own title and content. */
export function SettingsScreen({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      data-layout-width="readable"
      className="mx-auto grid w-full max-w-2xl gap-4 px-4 py-6 md:gap-6 md:px-6 md:py-10"
    >
      <Link
        href="/admin/configuracion-pago"
        className="inline-flex min-h-[var(--tap-min-height)] w-fit items-center gap-1 rounded-[var(--radius-sm)] text-sm font-medium text-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-focus-ring)]"
      >
        <Icon name="chevron-left" className="h-4 w-4" aria-hidden="true" />
        Configuración
      </Link>
      <PageHeader title={title} />
      {children}
    </section>
  );
}
