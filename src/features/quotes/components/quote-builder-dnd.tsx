"use client";

import React, { createContext, useContext } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Icon } from "@/components/ui/icon";

type SortableContextType = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  attributes: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listeners: Record<string, any> | undefined;
  setActivatorNodeRef: (node: HTMLElement | null) => void;
};

const SortableItemContext = createContext<SortableContextType | null>(null);

export function DragHandle({
  ariaLabel,
  className,
  focusable = true,
}: {
  ariaLabel?: string;
  className?: string;
  /** The table layout keeps the handle out of Tab order so Tab moves between fields only. */
  focusable?: boolean;
}) {
  const ctx = useContext(SortableItemContext);
  if (!ctx) return <Icon name="grip-vertical" className={`size-4 shrink-0 text-[var(--color-text-muted)] ${className || ""}`} aria-hidden="true" />;
  
  const { setActivatorNodeRef, attributes, listeners } = ctx;
  return (
    <div
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      tabIndex={focusable ? attributes.tabIndex : -1}
      aria-label={ariaLabel}
      className={`flex items-center justify-center touch-none cursor-grab text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] ${className || ""}`}
    >
      <Icon name="grip-vertical" className="size-4 shrink-0" aria-hidden="true" />
    </div>
  );
}

/** Concept rows render as `tr` inside the table layout; everything else is a `div`. */
export function SortableItem({
  id,
  children,
  as = "div",
  className,
  rowRef,
  "data-testid": testId,
}: {
  id: string;
  children: React.ReactNode;
  as?: "div" | "tr";
  className?: string;
  rowRef?: (node: HTMLElement | null) => void;
  "data-testid"?: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, data: { type: "Item" } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 1 : 0,
    position: "relative" as const,
  };
  const ref = (node: HTMLElement | null) => {
    setNodeRef(node);
    rowRef?.(node);
  };
  const dragging = isDragging ? "pointer-events-none" : "";

  return (
    <SortableItemContext.Provider value={{ attributes, listeners, setActivatorNodeRef }}>
      {as === "tr" ? (
        <tr ref={ref} style={style} data-testid={testId} className={`${dragging} ${className || ""}`}>
          {children}
        </tr>
      ) : (
        <div ref={ref} style={style} className={`min-w-0 ${dragging} ${className || ""}`}>
          {children}
        </div>
      )}
    </SortableItemContext.Provider>
  );
}

export function SortableSection({ id, children }: { id: string; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, data: { type: "Section" } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <SortableItemContext.Provider value={{ attributes, listeners, setActivatorNodeRef }}>
      <div ref={setNodeRef} style={style} className={`min-w-0 ${isDragging ? "pointer-events-none" : ""}`}>
        {children}
      </div>
    </SortableItemContext.Provider>
  );
}
