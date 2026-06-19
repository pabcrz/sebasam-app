import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-dvh bg-[var(--color-navy-900)] text-white">
      <section className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col justify-between px-4 py-6 sm:px-10 md:py-8">
        <header className="flex items-center justify-between">
          <span className="rounded-full bg-[var(--color-primary)]/20 px-3 py-1 text-sm font-medium text-[var(--color-on-navy-tint)]">
            Operaciones SEBASAM
          </span>
          <span className="text-sm text-white/60">PWA MVP</span>
        </header>

        <div className="py-12 md:py-16">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-on-navy-tint)]">
            Cotizaciones → Órdenes → Ejecución
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
            Núcleo operativo limpio para el trabajo de campo de SEBASAM.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/80">
            Esta app parte de un límite de dominio estricto: cada orden de trabajo nace de una cotización aprobada, incluyendo las cotizaciones administrativas urgentes.
          </p>
          <div className="mt-8">
            <Link
              href="/admin"
              className="inline-flex min-h-[var(--tap-min-height)] items-center justify-center gap-2 rounded-md bg-[var(--color-primary)] px-6 py-3 text-lg font-medium text-white shadow-sm transition-colors hover:bg-[var(--color-primary-hover)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-focus-ring)]"
            >
              Ir al panel administrativo
            </Link>
          </div>
        </div>

        <footer className="grid gap-3 text-sm text-white/80 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Next.js App Router</div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Prisma sobre Supabase Postgres</div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">PWA instalable en Android Chrome</div>
        </footer>
      </section>
    </main>
  );
}
