export type CustomerDeletionBlocker = {
  canDelete: boolean;
  reason: string | null;
};

export function getCustomerDeletionBlocker(customer: {
  _count?: {
    quotes?: number;
    payments?: number;
    paymentRequests?: number;
    ledgerEntries?: number;
  } | null;
}): CustomerDeletionBlocker {
  const quotesCount = customer._count?.quotes ?? 0;
  const paymentsCount = customer._count?.payments ?? 0;
  const paymentRequestsCount = customer._count?.paymentRequests ?? 0;
  const ledgerEntriesCount = customer._count?.ledgerEntries ?? 0;

  if (quotesCount > 0) {
    return {
      canDelete: false,
      reason:
        quotesCount === 1
          ? "No se puede eliminar: tiene 1 cotización asociada"
          : `No se puede eliminar: tiene ${quotesCount} cotizaciones asociadas`,
    };
  }

  if (paymentsCount > 0 || paymentRequestsCount > 0 || ledgerEntriesCount > 0) {
    return {
      canDelete: false,
      reason: "No se puede eliminar: tiene actividad financiera asociada",
    };
  }

  return {
    canDelete: true,
    reason: null,
  };
}
