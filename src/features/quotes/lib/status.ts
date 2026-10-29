import { QuoteStatus, WorkOrderStatus } from "@/generated/prisma/client";

export const quoteStatusLabels: Record<QuoteStatus, string> = {
  DRAFT: "Borrador",
  SENT: "Enviada",
  APPROVED: "Aceptada",
  REJECTED: "Declinada",
  CANCELLED: "Cancelada",
  ARCHIVED: "Archivada",
};

export const quoteStatusBadgeVariant: Record<QuoteStatus, "default" | "success" | "warning" | "danger" | "info"> = {
  DRAFT: "default",
  SENT: "info",
  APPROVED: "success",
  REJECTED: "danger",
  CANCELLED: "danger",
  ARCHIVED: "default",
};

export const workOrderStatusLabels: Record<WorkOrderStatus, string> = {
  PLANNED: "En espera",
  ASSIGNED: "Asignada",
  IN_PROGRESS: "En proceso",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
};

export const workOrderStatusBadgeVariant: Record<
  WorkOrderStatus,
  "default" | "success" | "warning" | "danger" | "info"
> = {
  PLANNED: "default",
  ASSIGNED: "info",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  CANCELLED: "danger",
};
