"use client";

import { useTransition } from "react";
import type { UserProfile } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DestructiveAction } from "@/components/ui/destructive-action";
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
  const [isPending, startTransition] = useTransition();

  const handleRoleChange = (userId: string, newRole: string) => {
    startTransition(async () => {
      try {
        await updateUserRole({ userId, role: newRole });
      } catch (err) {
        alert(err instanceof Error ? err.message : "Error updating role");
      }
    });
  };

  const handleResetPassword = (userId: string) => {
    const newPassword = prompt("Ingresa la nueva contraseña segura para el usuario (mínimo 8 caracteres):");
    if (!newPassword || newPassword.length < 8) {
      if (newPassword) alert("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    startTransition(async () => {
      try {
        await resetUserPassword({ userId, newPassword });
        alert("Contraseña restablecida correctamente. Comunícala al usuario de forma segura.");
      } catch (err) {
        alert(err instanceof Error ? err.message : "Error resetting password");
      }
    });
  };

  return (
    <div className="rounded-md border border-[var(--color-border-light)] bg-[var(--color-bg-base)]">
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
              </TableCell>
              <TableCell>
                <Select
                  value={user.role}
                  onValueChange={(val) => handleRoleChange(user.id, val)}
                  disabled={isPending || (user.id === currentUserId && user.role === "SUPER_ADMIN")}
                >
                  <SelectTrigger className="w-40" aria-label={`Rol de ${user.username}`}>
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
                  {user.isActive ? (
                    <DestructiveAction
                      triggerLabel="Desactivar"
                      size="sm"
                      disabled={isPending || (user.id === currentUserId && user.isActive)}
                      title="Desactivar usuario"
                      description={`Desactivar a ${user.displayName} le impide iniciar sesión hasta que se active de nuevo.`}
                      confirmLabel="Sí, desactivar"
                      cancelLabel="Cancelar"
                      onConfirm={async () => {
                        await toggleUserStatus({ userId: user.id, isActive: false });
                      }}
                    />
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      onClick={() => toggleUserStatus({ userId: user.id, isActive: true })}
                    >
                      Activar
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleResetPassword(user.id)}
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
  );
}
