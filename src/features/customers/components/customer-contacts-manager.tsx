"use client";

import * as React from "react";
import { Plus, Phone, Edit2, Trash2, UserCheck, UserX, Users } from "lucide-react";
import toast from "react-hot-toast";
import type { CustomerContactRole } from "@prisma/client";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/components/ui";
import {
  createCustomerContactAction,
  updateCustomerContactAction,
  toggleCustomerContactActiveAction,
  deleteCustomerContactAction,
} from "../actions";

export type CustomerContactItem = {
  id: string;
  name: string;
  phone: string;
  role: CustomerContactRole;
  notes?: string | null;
  isActive: boolean;
};

export interface CustomerContactsManagerProps {
  customerId: string;
  contacts?: CustomerContactItem[];
}

const roleLabels: Record<CustomerContactRole, string> = {
  DRIVER: "Chofer",
  CONTACT: "Contacto",
  BILLING: "Facturación",
};

const roleBadgeVariants: Record<CustomerContactRole, "info" | "default" | "warning"> = {
  DRIVER: "info",
  CONTACT: "default",
  BILLING: "warning",
};

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6)}`;
  }
  return phone;
}

export function CustomerContactsManager({ customerId, contacts = [] }: CustomerContactsManagerProps) {
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [editingContact, setEditingContact] = React.useState<CustomerContactItem | null>(null);
  const [isPending, startTransition] = React.useTransition();

  // Form states for adding
  const [addName, setAddName] = React.useState("");
  const [addPhone, setAddPhone] = React.useState("");
  const [addRole, setAddRole] = React.useState<CustomerContactRole>("DRIVER");
  const [addNotes, setAddNotes] = React.useState("");

  // Form states for editing
  const [editName, setEditName] = React.useState("");
  const [editPhone, setEditPhone] = React.useState("");
  const [editRole, setEditRole] = React.useState<CustomerContactRole>("DRIVER");
  const [editNotes, setEditNotes] = React.useState("");
  const [editIsActive, setEditIsActive] = React.useState(true);

  const resetAddForm = () => {
    setAddName("");
    setAddPhone("");
    setAddRole("DRIVER");
    setAddNotes("");
  };

  const handleOpenEdit = (contact: CustomerContactItem) => {
    setEditingContact(contact);
    setEditName(contact.name);
    setEditPhone(contact.phone);
    setEditRole(contact.role);
    setEditNotes(contact.notes ?? "");
    setEditIsActive(contact.isActive);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await createCustomerContactAction(customerId, {
        name: addName.trim(),
        phone: addPhone.trim(),
        role: addRole,
        notes: addNotes.trim() || undefined,
        isActive: true,
      });

      if (result.success) {
        toast.success("Contacto agregado exitosamente.");
        setIsAddOpen(false);
        resetAddForm();
      } else {
        toast.error(result.error ?? "Error al agregar contacto.");
      }
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContact) return;

    startTransition(async () => {
      const result = await updateCustomerContactAction(editingContact.id, {
        name: editName.trim(),
        phone: editPhone.trim(),
        role: editRole,
        notes: editNotes.trim() || undefined,
        isActive: editIsActive,
      });

      if (result.success) {
        toast.success("Contacto actualizado.");
        setEditingContact(null);
      } else {
        toast.error(result.error ?? "Error al actualizar contacto.");
      }
    });
  };

  const handleToggleActive = (contact: CustomerContactItem) => {
    const nextState = !contact.isActive;
    startTransition(async () => {
      const result = await toggleCustomerContactActiveAction(contact.id, nextState);
      if (result.success) {
        toast.success(nextState ? "Contacto reactivado." : "Contacto desactivado.");
      } else {
        toast.error(result.error ?? "Error al cambiar estado del contacto.");
      }
    });
  };

  const handleDelete = (contactId: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar este contacto?")) return;

    startTransition(async () => {
      const result = await deleteCustomerContactAction(contactId);
      if (result.success) {
        toast.success("Contacto eliminado.");
      } else {
        toast.error(result.error ?? "Error al eliminar contacto.");
      }
    });
  };

  return (
    <Card className="min-w-0">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle as="h2" className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[var(--color-primary)]" />
            Contactos operativos y choferes
          </CardTitle>
          <CardDescription>
            Administra choferes, encargados de unidad y contactos de facturación para asociarlos en cotizaciones y notas.
          </CardDescription>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button variant="primary" size="sm" className="w-full sm:w-auto shrink-0">
              <Plus className="mr-1.5 h-4 w-4" />
              Agregar contacto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nuevo contacto operativo</DialogTitle>
              <DialogDescription>
                Registra un chofer, contacto operativo o responsable de facturación.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="contact-add-name">Nombre completo *</Label>
                <Input
                  id="contact-add-name"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="Ej. Juan Pérez / El Mariachi"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="contact-add-phone">Teléfono (10 dígitos) *</Label>
                <Input
                  id="contact-add-phone"
                  type="tel"
                  inputMode="tel"
                  maxLength={15}
                  value={addPhone}
                  onChange={(e) => setAddPhone(e.target.value)}
                  placeholder="Ej. 777 123 4567"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="contact-add-role">Rol del contacto *</Label>
                <Select value={addRole} onValueChange={(val) => setAddRole(val as CustomerContactRole)}>
                  <SelectTrigger id="contact-add-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRIVER">Chofer</SelectItem>
                    <SelectItem value="CONTACT">Contacto operativo / Encargado</SelectItem>
                    <SelectItem value="BILLING">Facturación / Pagos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="contact-add-notes">Notas (opcional)</Label>
                <Textarea
                  id="contact-add-notes"
                  value={addNotes}
                  onChange={(e) => setAddNotes(e.target.value)}
                  placeholder="Unidad habitual, horario de atención..."
                  rows={2}
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={isPending}>
                    Cancelar
                  </Button>
                </DialogClose>
                <Button type="submit" variant="primary" loading={isPending}>
                  Guardar contacto
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {contacts.length === 0 ? (
          <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border-light)] p-6 text-center text-sm text-[var(--color-text-muted)]">
            No hay contactos operativos registrados. Haz clic en &ldquo;Agregar contacto&rdquo; para registrar choferes o encargados.
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border-light)]">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="grid gap-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`font-semibold text-sm ${contact.isActive ? "text-[var(--color-text-main)]" : "text-[var(--color-text-muted)] line-through"}`}>
                      {contact.name}
                    </span>
                    <Badge variant={roleBadgeVariants[contact.role]}>
                      {roleLabels[contact.role]}
                    </Badge>
                    {!contact.isActive ? (
                      <Badge variant="default" className="text-xs text-[var(--color-text-muted)]">
                        Inactivo
                      </Badge>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span>{formatPhone(contact.phone)}</span>
                  </div>
                  {contact.notes ? (
                    <p className="text-xs text-[var(--color-text-muted)] italic">
                      {contact.notes}
                    </p>
                  ) : null}
                </div>

                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleToggleActive(contact)}
                    title={contact.isActive ? "Desactivar contacto" : "Reactivar contacto"}
                  >
                    {contact.isActive ? (
                      <UserX className="h-4 w-4 text-[var(--color-text-muted)] hover:text-[var(--color-status-danger-fg)]" />
                    ) : (
                      <UserCheck className="h-4 w-4 text-[var(--color-status-success-fg)]" />
                    )}
                    <span className="sr-only">
                      {contact.isActive ? "Desactivar" : "Reactivar"}
                    </span>
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleOpenEdit(contact)}
                    title="Editar contacto"
                  >
                    <Edit2 className="h-4 w-4 text-[var(--color-text-muted)]" />
                    <span className="sr-only">Editar</span>
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleDelete(contact.id)}
                    title="Eliminar contacto"
                  >
                    <Trash2 className="h-4 w-4 text-[var(--color-status-danger-fg)]" />
                    <span className="sr-only">Eliminar</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={editingContact !== null} onOpenChange={(open) => !open && setEditingContact(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar contacto operativo</DialogTitle>
            <DialogDescription>
              Modifica la información o rol de este contacto.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="contact-edit-name">Nombre completo *</Label>
              <Input
                id="contact-edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="contact-edit-phone">Teléfono (10 dígitos) *</Label>
              <Input
                id="contact-edit-phone"
                type="tel"
                inputMode="tel"
                maxLength={15}
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="contact-edit-role">Rol del contacto *</Label>
              <Select value={editRole} onValueChange={(val) => setEditRole(val as CustomerContactRole)}>
                <SelectTrigger id="contact-edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRIVER">Chofer</SelectItem>
                  <SelectItem value="CONTACT">Contacto operativo / Encargado</SelectItem>
                  <SelectItem value="BILLING">Facturación / Pagos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="contact-edit-notes">Notas (opcional)</Label>
              <Textarea
                id="contact-edit-notes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={2}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isPending}>
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" variant="primary" loading={isPending}>
                Guardar cambios
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
