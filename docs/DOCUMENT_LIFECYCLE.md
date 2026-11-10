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

## Contrato aditivo de filtros operativos

Los adaptadores de consulta y URL aceptan `operationalFilters: true`. Cotizaciones, Trabajos y Notas conectan sus controles de pantalla a los contratos operativos. `parseOperationalQuoteParams`/`quotesHref`, `parseWorkOrderParams`/`workOrdersHref` y `parseNotasParams`/`notasHref` conservan los criterios efectivos al paginar. Los campos ajenos a cada módulo no se propagan. Los accesos rápidos y controles futuros deben representar este mismo estado, no mantener filtros independientes.

| Criterio | Semántica de consulta |
|---|---|
| `number` | Referencia o folio, sin distinguir mayúsculas: cotización; OT y cotización en Trabajos; OT/nota y cotización en Notas. |
| `concept` | Título, descripción o descripción de conceptos de la cotización, incluidas sus secciones. |
| `customerId`, `plate`, `economicNumber` | Criterios combinables; placas/ECO consultan unidad vinculada o snapshot. No se exige unidad a una venta. |
| `dateFrom`, `dateTo` | Días inclusivos; fecha operativa de cotización en Cotizaciones/Trabajos, finalización WORK o emisión SALE en Notas. No son fechas de movimientos de cobro. |
| `scheduledFrom`, `scheduledTo` | Solo Trabajos: programación en America/Mexico_City, distinta de la fecha operativa. |
| `kind` | WORK/SALE en Cotizaciones y Notas; inactivo en Trabajos, que conserva solo WORK. |
| `execution`, `assignee` | Trabajos: PLANNED/ASSIGNED/IN_PROGRESS; responsable maestro o taller. En Notas el responsable solo está activo con `kind=WORK`. |
| `payment`, `overdue` | Notas: todos, pendientes (incluye parciales), parciales o pagadas; vencimiento separado. No cambia la pertenencia ni persiste estados nuevos. |
| `showArchived`, `showCancelled` | Inclusiones expresas e independientes en Cotizaciones/Notas; no aplican a la bandeja de ejecución activa. El estado comercial explícito y `hasWorkOrder` siguen disponibles en Cotizaciones. |

En Notas con `kind=all` o `SALE`, el contrato nuevo normaliza `assignee` a `all` y omite el responsable inactivo de la URL: **no elimina ventas para satisfacer un filtro de taller**. Los controles deshabilitan ese criterio, explican que es exclusivo de WORK y no lo muestran como aplicado si fue normalizado. Las llamadas anteriores sin opt-in conservan su comportamiento mientras se migra la pantalla.

Los límites finales se implementan como inicio del día siguiente exclusivo, no como 23:59:59 ni sumando 24 horas a instantes con cambio horario. Las fechas operativas almacenadas como DATE usan calendario UTC; programación/finalización/emisión usan medianoche local de Mexico City. Un rango invertido se rechaza; fechas inválidas se omiten. El rango explícito de Notas se combina con su periodo existente (intersección), sin modificar la semana lunes–sábado ni el mes. El periodo no representa toda la cartera.

Los predicados se aplican antes de agrupar cobros, calcular totales y ordenar/paginar el conjunto WORK/SALE. Los importes siguen siendo pagos acumulados de los documentos seleccionados, no «cobrado en periodo». La nueva `listPaginatedActiveWorkOrders` limita la hidratación a 20 registros más una fila de detección; `listActiveWorkOrders` conserva la interfaz anterior hasta la migración de sus consumidores. No se implementa aquí el destino de consulta histórica de #769.

## Filtros de Cotizaciones en pantalla

Cotizaciones combina referencia/folio, concepto, cliente, placas/ECO, tipo WORK/SALE, estado comercial, existencia de orden y fechas operativas inclusivas antes de paginar. Los accesos rápidos y el selector usan el mismo estado de URL; cambiar criterio reinicia la página, paginar conserva todos los criterios y «Limpiar» vuelve al alcance predeterminado. Archivo y cancelación son inclusiones independientes al consultar todos los estados; un estado específico conserva su alcance y las inclusiones no se anuncian como filtros aplicados en ese caso.

Un rango invertido se muestra con un mensaje y conserva sus campos para corregirlo: no se ejecuta una consulta sin fechas como sustituto ni se permite cambiar estado desde ese error; «Limpiar» sí restablece expresamente los criterios. La búsqueda histórica y el contexto de regreso de impresión/detalle no se implementan en este cambio. La comprobación de navegador usa el componente real con datos aislados en Vite; no demuestra autenticación ni el recorrido Next.js completo. El contexto de regreso A3 sigue pendiente.

## Filtros de Trabajos en pantalla

`WorkOrderFilters` representa el contrato `parseWorkOrderParams`/`workOrdersHref`: referencia/folio, concepto, cliente, placas/ECO, ejecución y responsable maestro/taller. No ofrece ventas, archivo ni cancelación en esta bandeja WORK activa. Los campos y el resumen se derivan del estado URL; enviar reinicia la página y «Limpiar» elimina expresamente todos los criterios.

Las fechas operativas de cotización y la programación en Ciudad de México tienen rangos separados, ambos inclusivos. Un rango invertido conserva los campos para corregirlos, muestra cuál de los dos rangos falló y no navega. La prueba de navegador usa el componente real en un fixture aislado, sin consultas ni mutaciones y sin demostrar autenticación Next.js. La página conecta estos controles con `listPaginatedActiveWorkOrders`: filtra antes de paginar, hidrata solo las cotizaciones únicas de la página devuelta y conserva todos los criterios en «Anterior»/«Siguiente». El contador muestra registros de esa página, no un total global. Una URL con cualquiera de los rangos invertidos abre corrección con sus fechas originales y demás criterios, sin consultar órdenes ni hidratar cotizaciones; no se presenta como resultado vacío. El vacío predeterminado reconoce órdenes pendientes aun sin maestro y el vacío filtrado ofrece limpiar criterios. El contexto de regreso A3 sigue pendiente.

## Filtros de Notas en pantalla

`NotasFilters` acepta `operationalState` obtenido de `parseNotasParams` con `operationalFilters: true`. Sin esa propiedad conserva los controles y URLs anteriores. El estado efectivo combina tipo, pago (incluidas parciales), morosidad y criterios comunes recibidos: periodo anterior/siguiente, Hoy, modo, ancla, tipo, pago y aplicación del diálogo los conservan, reiniciando la página. «Limpiar filtros» restablece todos los criterios a sus valores predeterminados y conserva modo/ancla del periodo, no toda la cartera.

El responsable está disponible solo en WORK: en todas/SALE se normaliza a `all`, se omite de la URL y del resumen, y se muestra deshabilitado con una explicación; no excluye ventas silenciosamente. WORK conserva maestro/taller y un identificador seleccionado que no esté en las opciones actuales. La búsqueda remota de cliente y la política de calendario no cambian. La página conecta el estado completo con `listCompletedWorkOrders(..., { operationalFilters: true })`: los criterios se aplican antes de totales, agrupación y paginación; los enlaces anterior/siguiente y `noteReturnTo` conservan el estado operativo completo y la página compatible. Cotizaciones e historiales de pago se limitan a las notas devueltas en esa página. Se conservan ambas entradas de creación directa, la lista, acciones y controles de rol existentes. No se implementan histórico, cuenta de ventas ni regreso A3, ni se presenta este fixture Vite como E2E autenticado Next.js.

El diálogo operativo ya incluye referencia/folio, concepto, placas/ECO, fechas de finalización WORK o emisión SALE inclusivas y archivo/cancelación independientes, junto al cliente remoto y filtros existentes. Los borradores se recuperan del estado URL al abrir; cancelar no aplica cambios y reabrir descarta el borrador anterior. El rango explícito intersecta el periodo de Notas, no consulta toda la cartera. Aplicar valida antes de cerrar: un rango invertido conserva los campos y demás borradores, mantiene el diálogo abierto con alerta visible y no navega; corregir permite aplicar y limpiar restablece deliberadamente todo el alcance predeterminado del periodo. Los controles sin opt-in no reciben estos campos nuevos.

Una URL con fechas de finalización/emisión invertidas abre directamente el diálogo con los valores originales y demás criterios normalizados; el estado sin fechas se usa solo para mostrar corrección, nunca como consulta alternativa. No se consultan notas ni sus historiales, ni se presentan tarjetas con ceros o un falso resultado vacío. El diálogo no se descarta y periodo, tipo, pago y enlaces no pueden quitar esas fechas silenciosamente: se debe corregir y aplicar o limpiar deliberadamente. Una nueva URL reinicia la corrección con sus propios valores.

La lista se identifica como notas WORK y SALE. «Cobrado acumulado de notas» muestra pagos acumulados de los documentos seleccionados; «Pendiente de notas seleccionadas» y «Vencido de notas seleccionadas» comparten ese alcance de periodo/filtros, no toda la cartera ni movimientos de cobro del periodo. No se modifican cálculos de pago, ledger, archivo/deuda ni la política del periodo. El guard de regreso A3 sigue sin ampliarse: aunque `noteReturnTo` conserva los criterios nuevos, no se da por terminado el recorrido detalle/regreso. La prueba de página usa límites simulados y Vite prueba controles reales; ninguna es E2E autenticada Next.js.

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

## Suma de totales de Notas

Los acumulados SQL de WORK y SALE se convierten **por separado** de `Prisma.Decimal` a centavos numéricos antes de sumarse. Convertir después de `+` concatena texto y puede inflar pendiente, vencido y cobrado; el formato monetario divide entre 100 una sola vez. Cada ventana se cuenta una vez por tipo, incluso al paginar. Esta corrección no modifica los importes almacenados, las consultas SQL, los filtros, los acuerdos ni las aplicaciones de pago.
