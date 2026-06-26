"use client";

import { MessageCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from "@/components/ui";
import { businessPaymentConfig } from "@/config/payment";

export interface WhatsAppReceiptCtaProps {
  reference?: string;
}

export function WhatsAppReceiptCta({ reference }: WhatsAppReceiptCtaProps) {
  const message = reference
    ? `Hola, envío comprobante de pago correspondiente a ${reference}.`
    : "Hola, envío comprobante de pago.";

  const href = `https://wa.me/52${businessPaymentConfig.contact.whatsapp}?text=${encodeURIComponent(message)}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enviar comprobante</CardTitle>
        <CardDescription>
          Después de transferir, envía captura o PDF por WhatsApp para aplicar el pago.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="primary" className="w-full md:w-auto">
          <a href={href} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            Enviar WhatsApp
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
