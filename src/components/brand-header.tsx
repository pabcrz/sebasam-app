import Image from "next/image";

/** Logo, name and tagline shown at the top of the public pages (login, 404). */
export function BrandHeader() {
  return (
    <header className="flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-primary)]">
        <Image
          src="/logo-white-short.png"
          alt="Logo de SEBASAM"
          width={28}
          height={28}
          className="h-7 w-7 object-contain"
        />
      </span>
      <div className="min-w-0">
        <p className="text-lg font-extrabold leading-none tracking-tight text-[var(--color-text-main)]">SEBASAM</p>
        <p className="mt-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--color-text-muted-fg)]">
          Servicio y Refacciones para Suspensiones de Aire y Muelles
        </p>
      </div>
    </header>
  );
}
