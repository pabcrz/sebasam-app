/**
 * Fallback payment configuration for SEBASAM.
 *
 * These values match the DB defaults in the PaymentSettings model and are only
 * used as a fallback when settings haven't been loaded from the database.
 *
 * Prefer loading payment data via `getPaymentSettings()` from
 * `@/features/payment-settings/domain` in server components and passing it
 * as props to client components.
 */

export const businessPaymentConfig = {
  name: "SEBASAM",
  fullName: "Servicio y Refacciones para Suspensiones de Aire y Muelles",
  address: "Batalla de Casa Blanca 1719B, Leyes de Reforma, Iztapalapa, 09310 Ciudad de México, CDMX",
  mapsUrl: "https://maps.app.goo.gl/MYuGBKwabPGbea7y7",
  bank: {
    accountHolder: "Federico Cruz",
    bankName: "Santander",
    accountNumber: "123456",
    clabe: "4444 4444 4444 4444",
  },
  contactPhone: "5556007675",
  contactWhatsapp: "5536239346",
};

export type BusinessPaymentConfig = typeof businessPaymentConfig;
