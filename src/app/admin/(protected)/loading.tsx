export default function Loading() {
  return (
    <section
      aria-label="Cargando contenido..."
      className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-6 md:gap-6 md:px-6 md:py-10"
    >
      <div className="space-y-2">
        <div className="h-7 w-44 rounded-md bg-[var(--color-bg-soft)] animate-pulse" />
        <div className="h-4 w-72 rounded-md bg-[var(--color-bg-soft)] animate-pulse" />
      </div>

      <div className="h-14 w-full rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] animate-pulse" />

      <div className="grid gap-3">
        <div className="h-24 w-full rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] animate-pulse" />
        <div className="h-24 w-full rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] animate-pulse" />
        <div className="h-24 w-full rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] animate-pulse" />
      </div>
    </section>
  );
}
