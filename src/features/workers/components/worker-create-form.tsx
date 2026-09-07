"use client";

import * as React from "react";
import {
  Button,
  DialogClose,
  DialogFooter,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { usernameToInternalEmail } from "../schemas";

type WorkerCreateFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  isPending: boolean;
  onSubmit: () => void;
};

export function WorkerCreateForm({ action, isPending, onSubmit }: WorkerCreateFormProps) {
  const [username, setUsername] = React.useState("");
  const [workerKind, setWorkerKind] = React.useState<"MASTER" | "HELPER">("MASTER");
  const generatedEmail = usernameToInternalEmail(username.trim().toLowerCase());

  return (
    <form action={action} onSubmit={onSubmit} className="grid gap-4" data-testid="worker-create-form">
      <div className="grid gap-2">
        <Label htmlFor="displayName">Nombre</Label>
        <Input id="displayName" name="displayName" placeholder="Nombre del trabajador" required disabled={isPending} />
      </div>
      <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
        <div className="grid gap-2">
          <Label htmlFor="username">Usuario interno</Label>
          <Input
            id="username"
            name="username"
            placeholder="nombre.apellido"
            required
            disabled={isPending}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">Correo interno</Label>
          <Input
            id="email"
            type="email"
            value={generatedEmail === "@sebasam.local" ? "" : generatedEmail}
            readOnly
            aria-readonly="true"
            placeholder="nombre@sebasam.local"
            disabled={isPending}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="workerKind">Tipo de trabajador</Label>
        <Select name="workerKind" value={workerKind} onValueChange={(value) => setWorkerKind(value as "MASTER" | "HELPER")} disabled={isPending}>
          <SelectTrigger id="workerKind">
            <SelectValue placeholder="Selecciona un tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MASTER">Maestro</SelectItem>
            <SelectItem value="HELPER">Ayudante</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {workerKind === "HELPER" && (
        <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
          <div className="grid gap-2">
            <Label htmlFor="fixedWeeklyPay">Sueldo semanal</Label>
            <Input
              id="fixedWeeklyPay"
              name="fixedWeeklyPay"
              type="number"
              min="0.01"
              step="0.01"
              disabled={isPending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="fixedDailyPay">Sueldo diario</Label>
            <Input
              id="fixedDailyPay"
              name="fixedDailyPay"
              type="number"
              min="0.01"
              step="0.01"
              disabled={isPending}
            />
          </div>
        </div>
      )}
      <p role="status" className="sr-only">
        {isPending ? "Creando trabajador..." : ""}
      </p>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" disabled={isPending}>
            Cancelar
          </Button>
        </DialogClose>
        <Button type="submit" variant="primary" className="w-full sm:w-fit" loading={isPending} disabled={isPending}>
          Crear trabajador
        </Button>
      </DialogFooter>
    </form>
  );
}
