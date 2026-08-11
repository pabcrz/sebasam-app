"use client";

import React, { createContext, useContext } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

type SortableContextType = {
  attributes: Record<string, any>;
  listeners: Record<string, any> | undefined;
  setActivatorNodeRef: (node: HTMLElement | null) => void;
};

const SortableItemContext = createContext<SortableContextType | null>(null);

export function DragHandle({ className }: { className?: string }) {
  const context = useContext(SortableItemContext);
  if (!context) return <GripVertical className={`size-4 shrink-0 text-[var(--color-text-muted)] ${className || ""}`} aria-hidden="true" />;
  return (
    <div
      ref={context.setActivatorNodeRef}
      {...context.attributes}
      {...context.listeners}
      className={`flex items-center justify-center touch-none cursor-grab text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] ${className || ""}`}
    >
      <GripVertical className="size-4 shrink-0" aria-hidden="true" />
    </div>
  );
}

export function SortableItem({ id, children, isDragOverlay = false }: { id: string; children: React.ReactNode; isDragOverlay?: boolean }) {
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
      <div ref={setNodeRef} style={style} className={isDragging ? "pointer-events-none" : ""}>
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
      <div ref={setNodeRef} style={style} className={isDragging ? "pointer-events-none" : ""}>
        {children}
      </div>
    </SortableItemContext.Provider>
  );
}
