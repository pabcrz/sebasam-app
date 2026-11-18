"use client";

import * as React from "react";
import type { UserProfile } from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { ListRow } from "@/components/ui/list-row";
import { UserEditDialog } from "./user-edit-dialog";

export interface UserListProps {
  users: UserProfile[];
  currentUserId: string;
}

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  ADMIN_ASSISTANT: "Asistente",
  WORKER: "Trabajador",
};

/** One whole-row button per user. Tapping a row opens its edit sheet. */
export function UserList({ users, currentUserId }: UserListProps) {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const editing = users.find((user) => user.id === editingId) ?? null;

  return (
    <div className="grid gap-3" data-testid="user-list">
      {users.map((user) => (
        <ListRow key={user.id} openLabel={`Editar a ${user.displayName}`} onOpen={() => setEditingId(user.id)}>
          <span className="grid min-w-0 gap-0.5">
            <span className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="truncate font-medium text-[var(--color-text-main)]">{user.displayName}</span>
              {user.isActive ? null : <Badge variant="default">Inactivo</Badge>}
            </span>
            <span className="truncate text-sm text-[var(--color-text-muted)]">
              {roleLabels[user.role] ?? user.role} · @{user.username}
            </span>
          </span>
        </ListRow>
      ))}

      {editing ? (
        <UserEditDialog
          key={editing.id}
          user={editing}
          currentUserId={currentUserId}
          open
          onOpenChange={(open) => {
            if (!open) setEditingId(null);
          }}
        />
      ) : null}
    </div>
  );
}
