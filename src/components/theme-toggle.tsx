"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useThemeContext } from "./theme-provider";

interface ThemeToggleProps {
  className?: string;
}

function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { setTheme, resolvedTheme } = useThemeContext();
  const mounted = useMounted();

  if (!mounted) {
    return (
      <Button
        type="button"
        variant="ghost"
        aria-label="Cambiar tema"
        disabled
        className={className}
      >
        <span className="h-5 w-5" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";
  const nextTheme = isDark ? "light" : "dark";
  const label = isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro";

  return (
    <Button
      type="button"
      variant="ghost"
      aria-label={label}
      onClick={() => setTheme(nextTheme)}
      className={className}
    >
      {isDark ? (
        <Sun className="h-5 w-5" aria-hidden="true" />
      ) : (
        <Moon className="h-5 w-5" aria-hidden="true" />
      )}
    </Button>
  );
}
