"use client";

import { useTransition, useState } from "react";
import { UserRole } from "@/generated/prisma/enums";
import toast from "react-hot-toast";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { PasswordInput } from "@/components/ui/password-input";

export interface UserCreateFormProps {
  action: (formData: FormData) => Promise<{ success?: boolean; error?: string }>;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function UserCreateForm({ action, onSuccess, onCancel }: UserCreateFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole>("WORKER");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const form = event.currentTarget;

    startTransition(async () => {
      setError(null);
      try {
        const result = await action(formData);
        if (result?.error) {
          setError(result.error);
          toast.error(result.error);
        } else {
          toast.success("Usuario creado exitosamente.");
          form.reset();
          setRole("WORKER");
          onSuccess?.();
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al crear el usuario.";
        setError(message);
        toast.error(message);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4" data-testid="user-create-form">
      {error ? (
        <p
          className="rounded-[var(--radius-sm)] border border-[var(--color-status-danger-border)] bg-[var(--color-status-danger-bg)] px-4 py-3 text-sm text-[var(--color-status-danger-fg)]"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="username">Nombre de usuario</Label>
        <Input id="username" name="username" placeholder="johndoe" required minLength={3} disabled={isPending} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="displayName">Nombre a mostrar</Label>
        <Input id="displayName" name="displayName" placeholder="John Doe" required minLength={3} disabled={isPending} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="role">Rol</Label>
        <Select name="role" value={role} onValueChange={(val) => setRole(val as UserRole)} disabled={isPending}>
          <SelectTrigger id="role" aria-label="Rol">
            <SelectValue placeholder="Selecciona un rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="ADMIN_ASSISTANT">Asistente</SelectItem>
            <SelectItem value="WORKER">Trabajador</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {role === "WORKER" && (
        <div className="grid gap-2">
          <Label htmlFor="workerKind">Tipo de trabajador</Label>
          <Select name="workerKind" defaultValue="MASTER" disabled={isPending}>
            <SelectTrigger id="workerKind" aria-label="Tipo de trabajador">
              <SelectValue placeholder="Selecciona el tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MASTER">Maestro</SelectItem>
              <SelectItem value="HELPER">Ayudante</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor="password">Contraseña inicial</Label>
        <PasswordInput id="password" name="password" placeholder="Contraseña segura" required minLength={8} disabled={isPending} />
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
            className="w-full sm:w-fit"
          >
            Cancelar
          </Button>
        ) : null}
        <Button
          type="submit"
          variant="primary"
          className="w-full sm:w-fit"
          disabled={isPending}
          loading={isPending}
        >
          {isPending ? "Creando..." : "Crear usuario"}
        </Button>
      </div>
    </form>
  );
}
