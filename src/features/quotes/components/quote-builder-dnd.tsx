"use client";

import React, { createContext, useContext } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

type SortableContextType = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  attributes: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listeners: Record<string, any> | undefined;
  setActivatorNodeRef: (node: HTMLElement | null) => void;
};

const SortableItemContext = createContext<SortableContextType | null>(null);

export function DragHandle({ ariaLabel, className }: { ariaLabel?: string; className?: string }) {
  const ctx = useContext(SortableItemContext);
  if (!ctx) return <GripVertical className={`size-4 shrink-0 text-[var(--color-text-muted)] ${className || ""}`} aria-hidden="true" />;
  
  const { setActivatorNodeRef, attributes, listeners } = ctx;
  return (
    <div
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label={ariaLabel}
      className={`flex items-center justify-center touch-none cursor-grab text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] ${className || ""}`}
    >
      <GripVertical className="size-4 shrink-0" aria-hidden="true" />
    </div>
  );
}

export function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
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

  return (
    <SortableItemContext.Provider value={{ attributes, listeners, setActivatorNodeRef }}>
      <div ref={setNodeRef} style={style} className={`min-w-0 ${isDragging ? "pointer-events-none" : ""}`}>
        {children}
      </div>
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
