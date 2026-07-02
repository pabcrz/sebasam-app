/**
 * Public payment configuration for SEBASAM.
 *
 * These values are displayed on the public payment page and are not secrets.
 * They match the business details shown in design docs and Figma.
 */

export const businessPaymentConfig = {
  name: "SEBASAM",
  fullName: "Servicio Básico a Suspensiones y Aire y Muelles",
  address: "Batalla de Casa Blanca 1719B, Leyes de Reforma, Iztapalapa, 09310 Ciudad de México, CDMX",
  mapsUrl: "https://maps.app.goo.gl/MYuGBKwabPGbea7y7",
  bank: {
    accountHolder: "Federico Cruz",
    bankName: "Santander",
    accountNumber: "123456",
    clabe: "4444 4444 4444 4444",
  },
  contact: {
    phone: "5556007675",
    whatsapp: "5536239346",
  },
};

export type BusinessPaymentConfig = typeof businessPaymentConfig;
