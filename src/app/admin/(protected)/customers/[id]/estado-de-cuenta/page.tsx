import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isAdminRole, requireOperationalRole } from "@/lib/auth/session";
import { formatStatementFilename, parseCustomerStatementParams } from "@/features/customers/customer-statement";
import { getCustomerDetailedStatement } from "@/features/customers/customer-statement-queries";
import { CustomerStatementView } from "@/features/customers/components/customer-statement-view";
import { recordPaymentAction } from "@/features/payments/actions";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const periodParams = parseCustomerStatementParams(await searchParams);
  const statement = await getCustomerDetailedStatement(id, periodParams);

  if (!statement) {
    return { title: "Estado de cuenta" };
  }

  const name = statement.customer.commercialName || statement.customer.name;
  // The PDF saved from the print dialog takes this title, like the note PDFs.
  return {
    title: { absolute: formatStatementFilename(name, statement.emissionDate) },
  };
}

export default async function CustomerStatementPage({ params, searchParams }: PageProps) {
  const { profile } = await requireOperationalRole();
  const { id } = await params;
  const periodParams = parseCustomerStatementParams(await searchParams);
  const statement = await getCustomerDetailedStatement(id, periodParams);

  if (!statement) {
    notFound();
  }

  return (
    <CustomerStatementView
      statement={statement}
      {...(isAdminRole(profile.role) ? { recordPaymentAction } : {})}
    />
  );
}
