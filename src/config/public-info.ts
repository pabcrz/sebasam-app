import { businessPaymentConfig } from "@/config/payment";

export const publicInfoDefaults = {
  name: businessPaymentConfig.name,
  fullName: businessPaymentConfig.fullName,
  address: businessPaymentConfig.address,
  mapsUrl: businessPaymentConfig.mapsUrl,
  contactPhone: businessPaymentConfig.contact.phone,
  contactWhatsapp: businessPaymentConfig.contact.whatsapp,
  hours: {
    weekdays: "Lunes a viernes de 9:00 a 18:00",
    saturday: "Sábados de 9:00 a 15:00",
  },
  services: ["Alineación de ejes", "Brio a muelles", "Refuerzos", "Soldadura"],
  products: ["Abrazaderas", "Bujes", "Perchas", "Columpios", "Tensores", "Balancines"],
};
