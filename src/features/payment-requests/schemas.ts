import { z } from "zod";
import { PersonType } from "@/generated/prisma/client";

const optionalTrimmedString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional(),
);

const optionalEmail = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().email("Enter a valid email").optional(),
);

export const personTypeSchema = z.nativeEnum(PersonType);

export const fiscalDataInputSchema = z.object({
  personType: personTypeSchema.default(PersonType.INDIVIDUAL),
  businessName: z.string().trim().min(1, "Business name is required").max(200),
  taxId: z.string().trim().min(1, "Tax ID is required").max(20),
  taxRegime: optionalTrimmedString,
  cfdiUse: optionalTrimmedString,
  zipCode: optionalTrimmedString,
  address: optionalTrimmedString,
  email: optionalEmail,
  phone: optionalTrimmedString,
});

export const invoicePreferenceSchema = z.object({
  requiresInvoice: z.boolean(),
});

export type FiscalDataInput = z.infer<typeof fiscalDataInputSchema>;
export type InvoicePreferenceInput = z.infer<typeof invoicePreferenceSchema>;
