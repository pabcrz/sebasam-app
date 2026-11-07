# Panel operativo y acuerdos de liquidación

## Panel: indicadores, no contabilidad integral

El snapshot del panel exige `requireOperationalRole`. Muestra conteos de cotizaciones borrador/enviadas/aprobadas y órdenes asignadas/en curso; KPI por semana, mes y año con órdenes completadas, importes de conceptos de mano de obra/materiales y pagos capturados; agrega cuentas pendientes por cliente y estimación de comisión semanal. Referencia: `src/features/dashboard/queries.ts`, `src/features/dashboard/period.ts`, `src/features/dashboard/types.ts`.

La cuenta por cobrar incluye órdenes completadas con cliente, usa aplicaciones de pago vigentes y el total efectivo del acuerdo activo si existe. Los pagos KPI se suman por fecha de creación y estado pagado; no equivalen a ingresos reconocidos contablemente. La estimación de nómina se calcula desde órdenes completadas del rango; no confirma desembolso. El panel no es libro mayor completo, conciliación bancaria, estado fiscal ni utilidad. Referencia: `getOperationalDashboardSnapshot`.

## Acuerdo de liquidación

Solo `ADMIN`/`SUPER_ADMIN` pueden guardar o cancelar acuerdos mediante las acciones disponibles. Para guardar exige motivo, cotización desbloqueada y `APPROVED`, validación comercial y base positiva en centavos. La base/totales nominales deben ser válidos y el total liquidable no puede exceder total nominal. Con IVA, impuesto proporcional a la base respecto del subtotal nominal; sin IVA, impuesto cero. Referencias: `src/features/settlement-agreements/actions.ts`, `src/features/settlement-agreements/domain.ts`.

Guardar crea/actualiza un único acuerdo por cotización, lo deja `ACTIVE`, agrega revisión numerada con actor y motivo y cancela solicitudes de pago activas. Cancelar requiere motivo; si ya está cancelado devuelve el acuerdo sin otro cambio; si no, marca cancelación/actor/fecha y también invalida solicitudes activas. Los totales efectivos usan el acuerdo solo mientras esté activo; en otro caso vuelven al cálculo comercial. Referencias: `upsertSettlementAgreement`, `cancelSettlementAgreement`, `getEffectiveSettlementTotals`.

Una corrección comercial posterior de nota que cambie el total puede cancelar automáticamente el acuerdo activo, registrar revisión y anular solicitudes. No confundir esto con anular/revertir un pago. Referencia: `correctCompletedWorkQuote` en `src/features/quotes/actions.ts`.

## Límites

No se verificó aplicación de acuerdo a ventas directas de materiales, ni un flujo de aprobación adicional distinto del guard administrativo y registro de actor/motivo. No tratar total convenido como cobro realizado.
