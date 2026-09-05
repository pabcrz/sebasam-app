import type { QuoteFormActionState } from "../actions";
import type { QuoteListSummary } from "../queries";
import type { ButtonVariant } from "@/components/ui";
import type { ItemFormValue } from "./quote-builder-shared";

export type CustomerOption = {
  id: string;
  name: string;
};

export type QuoteBuilderInitialData = {
  customerId: string | null;
  vehicle: { plate: string; brand: string; model: string; year: string };
  title: string;
  description: string;
  administrative: boolean;
  taxEnabled: boolean;
  discountCents: number;
  operationalDate?: string;
  isOperationalDateEditable?: boolean;
  sections: Array<{ name: string; isAuthorized?: boolean; items: ItemFormValue[] }>;
};

export type QuoteCustomerActionResult = {
  success: boolean;
  customer?: CustomerOption;
  error?: string;
  reused?: boolean;
};

export type QuoteBuilderProps = {
  customers: CustomerOption[];
  createAction?: (state: QuoteFormActionState, formData: FormData) => Promise<QuoteFormActionState>;
  saveAction?: (state: QuoteFormActionState, formData: FormData) => Promise<QuoteFormActionState>;
  createCustomerAction?: (input: unknown) => Promise<QuoteCustomerActionResult>;
  searchCustomersAction?: (input: unknown) => Promise<CustomerOption[]>;
  initialData?: QuoteBuilderInitialData;
  onCancel?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  onSuccess?: () => void;
  layout?: "page" | "dialog";
};

export type QuoteBuilderChromeHosts = {
  stepperHost: HTMLDivElement | null;
  footerHost: HTMLDivElement | null;
};

export type QuoteBuilderDialogProps = {
  customers: CustomerOption[];
  createAction?: QuoteBuilderProps["createAction"];
  saveAction?: QuoteBuilderProps["saveAction"];
  initialData?: QuoteBuilderInitialData;
  quote?: QuoteListSummary;
  quoteNumber?: string;
  triggerClassName?: string;
  triggerAriaLabel?: string;
  triggerSize?: "default" | "sm";
  triggerVariant?: ButtonVariant;
  triggerIconOnlyMobile?: boolean;
  triggerIconOnly?: boolean;
  createCustomerAction?: QuoteBuilderProps["createCustomerAction"];
  searchCustomersAction?: QuoteBuilderProps["searchCustomersAction"];
};
