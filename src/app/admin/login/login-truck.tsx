"use client";

import { useSyncExternalStore } from "react";
import { TruckStage } from "@/components/errors/truck-stage";

const DESKTOP_QUERY = "(min-width: 768px)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(DESKTOP_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Left side of the login (the form stays first in the DOM) on desktop only; on phones it is not mounted, so the 3D scene never loads. */
export function LoginTruck() {
  const isDesktop = useSyncExternalStore(subscribe, () => window.matchMedia(DESKTOP_QUERY).matches, () => false);
  return isDesktop ? <TruckStage className="w-full max-w-[420px]" /> : null;
}
