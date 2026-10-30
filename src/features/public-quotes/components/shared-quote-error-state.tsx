import { NotFoundExperience } from "@/components/errors/not-found-experience";

export type SharedQuoteErrorType = "not-found" | "expired" | "revoked";

const quoteUnavailableMessage = "La cotización que buscas no está disponible, consulta al taller";

const errorTitles: Record<SharedQuoteErrorType, string> = {
  "not-found": "Cotización no disponible",
  expired: "Link expirado",
  revoked: "Cotización no disponible",
};

export interface SharedQuoteErrorStateProps {
  type: SharedQuoteErrorType;
}

export function SharedQuoteErrorState({ type }: SharedQuoteErrorStateProps) {
  return <NotFoundExperience title={errorTitles[type]} message={quoteUnavailableMessage} />;
}
