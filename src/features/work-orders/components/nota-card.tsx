"use client";

import type { ReactNode } from "react";
import { OperationalCard } from "@/components/ui";

type NotaCardProps = {
  body: ReactNode;
  actions: ReactNode;
  onOpen: () => void;
  openLabel: string;
  className?: string;
};

export function NotaCard({ body, actions, onOpen, openLabel, className }: NotaCardProps) {
  return (
    <OperationalCard
      body={body}
      actions={actions}
      onOpen={onOpen}
      openLabel={openLabel}
      className={className}
    />
  );
}
