"use client";

import * as React from "react";
import { UserPlus } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui";
import { WorkerCreateForm } from "./worker-create-form";

type WorkerCreateDialogProps = {
  action: (formData: FormData) => void | Promise<void>;
};

export function WorkerCreateDialog({ action }: WorkerCreateDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!isPending) setOpen(nextOpen); }}>
      <DialogTrigger asChild>
        <Button type="button" variant="primary" className="w-full sm:w-fit" disabled={isPending}>
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          Crear trabajador
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-w-2xl"
        onEscapeKeyDown={(event) => { if (isPending) event.preventDefault(); }}
        onPointerDownOutside={(event) => { if (isPending) event.preventDefault(); }}
      >
        <DialogHeader>
          <DialogTitle>Crear trabajador</DialogTitle>
          <DialogDescription>
            Registra un maestro o ayudante para las asignaciones operativas.
          </DialogDescription>
        </DialogHeader>
        <WorkerCreateForm action={action} isPending={isPending} onSubmit={() => setIsPending(true)} />
      </DialogContent>
    </Dialog>
  );
}
