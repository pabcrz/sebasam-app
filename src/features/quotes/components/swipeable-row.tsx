"use client";

import React, { useCallback, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { useIsMobile } from "./use-is-mobile";

interface SwipeableRowProps {
  children: React.ReactNode;
  onConfirmDelete: () => void;
  "aria-label"?: string;
  /** Disables the swipe interaction while keeping the row mounted (e.g. when the concept is expanded). */
  disabled?: boolean;
}

const SWIPE_THRESHOLD_RATIO = 0.2;
const REVEAL_WIDTH_PX = 120;

export function SwipeableRow({
  children,
  onConfirmDelete,
  disabled = false,
  "aria-label": ariaLabel,
}: SwipeableRowProps) {
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLDivElement>(null);
  const [translateX, setTranslateX] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);

  const translateRef = useRef(0);
  const revealedRef = useRef(false);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const swipeAxisLockedRef = useRef<"horizontal" | "vertical" | null>(null);
  const startTranslateRef = useRef(0);

  const applyOffset = useCallback((next: number) => {
    translateRef.current = next;
    setTranslateX(next);
  }, []);

  const setRevealed = useCallback((revealed: boolean) => {
    revealedRef.current = revealed;
    setIsRevealed(revealed);
    applyOffset(revealed ? REVEAL_WIDTH_PX : 0);
  }, [applyOffset]);

  // When the row is not swipeable (desktop or expanded), the swipe card is not
  // rendered at all, so any previous reveal state is simply never shown. We do
  // not mutate state here; the revealed card only appears after an explicit
  // gesture while the row is active.

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      swipeAxisLockedRef.current = null;
      startTranslateRef.current = revealedRef.current ? REVEAL_WIDTH_PX : 0;
    },
    [disabled],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;

      if (!swipeAxisLockedRef.current) {
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);
        if (absDeltaX < 5 && absDeltaY < 5) return;
        swipeAxisLockedRef.current = absDeltaX > absDeltaY ? "horizontal" : "vertical";
      }

      if (swipeAxisLockedRef.current === "vertical") return;

      // Once the axis is locked to horizontal, stop native vertical scrolling so the
      // card follows the finger and the underlying delete action is reachable.
      e.preventDefault();

      const newTranslate = Math.max(0, startTranslateRef.current + deltaX);
      applyOffset(newTranslate);
    },
    [disabled, applyOffset],
  );

  const handleTouchEnd = useCallback(() => {
    swipeAxisLockedRef.current = null;
    const container = containerRef.current;
    if (!container) return;

    const threshold = container.offsetWidth * SWIPE_THRESHOLD_RATIO;
    const isBeyondThreshold = translateRef.current >= threshold;
    setRevealed(isBeyondThreshold);
  }, [setRevealed]);

  const handleDeleteTap = useCallback(() => {
    onConfirmDelete();
    revealedRef.current = false;
    applyOffset(0);
    setIsRevealed(false);
  }, [onConfirmDelete, applyOffset]);

  const handleContainerBlur = useCallback(() => {
    if (revealedRef.current) {
      revealedRef.current = false;
      applyOffset(0);
      setIsRevealed(false);
    }
  }, [applyOffset]);

  if (!isMobile || disabled) {
    return <>{children}</>;
  }

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-[var(--radius-md)]" onBlur={handleContainerBlur}>
      {/* Delete zone behind the card */}
      <div className="absolute inset-0 flex items-center justify-start bg-[var(--color-status-danger-bg)]">
        <button
          type="button"
          aria-label={ariaLabel || "Eliminar concepto"}
          onClick={handleDeleteTap}
          className="group flex h-full min-h-[44px] w-[120px] items-center justify-center gap-2 px-3 text-[var(--color-status-danger-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
        >
          <Icon name="trash" className="size-5 shrink-0 icon-trash-hover" aria-hidden="true" />
          <span className="text-sm font-medium">Eliminar</span>
        </button>
      </div>

      {/* Swipeable card */}
      <div
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isRevealed || translateX === 0 ? "transform 200ms cubic-bezier(0.25, 1, 0.5, 1)" : "none",
          willChange: "transform",
          position: "relative",
          zIndex: 1,
          backgroundColor: "var(--color-surface)",
          touchAction: "pan-y",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
