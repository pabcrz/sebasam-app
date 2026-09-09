import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireOperationalRole } from "@/lib/auth/session";
import { parseCustomerStatementParams } from "@/features/customers/customer-statement";
import { getCustomerDetailedStatement } from "@/features/customers/customer-statement-queries";
import { CustomerStatementView } from "@/features/customers/components/customer-statement-view";

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
  return {
    title: `Estado de cuenta - ${name}`,
  };
}

export default async function CustomerStatementPage({ params, searchParams }: PageProps) {
  await requireOperationalRole();
  const { id } = await params;
  const periodParams = parseCustomerStatementParams(await searchParams);
  const statement = await getCustomerDetailedStatement(id, periodParams);

  if (!statement) {
    notFound();
  }

  return <CustomerStatementView statement={statement} />;
}
