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
            aria-label="Tornillo de cabeza hexagonal"
            className="h-24 w-24 text-[var(--color-primary)] md:h-28 md:w-28"
            role="img"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g className="bolt-illustration">
              <polygon
                className="bolt-head"
                points="12,2.5 16.5,5 16.5,10 12,12.5 7.5,10 7.5,5"
                fill="var(--color-primary)"
              />
              <path
                className="bolt-shaft"
                d="M10 12h4v2h1.5v1.5H14V17h1.5v1.5H14V21h-4v-2.5H8.5V17H10v-1.5H8.5V14H10z"
                fill="var(--color-navy-700)"
              />
            </g>
            <path
              className="motion-line motion-line-one"
              d="M3 5.5c.7-1.1 1.7-1.8 2.8-2.2"
              fill="none"
              stroke="var(--color-text-muted)"
              strokeLinecap="round"
              strokeWidth="1.2"
            />
            <path
              className="motion-line motion-line-two"
              d="M2.5 9c.8-.8 1.6-1.2 2.5-1.4"
              fill="none"
              stroke="var(--color-text-muted)"
              strokeLinecap="round"
              strokeWidth="1.2"
            />
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
        @keyframes bolt-drop {
          0%, 100% { transform: translateY(0) rotate(-6deg); }
          50% { transform: translateY(4px) rotate(6deg); }
        }
        .bolt-illustration { transform-origin: 12px 12px; animation: bolt-drop 2.2s cubic-bezier(0.45, 0, 0.55, 1) infinite; }
        @media (prefers-reduced-motion: reduce) { .bolt-illustration { animation: none; } }
      `}</style>
    </main>
  );
}
