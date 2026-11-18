export const QuoteItemType = {
  LABOR: "LABOR",
  MATERIAL: "MATERIAL",
  REFACCIONES: "REFACCIONES",
} as const;

export const QuoteOperationKind = {
  WORK: "WORK",
  SALE: "SALE",
} as const;

export class PrismaClientKnownRequestError extends Error {
  code: string;

  constructor(message: string, options: { code: string }) {
    super(message);
    this.name = "PrismaClientKnownRequestError";
    this.code = options.code;
  }
}

export const Prisma = {
  JsonNull: null,
  PrismaClientKnownRequestError,
  TransactionIsolationLevel: {
    Serializable: "Serializable",
  },
} as const;

// Mirrors Prisma Client's generated value/namespace merge for fixture-only type imports.
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Prisma {
  export type InputJsonValue = unknown;
  export type NullableJsonNullValueInput = null;
  export type TransactionClient = Record<string, unknown>;
}

export type QuoteItemType = (typeof QuoteItemType)[keyof typeof QuoteItemType];
export type PaymentRequest = Record<string, unknown>;
export type QuoteOperationKind = (typeof QuoteOperationKind)[keyof typeof QuoteOperationKind];
export type QuoteStatus = "DRAFT" | "SENT" | "APPROVED" | "REJECTED" | "CANCELLED" | "ARCHIVED";
export type UserRole = "ADMIN" | "WORKER" | "RECEPTION";
export type WorkOrderStatus = "PLANNED" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
