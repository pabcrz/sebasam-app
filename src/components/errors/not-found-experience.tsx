import Image from "next/image";
import { Button } from "@/components/ui/button";
import { BackButton } from "./back-button";
import { TruckStage } from "./truck-stage";

interface NotFoundExperienceProps {
  message: string;
  title?: string;
}

function LooseTire() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className="h-[0.8em] w-[0.8em] shrink-0">
      <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="15" />
      <circle cx="50" cy="50" r="20" fill="none" stroke="var(--color-total-emphasis)" strokeWidth="4" />
      <path
        d="M50 30v40M30 50h40"
        stroke="var(--color-total-emphasis)"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function NotFoundExperience({
  message,
  title = "A esta página se le salió una llanta",
}: NotFoundExperienceProps) {
  return (
    <main className="flex min-h-dvh w-full justify-center bg-[var(--color-bg-soft)] pb-[max(var(--space-lg),env(safe-area-inset-bottom))] pl-[max(var(--space-md),env(safe-area-inset-left))] pr-[max(var(--space-md),env(safe-area-inset-right))] pt-[max(var(--space-md),env(safe-area-inset-top))]">
      <div className="flex w-full max-w-[960px] flex-col gap-[var(--space-md)] md:gap-[var(--space-lg)]">
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
        <div className="flex flex-1 flex-col justify-center gap-[var(--space-lg)] md:grid md:grid-cols-2 md:items-center md:gap-[var(--space-2xl)]">
          <div className="flex flex-col items-center gap-[var(--space-sm)] md:order-2">
            <TruckStage className="max-w-[420px] md:max-w-none" />
            <p
              aria-label="404"
              className="flex items-center gap-[0.04em] text-[clamp(4rem,16vw,6rem)] font-extrabold leading-none tracking-[-0.04em] text-[var(--color-text-main)] tabular-nums"
            >
              4<LooseTire />4
            </p>
          </div>
          <div className="flex flex-col items-center gap-[var(--space-md)] text-center md:order-1 md:items-start md:text-left">
            <h1 className="text-balance text-2xl font-bold leading-tight text-[var(--color-text-main)] md:text-4xl">
              {title}
            </h1>
            <p className="max-w-[32ch] text-[var(--color-text-muted)]">{message}</p>
            <div className="flex w-full flex-col gap-[var(--space-sm)] sm:w-auto sm:flex-row">
              <Button asChild className="shadow-none">
                <a href="https://sebasam.online/info" rel="noreferrer" target="_blank">
                  Ver información y contacto
                </a>
              </Button>
              <BackButton />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
