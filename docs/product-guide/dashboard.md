# Panel operativo

El personal operativo consulta prioridades e indicadores en `/admin`; no reemplaza el libro mayor ni la conciliación. El snapshot exige `requireOperationalRole`. Comenzar por el [recorrido](flows.md) y consultar [pagos](payments-and-receivables.md) para interpretar saldos.

## Lectura habitual

1. Revisar conteos de cotizaciones borrador/enviadas/aprobadas y órdenes asignadas/en curso.
2. Elegir período semanal, mensual o anual y leer órdenes completadas, importes de mano de obra/materiales y pagos capturados.
3. Consultar pendientes por cliente y estimación semanal de comisión; seguir al expediente/cobranza o nómina, no tomar el KPI como liquidación.

Fuentes de comportamiento: [queries](../../src/features/dashboard/queries.ts), [períodos](../../src/features/dashboard/period.ts) y [tipos](../../src/features/dashboard/types.ts). La página está en [panel protegido](../../src/app/admin/(protected)/page.tsx); localizar un dato en el snapshot no prueba un control adicional en UI.

## Reglas de interpretación

La cuenta por cobrar incluye órdenes completadas con cliente, aplicaciones vigentes y total efectivo del [acuerdo activo](payments-and-receivables.md#acuerdo-de-liquidación) cuando existe. No extrapolar ese conjunto a todas las ventas/notas o al estado de cuenta completo.

Los pagos KPI suman capturas por fecha de creación y estado `PAID`; esa query no añade filtro `reversedAt: null`, a diferencia de aplicaciones de cuentas pendientes. No equivalen a ingreso neto reconocido contablemente ni deben sumarse otra vez con aplicaciones. El KPI de materiales toma `MATERIAL`/`OTHER`, no todos los tipos de refacción. La estimación de nómina parte de completadas del rango y no confirma desembolso ni reemplaza el reporte con sus ajustes/avances. Ver [captura/aplicación](payments-and-receivables.md#captura-aplicación-y-saldo) y [nómina](customers-workers-payroll.md#nómina).

## Límites y conexiones

No es libro mayor completo, conciliación bancaria, estado fiscal ni utilidad. Acuerdos y revisiones son responsabilidad de [finanzas](payments-and-receivables.md#acuerdo-de-liquidación), no una segunda política del panel. Para mover el trabajo, ir a [órdenes](quotes-work-orders-notes.md); para acceso, a [usuarios](auth-and-user-management.md). Volver al [índice](index.md).
