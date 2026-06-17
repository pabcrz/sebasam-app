export default function Home() {
  return (
    <main className="min-h-dvh bg-slate-950 text-white">
      <section className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col justify-between px-6 py-8 sm:px-10">
        <header className="flex items-center justify-between">
          <span className="rounded-full bg-teal-400/10 px-3 py-1 text-sm font-medium text-teal-200">
            SEBASAM Operations
          </span>
          <span className="text-sm text-slate-400">PWA MVP foundation</span>
        </header>

        <div className="py-16">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-teal-300">
            Quotes → Work Orders → Execution
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
            Clean operational core for SEBASAM field work.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            This app starts from a strict domain boundary: every work order is born from an approved quote, including urgent administrative quotes.
          </p>
        </div>

        <footer className="grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Next.js App Router</div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Prisma over Supabase Postgres</div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Android Chrome installable PWA</div>
        </footer>
      </section>
    </main>
  );
}
