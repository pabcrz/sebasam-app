const placeholderValues = new Set(["xyz"]);

export function isMeaningfulText(value: string): boolean {
  const normalized = value.trim().toLocaleLowerCase("es-MX");
  return /\p{L}/u.test(normalized) && !placeholderValues.has(normalized);
}

export function getMeaningfulTextError(value: string, fieldName: string): string | null {
  return isMeaningfulText(value) ? null : `El ${fieldName} debe incluir texto significativo.`;
}
