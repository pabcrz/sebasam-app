"use client";

import * as React from "react";
import type { UserProfile } from "@/generated/prisma/client";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogDangerZone,
  DialogDescription,
  DialogMobileBody,
  DialogMobileContent,
  DialogMobileFooter,
  DialogMobileHeader,
  DialogTitle,
  Sheet,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { resetUserPassword, toggleUserStatus, updateUserRole } from "../actions";

type UserRoleValue = UserProfile["role"];

export interface UserEditDialogProps {
  user: UserProfile;
  currentUserId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Edit sheet for one user. Guardar saves the role; the password reset and the
 * activation toggle act on their own, as before, and close the sheet when they
 * change the user's status.
 */
export function UserEditDialog({ user, currentUserId, open, onOpenChange }: UserEditDialogProps) {
  const formId = React.useId();
  const [role, setRole] = React.useState<UserRoleValue>(user.role);
  const [isSaving, startTransition] = React.useTransition();
  const [newPassword, setNewPassword] = React.useState("");
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [isResetting, setIsResetting] = React.useState(false);

  const isSelf = user.id === currentUserId;
  const isBusy = isSaving || isResetting;

  const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (role === user.role) {
      onOpenChange(false);
      return;
    }

    startTransition(async () => {
      try {
        await updateUserRole({ userId: user.id, role });
        toast.success("Rol actualizado correctamente.");
        onOpenChange(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al actualizar rol");
      }
    });
  };

  const handleStatusToggle = () => {
    startTransition(async () => {
      try {
        await toggleUserStatus({ userId: user.id, isActive: !user.isActive });
        toast.success(!user.isActive ? "Usuario activado." : "Usuario desactivado.");
        onOpenChange(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al actualizar estado");
      }
    });
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      setPasswordError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setIsResetting(true);
    setPasswordError(null);
    try {
      await resetUserPassword({ userId: user.id, newPassword });
      toast.success("Contraseña restablecida correctamente. Comunícala al usuario de forma segura.");
      setNewPassword("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al restablecer contraseña";
      setPasswordError(message);
      toast.error(message);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isBusy) onOpenChange(nextOpen);
      }}
    >
      <DialogMobileContent
        variant="sheet"
        onEscapeKeyDown={(event) => {
          if (isBusy) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (isBusy) event.preventDefault();
        }}
      >
        <DialogMobileHeader>
          <DialogTitle>Editar usuario</DialogTitle>
          <DialogDescription>
            {user.displayName} · @{user.username}
          </DialogDescription>
        </DialogMobileHeader>

        <DialogMobileBody className="grid content-start gap-6">
          <form id={formId} onSubmit={handleSave} className="grid gap-2">
            <Label htmlFor={`${formId}-role`}>Rol</Label>
            <Select
              value={role}
              onValueChange={(value) => setRole(value as UserRoleValue)}
              disabled={isBusy || (isSelf && user.role === "SUPER_ADMIN")}
            >
              <SelectTrigger id={`${formId}-role`} aria-label={`Rol de ${user.username}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="ADMIN_ASSISTANT">Asistente</SelectItem>
                <SelectItem value="WORKER">Trabajador</SelectItem>
              </SelectContent>
            </Select>
          </form>

          <section className="grid gap-2">
            <Label htmlFor={`${formId}-password`}>Nueva contraseña</Label>
            <PasswordInput
              id={`${formId}-password`}
              name="newPassword"
              placeholder="Mínimo 8 caracteres"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              minLength={8}
              disabled={isResetting}
            />
            {passwordError ? (
              <p
                className="rounded-[var(--radius-sm)] border border-[var(--color-status-danger-border)] bg-[var(--color-status-danger-bg)] px-3 py-2 text-sm text-[var(--color-status-danger-fg)]"
                role="alert"
              >
                {passwordError}
              </p>
            ) : null}
            <div>
              <Button
                type="button"
                variant="tonal"
                size="sm"
                loading={isResetting}
                disabled={isBusy}
                onClick={handleResetPassword}
              >
                Restablecer contraseña
              </Button>
            </div>
          </section>

          {user.isActive ? (
            <DialogDangerZone>
              <div>
                <Button type="button" variant="danger" disabled={isBusy || isSelf} onClick={handleStatusToggle}>
                  Desactivar
                </Button>
              </div>
            </DialogDangerZone>
          ) : (
            <div>
              <Button type="button" variant="outline" disabled={isBusy} onClick={handleStatusToggle}>
                Activar
              </Button>
            </div>
          )}
        </DialogMobileBody>

        <DialogMobileFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isBusy}>
              Cancelar
            </Button>
          </DialogClose>
          <Button type="submit" form={formId} variant="primary" size="lg" loading={isSaving} disabled={isBusy}>
            Guardar
          </Button>
        </DialogMobileFooter>
      </DialogMobileContent>
    </Sheet>
  );
}
