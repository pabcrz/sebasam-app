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
};

type WorkerEditFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  worker: WorkerEditFormWorker;
  returnTo?: string;
};

export function WorkerEditForm({ action, worker, returnTo }: WorkerEditFormProps) {
  const [username, setUsername] = React.useState(worker.username);
  const generatedEmail = usernameToInternalEmail(username.trim().toLowerCase());

  return (
    <form action={action} className="grid gap-4" data-testid="worker-edit-form">
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
          <Select name="workerKind" defaultValue={worker.workerKind ?? undefined}>
            <SelectTrigger id="workerKind">
              <SelectValue placeholder="Selecciona un tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MASTER">Maestro</SelectItem>
              <SelectItem value="HELPER">Ayudante</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </fieldset>
      <Button type="submit" variant="primary" className="w-full sm:w-fit">
        Guardar trabajador
      </Button>
    </form>
  );
}
