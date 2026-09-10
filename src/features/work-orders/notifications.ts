import { prisma } from "@/lib/prisma";
import { mexicoCityCalendarDate } from "./receivables-policy";

export type CustomerWorkOrderNotification = {
  workOrderId: string;
  workOrderNumber: string;
  customerId: string;
  customerName: string;
  phone: string | null;
  completedAt: Date;
  paymentDueDate: Date | null;
  message: string;
  dispatchedAt: Date;
};

export function formatCompletionNotificationMessage(input: {
  customerName: string;
  workOrderNumber: string;
  paymentDueDate: Date | null;
}): string {
  const dueFormatted = input.paymentDueDate
    ? mexicoCityCalendarDate(input.paymentDueDate)
    : "7 días calendario";

  return `Hola ${input.customerName}, tu trabajo con orden ${input.workOrderNumber} ha sido completado hoy. La fecha de vencimiento para el pago es ${dueFormatted}. Gracias por tu confianza en SEBASAM.`;
}

/**
 * Notifies the customer on the same day the work order is completed.
 * Uses primary phone or active contact from the customer profile.
 */
export async function notifyCustomerWorkOrderCompleted(
  workOrderId: string,
): Promise<CustomerWorkOrderNotification | null> {
  const workOrder = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    include: {
      quote: {
        include: {
          customer: {
            include: {
              contacts: {
                where: { isActive: true },
                orderBy: [{ role: "asc" }, { createdAt: "asc" }],
              },
            },
          },
        },
      },
    },
  });

  if (!workOrder || !workOrder.quote.customer) {
    return null;
  }

  const customer = workOrder.quote.customer;
  const customerName = customer.commercialName || customer.name;
  const contactPhone = customer.phone || customer.contacts[0]?.phone || null;
  const completedAt = workOrder.completedAt ?? new Date();
  const paymentDueDate = workOrder.paymentDueDate;

  const message = formatCompletionNotificationMessage({
    customerName,
    workOrderNumber: workOrder.number,
    paymentDueDate,
  });

  const notification: CustomerWorkOrderNotification = {
    workOrderId: workOrder.id,
    workOrderNumber: workOrder.number,
    customerId: customer.id,
    customerName,
    phone: contactPhone,
    completedAt,
    paymentDueDate,
    message,
    dispatchedAt: new Date(),
  };

  return notification;
}
