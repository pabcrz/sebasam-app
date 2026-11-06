import { describe, expect, it } from "vitest";
import { resolveDocumentDates } from "./document-dates";

const quoteDate = new Date("2026-09-20T12:00:00Z");
const workDate = new Date("2026-09-25T12:00:00Z");
const noteDate = new Date("2026-09-30T12:00:00Z");

describe("resolveDocumentDates", () => {
  it.each([null, "ASSIGNED", "IN_PROGRESS"])("does not expose stored deadlines before issuance (%s)", (status) => {
    const source = Object.freeze({ paymentDueDate: quoteDate,
      workOrder: status ? Object.freeze({ status, paymentDueDate: workDate }) : null,
    });
    expect(resolveDocumentDates(source)).toEqual({ isIssuedNote: false, paymentDueDate: null });
    expect(source.paymentDueDate).toBe(quoteDate);
    expect(source.workOrder?.paymentDueDate ?? null).toBe(status ? workDate : null);
  });

  it.each(["DRAFT", "CANCELLED"])("does not treat a %s payable note as issued", (status) => {
    expect(resolveDocumentDates({ paymentDueDate: quoteDate, workOrder: { status: "COMPLETED" },
      payableNote: { kind: "WORK", status, paymentDueDate: noteDate },
    })).toEqual({ isIssuedNote: false, paymentDueDate: null });
    expect(resolveDocumentDates({ payableNote: { kind: "SALE", status, paymentDueDate: noteDate } }))
      .toEqual({ isIssuedNote: false, paymentDueDate: null });
  });

  it("preserves the completed-work deadline and falls back through issued note and historical quotation", () => {
    const workOrder = { status: "COMPLETED", paymentDueDate: workDate };
    const payableNote = { kind: "WORK", status: "ISSUED", paymentDueDate: noteDate };
    expect(resolveDocumentDates({ workOrder, payableNote, paymentDueDate: quoteDate }))
      .toEqual({ isIssuedNote: true, paymentDueDate: workDate });
    expect(resolveDocumentDates({ workOrder: { ...workOrder, paymentDueDate: null }, payableNote, paymentDueDate: quoteDate }).paymentDueDate).toBe(noteDate);
    expect(resolveDocumentDates({ workOrder: { status: "COMPLETED" }, paymentDueDate: quoteDate }).paymentDueDate).toBe(quoteDate);
    expect(workOrder.paymentDueDate).toBe(workDate);
    expect(payableNote.paymentDueDate).toBe(noteDate);
  });

  it("uses the issued sale owner, retaining an explicit null instead of inventing a deadline", () => {
    const payableNote = { kind: "SALE", status: "ISSUED", paymentDueDate: noteDate };
    expect(resolveDocumentDates({ payableNote, paymentDueDate: quoteDate }))
      .toEqual({ isIssuedNote: true, paymentDueDate: noteDate });
    expect(resolveDocumentDates({ payableNote: { ...payableNote, paymentDueDate: null }, paymentDueDate: quoteDate }))
      .toEqual({ isIssuedNote: true, paymentDueDate: null });
    expect(resolveDocumentDates({ workOrder: { status: "COMPLETED" } }))
      .toEqual({ isIssuedNote: true, paymentDueDate: null });
  });
});
