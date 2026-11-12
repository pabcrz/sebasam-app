import type { Metadata } from "next";
import { requireOperationalRole } from "@/lib/auth/session";
import { getPaymentSettings } from "@/features/payment-settings/domain";
import { PaymentSettingsIndex } from "@/features/payment-settings/components/payment-settings-index";
import { listWorkers } from "@/features/workers/queries";
import { listUsers } from "@/features/user-management/queries";

export const metadata: Metadata = {
  title: "Configuración",
};

export default async function PaymentSettingsPage() {
  const { profile } = await requireOperationalRole();
  const canManageUsers = profile.role === "SUPER_ADMIN";

  const [settings, activeWorkers, users] = await Promise.all([
    getPaymentSettings(),
    listWorkers({ status: "ACTIVE" }),
    canManageUsers ? listUsers() : Promise.resolve([]),
  ]);

  return (
    <section
      data-testid="payment-settings-page-frame"
      data-layout-width="admin"
      className="mx-auto grid w-full max-w-4xl gap-4 px-4 py-6 md:gap-6 md:px-6 md:py-10"
    >
      <PaymentSettingsIndex
        settings={settings}
        activeWorkerCount={activeWorkers.length}
        userCount={users.length}
        canManageUsers={canManageUsers}
      />
    </section>
  );
}
