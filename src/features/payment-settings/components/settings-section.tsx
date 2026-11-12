"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui";

export type SettingsSaveResult = { success: true } | { success: false; error?: string };

/**
 * Draft state for one settings section. Only the section's own fields are edited here;
 * the section's Guardar runs its save action and the change bar shows only while the draft differs.
 */
export function useSettingsSection<T extends Record<string, string>>(
  stored: T,
  save: (formData: FormData) => Promise<SettingsSaveResult>,
) {
  const router = useRouter();
  const [saved, setSaved] = React.useState(stored);
  const [draft, setDraft] = React.useState(stored);
  const [pending, startTransition] = React.useTransition();

  const dirty = (Object.keys(stored) as (keyof T)[]).some((key) => draft[key] !== saved[key]);

  const setField = (key: keyof T, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const cancel = () => setDraft(saved);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const submitted = draft;
    const toastId = toast.loading("Guardando configuración…");
    startTransition(async () => {
      const result = await save(new FormData(event.currentTarget));
      if (result.success) {
        setSaved(submitted);
        toast.success("Configuración guardada.", { id: toastId });
        router.refresh();
      } else {
        toast.error(result.error ?? "No se pudieron guardar los cambios.", { id: toastId });
      }
    });
  };

  return { draft, dirty, pending, setField, cancel, submit };
}

/** Appears only while the section has unsaved changes. Guardar submits the section's form by id. */
export function SettingsChangeBar({
  formId,
  pending,
  onCancel,
}: {
  formId: string;
  pending: boolean;
  onCancel: () => void;
}) {
  return (
    <section
      aria-label="Cambios sin guardar"
      className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-md)]"
    >
      <p className="text-sm font-medium text-[var(--color-text-main)]">Cambios sin guardar</p>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" form={formId} size="sm" loading={pending} disabled={pending}>
          Guardar
        </Button>
      </div>
    </section>
  );
}
