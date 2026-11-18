const MAX_TITLE_LENGTH = 160;

/** The title the user typed, else the first concept's description, else a neutral label. */
export function resolveQuoteTitle(
  title: string,
  sections: ReadonlyArray<{ items: ReadonlyArray<{ description?: unknown }> }>,
): string {
  const typed = title.trim();
  if (typed) return typed;
  for (const section of sections) {
    for (const item of section.items) {
      const description = typeof item.description === "string" ? item.description.trim() : "";
      if (description) return description.slice(0, MAX_TITLE_LENGTH);
    }
  }
  return "Sin descripción";
}
