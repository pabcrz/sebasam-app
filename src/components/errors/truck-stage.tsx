"use client";

import dynamic from "next/dynamic";
import { Component, useState, useSyncExternalStore, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getReducedMotion() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

export function TruckFallback() {
  return (
    <svg viewBox="0 0 320 156" aria-hidden="true" className="h-full w-full text-[var(--color-text-main)]">
      <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 142h304" stroke="var(--color-border-light)" />
        <g transform="rotate(-4 236 140)">
          <rect x="44" y="46" width="140" height="66" rx="4" />
          <path d="M190 112V70a4 4 0 0 1 4-4h34l26 24v22" />
          <path d="M204 77h20l13 13h-33z" stroke="var(--color-total-emphasis)" />
          <path d="M44 112h218v8H44z" />
          <circle cx="232" cy="124" r="16" />
          <circle cx="232" cy="124" r="5" stroke="var(--color-total-emphasis)" />
          <circle cx="88" cy="124" r="6" stroke="var(--color-total-emphasis)" />
        </g>
        <circle cx="126" cy="138" r="2" stroke="var(--color-total-emphasis)" />
      </g>
    </svg>
  );
}

const TruckScene = dynamic(() => import("./truck-scene"), { ssr: false });

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? <TruckFallback /> : this.props.children;
  }
}

interface TruckStageProps {
  className?: string;
}

export function TruckStage({ className }: TruckStageProps) {
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => true);
  const [sceneReady, setSceneReady] = useState(false);

  // The scene fades in on its first painted frame; the SVG only shows if WebGL fails.
  return (
    <div
      role="img"
      aria-label="Camión de carga con una llanta trasera salida"
      className={cn("aspect-[16/10] w-full", className)}
    >
      <SceneBoundary>
        <div
          className={cn(
            "h-full w-full transition-opacity duration-300 motion-reduce:transition-none",
            sceneReady ? "opacity-100" : "opacity-0",
          )}
        >
          <TruckScene animate={!reducedMotion} onReady={() => setSceneReady(true)} />
        </div>
      </SceneBoundary>
    </div>
  );
}
