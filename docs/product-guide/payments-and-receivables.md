# Pagos y cuentas por cobrar

El personal administra cobros, preferencia fiscal, acuerdos y saldo del cliente. Una [nota emitida](quotes-work-orders-notes.md#notas-y-venta-directa) habilita cobranza; ni el cierre ni un comprobante público aplican dinero automáticamente. Seguir el [recorrido financiero](flows.md#cobranza-independiente).

## Captura, aplicación y saldo

**Hecho observado:** `Payment` captura importe positivo en centavos y método, con clave idempotente y transacción. La captura crea `PAYMENT_CAPTURE`; para nota emitida de trabajo completado aplica hasta el saldo pendiente con `PaymentApplication`/`PAYMENT_APPLICATION`. El excedente queda como crédito disponible del cliente, no aumenta lo aplicado a esa nota. Ver [pagos](../../src/features/payments/domain.ts) y [notas](../../src/features/payable-notes/domain.ts).

`recordPaymentAction` exige admin, orden completada y efectivo o transferencia. `recordPayableNotePaymentAction` también exige admin y registra contra nota emitida; admite métodos del enum (con fallback a efectivo ante método no reconocido). No trasladar la restricción de una entrada a todas ni asumir que todas las pantallas ofrecen tarjetas. Fuentes: [acciones](../../src/features/payments/actions.ts), [schema](../../prisma/schema.prisma).

El saldo deriva de cargos y aplicaciones vigentes de pagos válidos, no de sumar capturas. La nota asociada a orden usa total efectivo del acuerdo activo si existe; la venta usa su total de nota en ese read model. Capturado, aplicado y crédito disponible son magnitudes distintas; no sumar captura y aplicación como dos ingresos. Fuentes: `getPayableNoteReadModel` en [notas](../../src/features/payable-notes/domain.ts), resúmenes en [pagos](../../src/features/payments/domain.ts) y [pruebas](../../src/features/payments/domain.test.ts).

## Crédito, reversas y correcciones

El crédito se puede aplicar idempotentemente a nota de trabajo con saldo y cliente compatibles. Reversa conserva historial: marca captura/aplicaciones revertidas y crea movimientos inversos. Corregir pago crea reemplazo, reasigna aplicaciones según saldo disponible y registra razón, actor y posibles faltantes. Los procesos de notas pagables y de trabajo tienen entradas distintas; no asumir idéntico alcance por compartir nombres. Ver [dominio de pagos](../../src/features/payments/domain.ts), [corrección de nota pagable](../../src/features/payable-notes/domain.ts) y [acciones](../../src/features/payments/actions.ts).

La corrección comercial de trabajo completado o venta emitida puede reconciliar aplicaciones, liberar crédito, invalidar solicitudes si cambia total y auditar. No permite cambiar cliente si hay pagos aplicados. Puede cancelar acuerdo activo cuando cambia total; **no es reversa de pago**. Fuente: `correctCompletedWorkQuote` en [acciones de cotización](../../src/features/quotes/actions.ts).

## Acuerdo de liquidación

Solo `ADMIN`/`SUPER_ADMIN` mediante [acciones](../../src/features/settlement-agreements/actions.ts). Guardar requiere motivo, actor, cotización desbloqueada `APPROVED`, validez comercial y base positiva en centavos enteros seguros. Totales nominales deben ser válidos y el liquidable no exceder el nominal. Con IVA, impuesto proporcional a la base respecto del subtotal nominal; sin IVA, cero.

Guardar crea/actualiza un único acuerdo por cotización en `ACTIVE`, añade revisión numerada con actor/motivo y cancela solicitudes activas. Cancelar exige motivo, registra actor/fecha/razón e invalida solicitudes; ya cancelado devuelve el acuerdo sin otro cambio. Los totales efectivos toman el acuerdo solo mientras esté activo, en otro caso vuelven al cálculo comercial. Fuentes: [dominio](../../src/features/settlement-agreements/domain.ts) y [pruebas](../../src/features/settlement-agreements/domain.test.ts).

Una corrección comercial que cambia total puede cancelar automáticamente acuerdo activo con revisión e invalidar instrucciones. No se verificó aplicación de acuerdos a ventas directas ni aprobación adicional fuera del guard y auditoría. El total convenido no es dinero cobrado; el [panel](dashboard.md) lo usa donde corresponde para cuentas pendientes.

## Solicitudes de pago y configuración

`PaymentRequest` es un enlace a instrucciones e importe contextual, **no pago, ledger ni comprobante de liquidación**. Vigencia predeterminada siete días; abrir registra vista desde `PENDING`, rechaza cancelada/expirada y reconcilia totales guardados contra cargo/acuerdo vigente. El personal puede crear para cotización/orden o reutilizar para cotización; crear directamente rechaza duplicado activo mientras `getOrCreate` puede devolver existente. Fuentes: [dominio](../../src/features/payment-requests/domain.ts), [acciones](../../src/features/payment-requests/actions.ts).

Preferencia de factura y datos fiscales se capturan/reutilizan con `CustomerFiscalProfile` y snapshot cuando aplica. **Caveat de autorización:** existen acciones tokenizadas de cambiar preferencia/guardar datos sin `requireOperationalRole`; eso no prueba formulario público ni constituye el objetivo fiscal interno R16. Crear/cancelar solicitudes sí comprueba rol operativo. Resolver diferencias mediante issue, no mediante esta guía.

La configuración incluye identidad del taller, horario, servicios/productos y cuentas. La página contextual filtra cuentas por `isForInvoicing` igual a preferencia fiscal; **no usa el mismo filtro que el enlace independiente de cuenta**, que exige compartir habilitado y datos mínimos. No afirmar que `isPubliclyShareable` gobierna ambas superficies. Ver [configuración](../../src/features/payment-settings/domain.ts), [página contextual](../../src/app/datos-de-pago/[token]/page.tsx) y [presentación pública](vehicles-and-public-experience.md#páginas-públicas-de-pago).

## Contrato de cobro y facturación

**Objetivo conservado**, no promesa de que todas las interacciones estén completas. El subtotal general incluye refacciones, mano de obra y servicios. Sin factura, `total pagable = subtotal`; con factura, `subtotal + IVA`. El personal reutiliza/captura datos fiscales y preserva snapshot cuando aplica. Los descuentos y acuerdos observados se resuelven mediante cálculo vigente, no reimplementando esta fórmula nominal fuera de sus helpers.

El efectivo no exige link ni cuentas: permite total o abono parcial. Transferencia puede usar solicitud con importe decidido y cuenta compatible con preferencia fiscal. Todo parcial deja saldo en cuenta/ledger e indicador financiero separado de `QuoteStatus`. El cliente puede solicitar cambio de factura hasta liquidación final; el objetivo exige ejecución interna con recálculo controlado de IVA/total, confirmación auditada y actualización de instrucciones. **No es un toggle público silencioso** ni se afirma que cada acción aislada cumpla ese circuito completo.

| Concepto | Ejemplos objetivo (no enums garantizados) |
|---|---|
| Método de pago | `CASH`, `TRANSFER`, `OTHER` |
| Estado de pago | `PENDING`, `PARTIAL`, `PAID` |
| Estado de factura | `NOT_REQUESTED`, `DATA_MISSING`, `READY`, `ISSUED` |
| Saldo pendiente | `total pagable - pagos aplicados` |

`Payment` y `LedgerEntry` ya existen; `PARTIAL` y labels de factura no se asumen estados persistidos. Consultar [enums técnicos](../ARCHITECTURE.md#modelo-y-estados-no-confundir-producto-con-enums).

### Reglas objetivo conservadas

| ID | Regla | Detalle |
|---|---|---|
| R9 | Cobros, ajustes y adeudo | Objetivo: registrar cada pago con método y monto; un pago parcial conserva el saldo pendiente. |
| R10 | Ledger del cliente | Objetivo: cada pago, ajuste o adeudo impacta el estado de cuenta del cliente. |
| R14 | Subtotal y total pagable | Un subtotal general suma refacciones, mano de obra y servicios. Sin factura, `total pagable = subtotal`; con factura, `total pagable = subtotal + IVA`. |
| R15 | Conceptos financieros separados | Preferencia de factura, método de pago, estado de pago, estado de factura y saldo pendiente son conceptos independientes entre sí y del estado operativo. Facturada no significa pagada. |
| R16 | Responsabilidad fiscal interna | En el MVP, el personal define la preferencia de factura y captura o reutiliza `CustomerFiscalProfile`; el cliente no elige factura ni llena datos fiscales en la página pública. |
| R18 | Instrucciones públicas para transferencia | El link `/datos-de-pago/[token]` es opcional y exclusivo para transferencia: comunica un importe ya decidido, solo las cuentas elegibles y el contacto o envío de comprobante. No incluye selector de factura ni formulario fiscal. |

## Límites y siguiente paso

Se conserva trazabilidad; [rollback de orden](quotes-work-orders-notes.md#de-cotización-a-trabajo) se bloquea con actividad financiera. No se verificó conciliación bancaria automática, validación automática de comprobantes ni cobertura fiscal integral. Para estado de cuenta consultar [cliente](customers-workers-payroll.md#clientes); para interpretar indicadores, [panel](dashboard.md). La impresión no prueba liquidación.
