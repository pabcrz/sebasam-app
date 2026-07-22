import { describe, expect, it } from "vitest";
import { customerInputSchema, customerUpdateSchema } from "./schemas";

describe("customer phone schemas", () => {
  it.each([
    ["5512345678", "5512345678"],
    ["55 1234-5678", "5512345678"],
    ["(55) 1234 5678", "5512345678"],
    ["+52 55 1234 5678", "5512345678"],
    ["52 (55) 1234-5678", "5512345678"],
    ["5212345678", "5212345678"],
  ])("normalizes %s to canonical national digits", (phone, expected) => {
    expect(customerInputSchema.parse({ name: "Customer", phone }).phone).toBe(expected);
  });

  it.each([undefined, "", "   "])("accepts optional blank phone %s", (phone) => {
    expect(customerInputSchema.parse({ name: "Customer", phone }).phone).toBeUndefined();
  });

  it.each(["551234567", "55123456789", "+1 555 123 4567", "55 1234 ABCD"])(
    "rejects nonblank phone %s when it cannot resolve to 10 national digits",
    (phone) => {
      expect(customerInputSchema.safeParse({ name: "Customer", phone }).success).toBe(false);
    },
  );

  it("normalizes updates through the shared customer schema", () => {
    const result = customerUpdateSchema.parse({
      name: "Customer",
      phone: "+52 55 1234 5678",
      status: "ACTIVE",
    });

    expect(result.phone).toBe("5512345678");
  });
});
