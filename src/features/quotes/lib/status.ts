import { QuoteStatus, WorkOrderStatus } from "@prisma/client";

export const quoteStatusLabels: Record<QuoteStatus, string> = {
  DRAFT: "Borrador",
  SENT: "Enviada",
  APPROVED: "Aceptada",
  REJECTED: "Declinada",
  CANCELLED: "Cancelada",
};

export const quoteStatusBadgeVariant: Record<QuoteStatus, "default" | "success" | "warning" | "danger" | "info"> = {
  DRAFT: "default",
  SENT: "info",
  APPROVED: "success",
  REJECTED: "danger",
  CANCELLED: "danger",
};

export const workOrderStatusLabels: Record<WorkOrderStatus, string> = {
  PLANNED: "Planeada",
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
