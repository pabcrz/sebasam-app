export type UnitIdentityInput = {
  economicNumber?: string | null;
  plates?: string | null;
  model?: string | null;
};

function clean(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? null : trimmed;
}

/**
 * Identifies a unit with what exists: ECO + model, else plates + model, else
 * the model alone. Returns null when there is nothing to show, so callers never
 * render placeholder text. The driver is intentionally not part of the identity.
 */
export function formatUnitIdentity({ economicNumber, plates, model }: UnitIdentityInput): string | null {
  const eco = clean(economicNumber);
  const plate = clean(plates);
  const unitModel = clean(model);
  const unit = eco ? `ECO ${eco}` : plate;

  return [unit, unitModel].filter(Boolean).join(" · ") || null;
}
