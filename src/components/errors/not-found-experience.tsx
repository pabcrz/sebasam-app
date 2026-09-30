import Image from "next/image";
import { Button } from "@/components/ui/button";

interface NotFoundExperienceProps {
  message: string;
  title?: string;
}

export function NotFoundExperience({
  message,
  title = "A esta página se le zafó un tornillo",
}: NotFoundExperienceProps) {
  return (
    <main className="flex min-h-dvh w-full flex-col items-center bg-[var(--color-bg-soft)] px-0 pt-0 md:justify-center md:pb-[max(var(--space-xl),env(safe-area-inset-bottom))] md:pl-[max(var(--space-md),env(safe-area-inset-left))] md:pr-[max(var(--space-md),env(safe-area-inset-right))] md:pt-[max(var(--space-xl),env(safe-area-inset-top))]">
      <div className="flex w-full max-w-none flex-1 flex-col overflow-hidden text-center md:max-w-[420px] md:flex-initial md:rounded-[var(--radius-md)] md:border md:border-[var(--color-border-subtle)] md:bg-[var(--color-surface)] md:shadow-[var(--shadow-card)]">
        <header className="shrink-0 bg-[image:var(--gradient-primary)] pb-[var(--space-md)] pl-[max(var(--space-md),env(safe-area-inset-left))] pr-[max(var(--space-md),env(safe-area-inset-right))] pt-[max(var(--space-md),env(safe-area-inset-top))] text-left md:px-[var(--space-xl)] md:py-[var(--space-md)]">
          <div className="flex items-center gap-3">
            <Image
              src="/logo-white-short.png"
              alt="Logo de SEBASAM"
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 object-contain"
            />
            <div className="min-w-0">
              <h2 className="font-mono text-xl font-extrabold leading-none tracking-[-0.05em] text-white">
                SEBASAM
              </h2>
              <p className="mt-2 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--color-on-navy-tint)]">
                Servicio y Refacciones para Suspensiones de Aire y Muelles
              </p>
            </div>
          </div>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-[var(--space-sm)] pl-[max(var(--space-md),env(safe-area-inset-left))] pr-[max(var(--space-md),env(safe-area-inset-right))] pt-[var(--space-md)] md:gap-[var(--space-md)] md:px-[var(--space-xl)] md:pt-[var(--space-xl)]">
          <svg
            aria-label="Engranaje con un tornillo suelto"
            className="h-24 w-24 text-[var(--color-primary)] md:h-28 md:w-28"
            fill="none"
            role="img"
            viewBox="0 0 112 112"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M47 9h18l3 10a31 31 0 0 1 7 3l9-5 13 13-5 9a31 31 0 0 1 3 7l10 3v18l-10 3a31 31 0 0 1-3 7l5 9-13 13-9-5a31 31 0 0 1-7 3l-3 10H47l-3-10a31 31 0 0 1-7-3l-9 5-13-13 5-9a31 31 0 0 1-3-7l-10-3V47l10-3a31 31 0 0 1 3-7l-5-9 13-13 9 5a31 31 0 0 1 7-3l3-10Z"
              fill="currentColor"
              transform="translate(-3 -3) scale(.91)"
            />
            <circle cx="56" cy="56" r="17" fill="var(--color-surface)" />
            <g className="loose-fastener" fill="var(--color-text-main)">
              <path d="m83 83 5-5 10 10-5 5z" />
              <circle cx="99" cy="96" r="5" />
              <path d="m96 96 6-2" stroke="var(--color-surface)" strokeWidth="2" />
            </g>
          </svg>
          <p
            aria-label="404"
            className="text-[clamp(4.5rem,18vw,6.5rem)] font-extrabold leading-none tracking-tight text-[var(--color-text-main)]"
          >
            4<span className="text-[var(--color-primary)]">0</span>4
          </p>
          <h1 className="text-2xl font-bold leading-tight text-[var(--color-text-main)]">{title}</h1>
          <p className="text-[var(--color-text-muted)]">{message}</p>
        </div>
        <footer className="mt-auto w-full pl-[max(var(--space-md),env(safe-area-inset-left))] pr-[max(var(--space-md),env(safe-area-inset-right))] pb-[max(24px,env(safe-area-inset-bottom))] pt-[var(--space-md)] md:px-[var(--space-xl)] md:pb-[var(--space-xl)]">
          <Button asChild className="w-full shadow-none">
            <a href="https://sebasam.online" rel="noreferrer" target="_blank">
              Visita SEBASAM
            </a>
          </Button>
        </footer>
      </div>
      <style>{`
        @keyframes loose-fastener-drop {
          0%, 15% { transform: translate(0, 0) rotate(0); }
          55% { transform: translate(2px, 9px) rotate(35deg); }
          70%, 100% { transform: translate(0, 0) rotate(0); }
        }
        .loose-fastener { transform-origin: 94px 89px; animation: loose-fastener-drop 2.8s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .loose-fastener { animation: none; } }
      `}</style>
    </main>
  );
}
