"use client";

import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

const subscribe = () => () => {};
const hasHistory = () => window.history.length > 1;

export function BackButton() {
  const visible = useSyncExternalStore(subscribe, hasHistory, () => false);

  if (!visible) return null;

  return (
    <Button variant="secondary" onClick={() => window.history.back()}>
      Regresar
    </Button>
  );
}
