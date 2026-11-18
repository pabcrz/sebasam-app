/** Minimal read model: document presentation ("Nota") alone does not prove issuance. */
export interface DocumentDateSource {
  paymentDueDate?: Date | null;
  workOrder?: { status?: string | null; paymentDueDate?: Date | null } | null;
  payableNote?: { kind: string; status: string; paymentDueDate?: Date | null } | null;
}

/** Resolves existing dates only; never calculates defaults or changes stored history. */
export function resolveDocumentDates(source: DocumentDateSource) {
  const note = source.payableNote;
  const isIssuedSale = note?.kind === "SALE" && note.status === "ISSUED";
  // Completed legacy work can predate PayableNote. An explicit draft/cancellation is not issuance.
  const isIssuedWork = source.workOrder?.status === "COMPLETED" && (!note || note.status === "ISSUED");
  const isIssuedNote = isIssuedSale || isIssuedWork;
  const paymentDueDate = !isIssuedNote
    ? null
    : isIssuedSale
      ? note.paymentDueDate ?? null
      : source.workOrder?.paymentDueDate ?? note?.paymentDueDate ?? source.paymentDueDate ?? null;
  return { isIssuedNote, paymentDueDate };
}
