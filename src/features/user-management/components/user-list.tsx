"use client";

import * as React from "react";
import type { UserProfile } from "@/generated/prisma/client";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateUserRole, toggleUserStatus, resetUserPassword } from "../actions";

export interface UserListProps {
  users: UserProfile[];
  currentUserId: string;
}

export function UserList({ users, currentUserId }: UserListProps) {
  const [isPending, startTransition] = React.useTransition();
  const [resetPasswordUser, setResetPasswordUser] = React.useState<UserProfile | null>(null);
  const [newPassword, setNewPassword] = React.useState("");
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [isResetting, setIsResetting] = React.useState(false);

  const handleRoleChange = (userId: string, newRole: string) => {
    startTransition(async () => {
      try {
        await updateUserRole({ userId, role: newRole });
        toast.success("Rol actualizado correctamente.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al actualizar rol");
      }
    });
  };

  const handleStatusToggle = (userId: string, currentStatus: boolean) => {
    startTransition(async () => {
      try {
        await toggleUserStatus({ userId, isActive: !currentStatus });
        toast.success(!currentStatus ? "Usuario activado." : "Usuario desactivado.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al actualizar estado");
      }
    });
  };

  const handleResetPasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!resetPasswordUser) return;
    if (!newPassword || newPassword.length < 8) {
      setPasswordError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setIsResetting(true);
    setPasswordError(null);
    try {
      await resetUserPassword({ userId: resetPasswordUser.id, newPassword });
      toast.success("Contraseña restablecida correctamente. Comunícala al usuario de forma segura.");
      setResetPasswordUser(null);
      setNewPassword("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al restablecer contraseña";
      setPasswordError(msg);
      toast.error(msg);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <>
      <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-surface)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="font-medium text-[var(--color-text-main)]">{user.displayName}</div>
                  <div className="text-xs text-[var(--color-text-muted)]">{user.username}</div>
                  {user.email ? (
                    <div className="text-xs text-[var(--color-text-muted)]">{user.email}</div>
                  ) : null}
                </TableCell>
                <TableCell>
                  <Select
                    value={user.role}
                    onValueChange={(val) => handleRoleChange(user.id, val)}
                    disabled={isPending || (user.id === currentUserId && user.role === "SUPER_ADMIN")}
                  >
                    <SelectTrigger className="w-36 sm:w-40" aria-label={`Rol de ${user.username}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="ADMIN_ASSISTANT">Asistente</SelectItem>
                      <SelectItem value="WORKER">Trabajador</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Badge variant={user.isActive ? "success" : "danger"}>
                    {user.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isPending || (user.id === currentUserId && user.isActive)}
                      onClick={() => handleStatusToggle(user.id, user.isActive)}
                    >
                      {user.isActive ? "Desactivar" : "Activar"}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={isPending}
                      onClick={() => {
                        setResetPasswordUser(user);
                        setNewPassword("");
                        setPasswordError(null);
                      }}
                    >
                      Resetear Pass
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={Boolean(resetPasswordUser)}
        onOpenChange={(open) => {
          if (!open && !isResetting) {
            setResetPasswordUser(null);
            setNewPassword("");
            setPasswordError(null);
          }
        }}
      >
        <DialogContent
          className="max-w-md"
          onEscapeKeyDown={(event) => {
            if (isResetting) event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (isResetting) event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>Restablecer contraseña</DialogTitle>
            <DialogDescription>
              Ingresa la nueva contraseña para{" "}
              <span className="font-semibold text-[var(--color-text-main)]">
                {resetPasswordUser?.displayName}
              </span>{" "}
              ({resetPasswordUser?.username}).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleResetPasswordSubmit} className="grid gap-4">
            {passwordError ? (
              <p
                className="rounded-[var(--radius-sm)] border border-[var(--color-status-danger-border)] bg-[var(--color-status-danger-bg)] px-3 py-2 text-sm text-[var(--color-status-danger-fg)]"
                role="alert"
              >
                {passwordError}
              </p>
            ) : null}

            <div className="grid gap-2">
              <Label htmlFor="newPassword">Nueva contraseña</Label>
              <PasswordInput
                id="newPassword"
                name="newPassword"
                placeholder="Mínimo 8 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                disabled={isResetting}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isResetting}
                onClick={() => setResetPasswordUser(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="primary" loading={isResetting} disabled={isResetting}>
                Guardar contraseña
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
