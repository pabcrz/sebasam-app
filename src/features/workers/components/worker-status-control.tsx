"use client";

import * as React from "react";
import { Button, DestructiveAction } from "@/components/ui";

type WorkerStatusControlProps = {
  workerName: string;
  isActive: boolean;
  /** Server action already bound to the worker id. */
  setActiveAction: (formData: FormData) => void | Promise<void>;
  returnTo?: string;
};

/**
 * Shared deactivate/activate control for workers. Deactivation is a
 * destructive state change and goes through `DestructiveAction`; activation
 * stays a plain form submit.
 */
export function WorkerStatusControl({
  workerName,
  isActive,
  setActiveAction,
  returnTo,
}: WorkerStatusControlProps) {
  if (isActive) {
    const handleDeactivate = async () => {
      const formData = new FormData();
      formData.set("isActive", "false");
      if (returnTo) formData.set("returnTo", returnTo);
      await setActiveAction(formData);
    };

    return (
      <DestructiveAction
        triggerLabel="Desactivar trabajador"
        triggerClassName="mt-3"
        title="Desactivar trabajador"
        description={`Desactivar a ${workerName} conserva sus asignaciones y registros históricos. Puedes reactivarlo en cualquier momento.`}
        confirmLabel="Sí, desactivar"
        cancelLabel="Cancelar"
        onConfirm={handleDeactivate}
      />
    );
  }

  return (
    <form action={setActiveAction} className="mt-3">
      <input type="hidden" name="isActive" value="true" />
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
      <Button type="submit" variant="outline">
        Activar trabajador
      </Button>
    </form>
  );
}