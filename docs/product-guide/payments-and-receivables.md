# Pagos y cuentas por cobrar

## Captura, aplicación y saldo

Un `Payment` captura un importe positivo en centavos y método. La operación usa clave idempotente y se ejecuta transaccionalmente. La captura crea movimiento `PAYMENT_CAPTURE`; para una nota emitida de trabajo completado, aplica hasta el saldo pendiente con `PaymentApplication`/`PAYMENT_APPLICATION`. El excedente permanece como crédito disponible del cliente, no aumenta lo aplicado a esa nota. Referencias: `recordPayment`, `recordCashPayment`, `getCustomerCreditSummary` en `src/features/payments/domain.ts`; `recordPayableNotePayment` en `src/features/payable-notes/domain.ts`.

La acción específica de pagos en notas de trabajo solo admite órdenes completadas y efectivo o transferencia (`recordPaymentAction`). La acción de nota pagable registra pagos en notas emitidas; el dominio general enumera otros métodos, pero no asumir que todas las superficies los habilitan. Referencias: `src/features/payments/actions.ts`, `prisma/schema.prisma`.

El saldo de nota se deriva de aplicaciones vigentes contra cargos; pagos capturados, pagos aplicados y crédito disponible son cantidades distintas. Una nota asociada a orden calcula total efectivo usando el acuerdo de liquidación activo cuando existe. Referencias: `getPayableNoteReadModel` en `src/features/payable-notes/domain.ts`; `getCustomerBalanceSummary` en `src/features/payments/domain.ts`.

## Crédito, reversas y correcciones

El crédito de cliente puede aplicarse a una nota de trabajo usando una operación idempotente. La reversa no borra el historial: marca pago/aplicación revertidos y registra movimientos inversos. La corrección de pago crea reemplazo y reasigna aplicaciones conforme a saldos disponibles; registra razón/actor y posibles faltantes. Referencias: `applyCustomerCredit`, `reversePaymentCapture`, `correctPayment` en `src/features/payments/domain.ts`; acciones en `src/features/payments/actions.ts`; modelos `PaymentCorrection*`, `LedgerEntry`.

Una corrección comercial de nota completada (o venta emitida) puede reconciliar aplicaciones, generar crédito liberado, cancelar solicitudes de pago activas si cambia el total y auditar la corrección; no se permite trasladar a otro cliente cuando ya hay pagos aplicados. Referencia: `correctCompletedWorkQuote` en `src/features/quotes/actions.ts`.

## Solicitudes de pago

`PaymentRequest` es un enlace tokenizado a instrucciones e importe contextual, **no** es pago ni comprobante de liquidación. Solicitudes activas expiran a los siete días; se registran como vistas al abrir. Se captura preferencia de factura y, cuando aplica, datos fiscales en snapshot además de actualizar/reutilizar perfil fiscal del cliente. Los totales guardados se reconcilian contra el cargo vigente. Referencias: `src/features/payment-requests/domain.ts`, `src/features/payment-requests/actions.ts`, `/datos-de-pago/[token]`.

El personal puede crear o reutilizar solicitudes para cotización/orden. Una solicitud activa duplicada no se crea por la operación de creación directa; `getOrCreate` puede devolver una existente. La liquidación sigue siendo proceso interno; una página/instrucción pública no acredita por sí sola el pago. Referencias: `createPaymentRequestForQuote`, `createPaymentRequestForWorkOrder`, `getPaymentRequestByToken`.

## Restricciones

- Los movimientos se conservan para trazabilidad; cancelar la orden con actividad financiera se bloquea.
- Factura, pago y saldo son conceptos distintos; el estado de cotización no prueba pago.
- El flujo exacto de conciliación bancaria o validación de comprobantes no se verificó como automatizado: trátese como operación interna pendiente de validar.
- Referencias principales: `src/features/payments/domain.ts`, `src/features/payable-notes/domain.ts`, `src/features/payment-requests/domain.ts`, esquema Prisma.
