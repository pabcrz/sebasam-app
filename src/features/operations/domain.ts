import type { OperationalWorkInput } from "./schemas";

export class OperationalWorkValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OperationalWorkValidationError";
  }
}

export function assertOperationalIdentity(input: Pick<OperationalWorkInput, "plate" | "brand" | "model">) {
  if (!input.plate && (!input.brand || !input.model)) {
    throw new OperationalWorkValidationError("A plate or both brand and model are required.");
  }
}

export function normalizeOperationalConcepts(concepts: OperationalWorkInput["concepts"]) {
  return concepts.map((concept, sortOrder) => ({
    description: concept.description.trim(),
    quantity: concept.quantity,
    sortOrder,
  }));
}
