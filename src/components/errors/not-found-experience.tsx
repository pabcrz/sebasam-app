import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface NotFoundExperienceProps {
  message: string;
  title?: string;
}

export function NotFoundExperience({
  message,
  title = "A esta página se le zafó un tornillo",
}: NotFoundExperienceProps) {
  return (
    <main className="flex min-h-dvh w-full items-center justify-center bg-[var(--color-bg-soft)] pl-[max(var(--space-md),env(safe-area-inset-left))] pr-[max(var(--space-md),env(safe-area-inset-right))] pt-[max(var(--space-xl),env(safe-area-inset-top))] pb-[max(var(--space-xl),env(safe-area-inset-bottom))]">
      <Card flush className="w-full max-w-[420px] overflow-hidden text-center shadow-[var(--shadow-card)]">
        <header className="bg-[image:var(--gradient-primary)] px-[var(--space-xl)] py-[var(--space-md)] text-left">
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
        <CardContent className="flex flex-col items-center gap-[var(--space-md)] p-[var(--space-xl)]">
          <svg
            aria-label="Engranaje con un tornillo suelto"
            className="h-28 w-28 text-[var(--color-primary)]"
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
          <Button asChild className="w-full shadow-none">
            <a href="https://sebasam.online" rel="noreferrer" target="_blank">
              Visita SEBASAM
            </a>
          </Button>
        </CardContent>
      </Card>
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
