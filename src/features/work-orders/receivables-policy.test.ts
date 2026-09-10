import { describe, expect, it } from "vitest";
import {
  calculateDefaultPaymentDueDate,
  isNoteOverdue,
  mexicoCityCalendarDate,
} from "./receivables-policy";

describe("receivables-policy", () => {
  describe("calculateDefaultPaymentDueDate", () => {
    it("adds exactly 7 calendar days in Mexico City", () => {
      // Completed on Wednesday Sep 9, 2026 at 10:00 Mexico City time (UTC-6 -> 16:00 UTC)
      const completedAt = new Date("2026-09-09T16:00:00.000Z");
      const dueDate = calculateDefaultPaymentDueDate(completedAt);

      expect(mexicoCityCalendarDate(completedAt)).toBe("2026-09-09");
      expect(mexicoCityCalendarDate(dueDate)).toBe("2026-09-16");
    });

    it("correctly rolls over month boundaries in Mexico City", () => {
      // Jan 28 -> Feb 4
      const endOfMonth = new Date("2026-01-28T18:00:00.000Z");
      const due = calculateDefaultPaymentDueDate(endOfMonth);
      expect(mexicoCityCalendarDate(due)).toBe("2026-02-04");
    });

    it("correctly handles historical/DST transition dates without skipping or losing a day", () => {
      // DST transition historically occurred in early April
      const springDate = new Date("2022-04-01T18:00:00.000Z");
      const due = calculateDefaultPaymentDueDate(springDate);
      expect(mexicoCityCalendarDate(due)).toBe("2022-04-08");
    });
  });

  describe("isNoteOverdue", () => {
    const today = new Date("2026-09-16T18:00:00.000Z"); // Sep 16, 2026 in CDMX

    it("is NOT overdue if pending balance is zero or negative (paid or excess credit)", () => {
      const pastDueDate = new Date("2026-09-10T18:00:00.000Z");

      expect(isNoteOverdue({ paymentDueDate: pastDueDate, pendingBalanceCents: 0, now: today })).toBe(false);
      expect(isNoteOverdue({ paymentDueDate: pastDueDate, pendingBalanceCents: -500, now: today })).toBe(false);
    });

    it("is NOT overdue if paymentDueDate is missing/null", () => {
      expect(isNoteOverdue({ paymentDueDate: null, pendingBalanceCents: 15_000, now: today })).toBe(false);
    });

    it("is NOT overdue on the day of the due date itself", () => {
      const dueToday = new Date("2026-09-16T12:00:00.000Z");
      expect(isNoteOverdue({ paymentDueDate: dueToday, pendingBalanceCents: 5_000, now: today })).toBe(false);
    });

    it("is NOT overdue when due date is in the future", () => {
      const dueFuture = new Date("2026-09-17T12:00:00.000Z");
      expect(isNoteOverdue({ paymentDueDate: dueFuture, pendingBalanceCents: 5_000, now: today })).toBe(false);
    });

    it("IS overdue when due date is strictly prior to today in Mexico City and pending balance > 0", () => {
      const dueYesterday = new Date("2026-09-15T23:59:59.000Z");
      expect(isNoteOverdue({ paymentDueDate: dueYesterday, pendingBalanceCents: 5_000, now: today })).toBe(true);
    });

    it("respects exception: negotiated term (plazo negociado)", () => {
      // Standard due date would have been Sep 10 (past)
      const pastDueDate = new Date("2026-09-10T12:00:00.000Z");
      // But negotiated term is Sep 25 (future)
      const agreedDueDate = new Date("2026-09-25T12:00:00.000Z");

      const result = isNoteOverdue({
        paymentDueDate: pastDueDate,
        pendingBalanceCents: 10_000,
        now: today,
        exception: {
          type: "NEGOTIATED_TERM",
          agreedDueDate,
          reason: "Plazo acordado de 30 días",
        },
      });

      expect(result).toBe(false);

      // Once the negotiated date has passed, it DOES become overdue
      const pastAgreedDate = new Date("2026-09-14T12:00:00.000Z");
      expect(
        isNoteOverdue({
          paymentDueDate: pastDueDate,
          pendingBalanceCents: 10_000,
          now: today,
          exception: {
            type: "NEGOTIATED_TERM",
            agreedDueDate: pastAgreedDate,
          },
        }),
      ).toBe(true);
    });

    it("respects exception: pending authorization (pendiente de autorización)", () => {
      const pastDueDate = new Date("2026-09-10T12:00:00.000Z");

      const result = isNoteOverdue({
        paymentDueDate: pastDueDate,
        pendingBalanceCents: 10_000,
        now: today,
        exception: {
          type: "PENDING_AUTHORIZATION",
          reason: "En revisión de tesorería corporativa",
        },
      });

      expect(result).toBe(false);
    });
  });
});
