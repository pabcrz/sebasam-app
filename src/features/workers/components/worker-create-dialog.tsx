"use client";

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
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="primary">
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          Crear trabajador
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Crear trabajador</DialogTitle>
          <DialogDescription>
            Registra un maestro o ayudante para las asignaciones operativas.
          </DialogDescription>
        </DialogHeader>
        <WorkerCreateForm action={action} />
      </DialogContent>
    </Dialog>
  );
}
