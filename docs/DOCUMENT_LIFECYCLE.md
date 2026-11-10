# Cotizaciones, órdenes de trabajo y notas emitidas

**El vencimiento de pago corresponde a una nota emitida, no a una cotización ni a una OT activa.** El nombre visual «Nota» no demuestra emisión financiera. Este documento describe el código actual; no reemplaza los planes históricos del README por funciones que todavía no existen.

## Recorrido rápido

- **Taller:** cotización → autorización → OT planificada/asignada/en proceso → trabajo finalizado → nota WORK emitida.
- **Venta:** cotización de materiales/refacciones → conversión a nota SALE emitida, sin crear una OT.
- **Captura directa:** permite registrar trabajo o venta sin recorrer previamente la pantalla de cotizaciones. Sigue usando los modelos correspondientes; no representa otro sistema de cobro.

Finalizar trabajo o emitir una venta no significa que esté pagada. Operación, saldo, factura y caducidad del enlace son ejes distintos.

## Pertenencia a bandejas operativas

Cada operación tiene una bandeja principal; el estado de pago no decide esa pertenencia.

| Bandeja | Pertenencia predeterminada |
|---|---|
| Cotizaciones | `DRAFT`, `SENT` o `APPROVED`, WORK o SALE, sin OT `PLANNED`/`ASSIGNED`/`IN_PROGRESS`/`COMPLETED` ni nota SALE `ISSUED`. Una nota DRAFT no demuestra emisión. |
| Trabajos | OT `PLANNED` (pendiente de asignación), `ASSIGNED` o `IN_PROGRESS`, de operación WORK no eliminada, rechazada, cancelada ni archivada. Nunca ventas. |
| Notas | WORK `COMPLETED` con nota `ISSUED` o sin fila financiera histórica, y SALE `ISSUED`. Fuera por defecto: notas DRAFT/CANCELLED y cotizaciones eliminadas, rechazadas, canceladas o archivadas. |

Aprobar sin generar OT mantiene la cotización; generar OT la lleva a Trabajos aun sin responsable; finalizar o convertir directamente a WORK terminado la lleva a Notas. Emitir SALE la lleva directamente a Notas sin OT. Cancelar una OT mediante el regreso comercial permitido permite volver a Cotizaciones si su estado comercial vuelve a ser operativo; no se modifican esas validaciones.

Las consultas comerciales explícitas conservan `status`, `showCancelled` y `showArchived`; la consulta administrativa `listWorkOrders` conserva todos los estados. Para Notas, `listCompletedWorkOrders` acepta `showArchived` y `showCancelled` independientes y opcionales: el primero incluye cotizaciones archivadas; el segundo incluye cotizaciones canceladas y notas CANCELLED dentro del periodo de finalización/emisión existente. Ninguno admite notas DRAFT ni cambia importes, pagos, deuda o fechas. Estos parámetros de consulta no agregan controles de pantalla.

Liquidar no cambia la bandeja. Archivar no liquida: las consultas de pendientes de cobro conservan su alcance independiente del periodo y del archivo de la bandeja Notas. No se cambian ledger, permisos ni acciones de transición.

## Suma de totales de Notas

Los acumulados SQL de WORK y SALE se convierten **por separado** de `Prisma.Decimal` a centavos numéricos antes de sumarse. Convertir después de `+` concatena texto y puede inflar pendiente, vencido y cobrado; el formato monetario divide entre 100 una sola vez. Esta corrección no modifica los importes almacenados, las consultas SQL, los filtros, los acuerdos ni las aplicaciones de pago.

## Filtros comunes y cotizaciones (contrato aditivo)

El contrato nuevo se activa con `operationalFilters: true`; las pantallas todavía no lo usan. `parseOperationalQuoteParams` y `quotesHref` conservan referencia/folio, concepto, cliente, placas/ECO, fecha operativa, tipo WORK/SALE, estado comercial, `hasWorkOrder`, inclusiones de archivo/cancelación y página. Los criterios combinados se aplican antes de paginar; unidad vinculada y snapshot son fuentes alternativas para placas/ECO.

Las fechas de URL son días inclusivos; las consultas usan inicio del día siguiente exclusivo. El modelo común distingue calendario DATE de instantes de Mexico City y evita sumar 24 horas al atravesar cambios horarios. Las fechas inválidas se omiten y los rangos invertidos se rechazan. La página operativa comparte normalización entre URL y consulta; las llamadas sin opt-in conservan su esquema y coerción anteriores.

Los controles futuros deben reflejar un único estado efectivo. Este paso prepara contratos y consultas, no agrega pantallas ni el destino histórico de #769. Los adaptadores de Trabajos y Notas se integran en la siguiente entrega de la cadena.

## Qué representa cada modelo

| Modelo | Responsabilidad real |
|---|---|
| `Quote` | Alcance comercial: cliente/unidad y snapshots, conceptos/secciones, importes, autorización y operación `WORK` o `SALE`. Estados: `DRAFT`, `SENT`, `APPROVED`, `REJECTED`, `CANCELLED`, `ARCHIVED`. |
| `WorkOrder` (OT) | Ejecución del taller, asignaciones y cierre. Estados: `PLANNED`, `ASSIGNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`. Conserva su propia fecha de pago nullable. No existe para una venta SALE. |
| `PayableNote` | Documento financiero vinculado a cotización y, para WORK, a la OT. Tipos `WORK`/`SALE`; estados `DRAFT`/`ISSUED`/`CANCELLED`. La planificación/asignación puede crear una nota DRAFT: su existencia no demuestra emisión. |
| `SharedQuote` | Acceso por token al documento compartido; guarda expiración y revocación, no el vencimiento de la deuda. |
| `PaymentRequest` | Solicitud/instrucciones de cobro con importe, preferencia fiscal y expiración propias. No sustituye a la nota ni confirma un pago. |
| Pagos y aplicaciones | Registran cobros y su aplicación. El saldo, ajustes y estado de cuenta se calculan en el dominio financiero, no desde una etiqueta de la cotización. |

Fuente estructural: [schema.prisma](../prisma/schema.prisma). La etiqueta OT significa orden de trabajo; no se asigna un significado nuevo al término «it».

## Emisión y fechas visibles

El contrato de lectura compartido es [resolveDocumentDates](../src/features/quotes/lib/document-dates.ts). No calcula fechas nuevas ni modifica datos.

| Situación | ¿Vencimiento visible? | Fecha leída |
|---|---|---|
| Cotización, incluso enviada o autorizada sin nota emitida | No | Ninguna, aunque exista una fecha histórica almacenada. |
| OT planificada, asignada o en proceso | No | El rótulo de servicio «Nota» no habilita una obligación emitida. |
| WORK finalizado, con nota ISSUED | Solo si existe fecha | OT → nota financiera → fecha histórica de cotización. La fecha existente de OT conserva prioridad. |
| WORK histórico COMPLETED sin fila PayableNote | Solo si existe fecha | OT → cotización; no se inventa ni migra una nota histórica. |
| SALE con nota ISSUED | Solo si existe fecha | Fecha de PayableNote; un null se conserva, sin rellenarlo desde la cotización. |
| Nota explícitamente DRAFT o CANCELLED | No | No se presenta como emisión de pago. |

La resolución se comparte entre tarjeta de cotización, preview interno, documento público e impresión. Los adaptadores deben transportar estado de emisión y fechas de sus propietarios, no solo `Quote.paymentDueDate`.

[resolveDocumentPresentation](../src/features/quotes/lib/document-resolver.ts) conserva la presentación histórica «Nota» para OT ASSIGNED/IN_PROGRESS/COMPLETED. Eso es independiente del contrato de emisión; no cambia folios ni convierte una OT activa en cuenta por cobrar.

## Defaults de escritura existentes — sin cambios

| Camino | Regla actual |
|---|---|
| Cierre normal de WORK | Fecha de OT → fecha de cotización → cierre + 7 días calendario en America/Mexico_City. |
| Trabajo directo finalizado | Fecha explícita → cierre + 7 días calendario. |
| Trabajo directo sin finalizar | Fecha explícita o null; no se expone como vencimiento emitido mientras siga activo. |
| Conversión de cotización a SALE | Fecha explícita → fecha de cotización → emisión + 7 días calendario. |
| SALE directa | Fecha explícita o null. No se normaliza al default de la venta convertida. |
| Conversión directa a WORK finalizado | Fecha explícita → OT existente si corresponde → cotización → cierre + 7 días calendario. |

Las transacciones de [work-orders/actions.ts](../src/features/work-orders/actions.ts) escriben estos valores. El default calendario vive en [receivables-policy.ts](../src/features/work-orders/receivables-policy.ts). La lectura documental no vuelve a ejecutar esos defaults. No se borran fechas al ocultarlas, ni se cambian aging, ledger, impuestos, descuentos o saldos.

## Cuatro conceptos de vigencia que no deben confundirse

| Campo | Significado | Default actual |
|---|---|---|
| `Quote.validUntil` | Vigencia comercial de precios | 7 días desde la referencia de creación; [calculate.ts](../src/features/quotes/lib/calculate.ts). |
| `paymentDueDate` | Vencimiento de pago de una nota emitida | Depende del camino anterior; puede ser null. |
| `SharedQuote.expiresAt` | Caducidad del acceso compartido | Límite de 30 días desde creación; una expiración almacenada anterior también se respeta. Revocación y disponibilidad se validan aparte en [quotes/domain.ts](../src/features/quotes/domain.ts). |
| `PaymentRequest.expiresAt` | Caducidad de instrucciones de cobro | 7 días; [payment-requests/domain.ts](../src/features/payment-requests/domain.ts). No cambia la fecha de la nota. |

## Vista previa y comprobación

El diálogo interno conserva tres grupos: **cliente/unidad**, **conceptos** (cantidades, precio unitario e importe) y **totales** (subtotal, descuento cuando existe, IVA y total). Quitar marcos redundantes no elimina observaciones, selección por secciones, impresión ni acciones del flujo. El modo visual mínimo se limita al preview interno; la presentación pública e impresa conserva sus estilos.

Pruebas del contrato: `document-dates.test.ts`, `quote-mobile-card.test.tsx`, `quote-preview-dialog.test.tsx`, `quote-document-view.test.tsx` y la ruta `notas/[id]/print/page.test.tsx`. Las pruebas financieras existentes siguen siendo la autoridad para cálculos; este cambio no modifica esas reglas.
