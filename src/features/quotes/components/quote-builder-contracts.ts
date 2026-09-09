import type { QuoteFormActionState } from "../actions";
import type { QuoteListSummary } from "../queries";
import type { ButtonVariant } from "@/components/ui";
import type { ItemFormValue } from "./quote-builder-shared";

export type CustomerContactOption = {
  id: string;
  name: string;
  phone: string;
  role: "DRIVER" | "CONTACT" | "BILLING";
  notes?: string | null;
  isActive: boolean;
};

export type CustomerFiscalProfileOption = {
  id: string;
  businessName: string;
  taxId: string;
  isDefault: boolean;
};

export type CustomerOption = {
  id: string;
  name: string;
  commercialName?: string | null;
  legalName?: string | null;
  rawName?: string;
  phone?: string | null;
  contacts?: CustomerContactOption[];
  fiscalProfiles?: CustomerFiscalProfileOption[];
};

export type QuoteBuilderInitialData = {
  customerId: string | null;
  customerContactId?: string | null;
  customerFiscalProfileId?: string | null;
  vehicle: { plate: string; brand: string; model: string; year: string; economicNumber?: string };
  title: string;
  description: string;
  administrative: boolean;
  taxEnabled: boolean;
  discountCents: number;
  operationalDate?: string;
  isOperationalDateEditable?: boolean;
  sections: Array<{ name: string; isAuthorized?: boolean; items: ItemFormValue[] }>;
};

export type MasterOption = {
  id: string;
  displayName: string;
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
  mode?: "quote" | "direct-work-order";
  masters?: MasterOption[];
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
  triggerLabel?: string;
  createCustomerAction?: QuoteBuilderProps["createCustomerAction"];
  searchCustomersAction?: QuoteBuilderProps["searchCustomersAction"];
  mode?: "quote" | "direct-work-order";
  masters?: MasterOption[];
};

