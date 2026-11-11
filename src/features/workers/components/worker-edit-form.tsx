"use client";

import * as React from "react";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SectionLabel,
} from "@/components/ui";
import { usernameToInternalEmail } from "../schemas";

type WorkerEditFormWorker = {
  displayName: string;
  username: string;
  email: string;
  workerKind: "MASTER" | "HELPER" | null;
  fixedWeeklyPayCents?: number | null;
  fixedDailyPayCents?: number | null;
};

type WorkerEditFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  worker: WorkerEditFormWorker;
  returnTo?: string;
  /** Lets a footer outside the form submit it (`<Button form={formId}>`). */
  formId?: string;
  /** Sheets render their own Guardar in the footer; the standalone edit page keeps this one. */
  showSubmit?: boolean;
};

export function WorkerEditForm({ action, worker, returnTo, formId, showSubmit = true }: WorkerEditFormProps) {
  const [username, setUsername] = React.useState(worker.username);
  const [workerKind, setWorkerKind] = React.useState<"MASTER" | "HELPER">(worker.workerKind ?? "MASTER");
  const generatedEmail = usernameToInternalEmail(username.trim().toLowerCase());

  return (
    <form id={formId} action={action} className="grid gap-4" data-testid="worker-edit-form">
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
      <fieldset className="grid gap-4">
        <SectionLabel as="legend">Perfil operativo</SectionLabel>
        <div className="grid gap-2">
          <Label htmlFor="displayName">Nombre</Label>
          <Input id="displayName" name="displayName" defaultValue={worker.displayName} required />
        </div>
        <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
          <div className="grid gap-2">
            <Label htmlFor="username">Usuario interno</Label>
            <Input
              id="username"
              name="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Correo interno</Label>
            <Input
              id="email"
              type="email"
              value={generatedEmail}
              readOnly
              aria-readonly="true"
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="workerKind">Tipo de trabajador</Label>
          <Select name="workerKind" value={workerKind} onValueChange={(value) => setWorkerKind(value as "MASTER" | "HELPER")}>
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
                defaultValue={worker.fixedWeeklyPayCents ? worker.fixedWeeklyPayCents / 100 : ""}
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
                defaultValue={worker.fixedDailyPayCents ? worker.fixedDailyPayCents / 100 : ""}
              />
            </div>
          </div>
        )}
      </fieldset>
      {showSubmit ? (
        <Button type="submit" variant="primary" className="w-full sm:w-fit">
          Guardar trabajador
        </Button>
      ) : null}
    </form>
  );
}
