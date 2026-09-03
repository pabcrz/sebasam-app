"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "sebasam-font-scale";

export type FontScale = "normal" | "large";

type FontScaleContextValue = {
  fontScale: FontScale;
  setFontScale: (scale: FontScale) => void;
};

const FontScaleContext = createContext<FontScaleContextValue | null>(null);

export function useFontScaleContext() {
  const context = useContext(FontScaleContext);
  if (!context) {
    throw new Error("useFontScaleContext must be used within a FontScaleProvider");
  }
  return context;
}

function readStoredFontScale(): FontScale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "large") return "large";
  } catch {
    // localStorage unavailable
  }
  return "normal";
}

export function FontScaleProvider({ children }: { children: React.ReactNode }) {
  const [fontScale, setFontScaleState] = useState<FontScale>(readStoredFontScale);

  const setFontScale = useCallback((next: FontScale) => {
    setFontScaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage unavailable
    }
    if (next === "large") {
      document.documentElement.setAttribute("data-font-scale", "large");
    } else {
      document.documentElement.removeAttribute("data-font-scale");
    }
  }, []);

  useEffect(() => {
    if (fontScale === "large") {
      document.documentElement.setAttribute("data-font-scale", "large");
    } else {
      document.documentElement.removeAttribute("data-font-scale");
    }
  }, [fontScale]);

  return (
    <FontScaleContext.Provider value={{ fontScale, setFontScale }}>
      {children}
    </FontScaleContext.Provider>
  );
}
