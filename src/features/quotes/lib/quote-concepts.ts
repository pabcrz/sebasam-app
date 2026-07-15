export const quoteConceptTypes = [
  "LABOR",
  "SERVICE",
  "MATERIAL",
  "EQUIPMENT",
  "OTHER",
] as const;

export type QuoteConceptType = (typeof quoteConceptTypes)[number];

export const quoteConceptTypeLabels: Record<QuoteConceptType, string> = {
  SERVICE: "Servicio",
  MATERIAL: "Material",
  LABOR: "Mano de obra",
  EQUIPMENT: "Equipo",
  OTHER: "Otro",
};
