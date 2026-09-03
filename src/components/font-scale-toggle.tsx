"use client";

import { useSyncExternalStore } from "react";
import { ALargeSmall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFontScaleContext } from "./font-scale-provider";

interface FontScaleToggleProps {
  className?: string;
}

function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function FontScaleToggle({ className }: FontScaleToggleProps) {
  const { fontScale, setFontScale } = useFontScaleContext();
  const mounted = useMounted();

  if (!mounted) {
    return (
      <Button
        type="button"
        variant="ghost"
        aria-label="Cambiar tamaño de texto"
        disabled
        className={className}
      >
        <span className="h-5 w-5" />
      </Button>
    );
  }

  const isLarge = fontScale === "large";
  const nextScale = isLarge ? "normal" : "large";
  const label = isLarge
    ? "Restablecer tamaño de texto a normal"
    : "Aumentar tamaño de texto a grande";

  return (
    <Button
      type="button"
      variant="ghost"
      aria-label={label}
      title={label}
      aria-pressed={isLarge}
      onClick={() => setFontScale(nextScale)}
      className={className}
    >
      <ALargeSmall className="h-5 w-5" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </Button>
  );
}
