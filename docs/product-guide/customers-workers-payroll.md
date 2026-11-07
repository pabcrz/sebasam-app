# Clientes, trabajadores y nómina

El personal mantiene expedientes, clasifica equipo y calcula nómina; no es autoservicio laboral ni integración externa de pagos. Seguir [recorridos](flows.md#nómina-y-consulta) y consultar [usuarios](auth-and-user-management.md) para acceso.

## Clientes

El expediente incluye nombre comercial/legal, contacto, dirección, estado y notas. Contactos asociados pueden ser conductor, contacto o facturación; se relacionan vehículos, cotizaciones, perfiles fiscales, solicitudes, pagos y movimientos de cuenta. La búsqueda desde cotización considera identidad/contacto, vehículos, contactos y perfiles fiscales.

Al reutilizar cliente se compara nombre normalizado/correo y teléfono mexicano normalizado. La búsqueda por teléfono recorre candidatos hasta contar con campo canónico indexado: no prometer búsqueda indexada por ese dato. No se permite borrar cliente con cotizaciones, pagos, solicitudes o movimientos financieros. Fuentes: [acciones](../../src/features/customers/actions.ts), [queries](../../src/features/customers/queries.ts), [schema](../../prisma/schema.prisma). Continuar con [vehículos](vehicles-and-public-experience.md#vehículos) y [cuenta/cobranza](payments-and-receivables.md).

## Equipo

Trabajador es `UserProfile` de rol `WORKER` y clase `MASTER`/`HELPER`, con configuración de pago fijo semanal/diario cuando corresponde. Lo administra personal operativo; asignar exige activos y clase compatible. La ficha de `/admin/workers` no crea credenciales Auth. Los roles operativos son `SUPER_ADMIN`, `ADMIN`, `ADMIN_ASSISTANT`; no inferir portal propio del trabajador. Fuentes: [trabajadores](../../src/features/workers/actions.ts), [asignación](../../src/features/work-orders/actions.ts), [guards](../../src/lib/auth/session.ts).

## Nómina

La comisión evalúa `LABOR` y `OTHER` marcado para nómina. Base predeterminada: total al cliente salvo base personalizada. Porcentajes predeterminados: 50% mano de obra general, 40% soldadura/soplete/oxicorte; `OTHER` comisionable usa 40%. Redondea centavos. Base/porcentaje/comisión no prueban pago. Fuente: [dominio de nómina](../../src/features/payroll/domain.ts).

La nómina fija de ayudante considera tarifa semanal, deducción diaria por ausencias limitada a la tarifa semanal y comisión manual. Ajustar concepto exige mano de obra u otro comisionable, base no mayor al cobro al cliente y ausencia de avances que bloqueen configuración. Fuentes: [acciones](../../src/features/payroll/actions.ts), [pruebas de dominio](../../src/features/payroll/domain.test.ts).

El reporte toma órdenes completadas del período, agrupa por maestro/asignación, especial o sin asignación e incluye avances del período. Cierre/reapertura de semanas tienen controles propios; no deducir que imprimir firmas/sobres confirma transferencia o desembolso. Fuentes: [queries](../../src/features/payroll/queries.ts), [control semanal](../../src/features/payroll/week-control.ts). Las rutas disponibles están en [arquitectura](../ARCHITECTURE.md#hosting-y-modelo-de-rutas); una acción no implica un botón.

### Avances durante trabajo activo

Registrar avance exige rol operativo, semana abierta, orden no especial `ASSIGNED`/`IN_PROGRESS`, maestro asignado y concepto comisionable de esa cotización. La base adelantada es entero positivo, no puede exceder base pendiente y solo hay un avance por concepto/semana. El registro guarda comisión calculada, tasa, maestro y actor, y bloquea configuración de nómina del concepto. Fuente: [acciones de avances](../../src/features/work-orders/actions/advances.ts) y [pruebas](../../src/features/work-orders/actions/advances.test.ts).

El cálculo al cierre resta bases ya adelantadas antes de calcular comisión restante, para no volver a computarlas. Los avances del período entran por separado en el reporte. Eliminar un avance exige semana abierta; al eliminar el último se libera el bloqueo de configuración. Esto describe registro/cálculo, **no una transferencia al trabajador ni cobro al cliente**. El bloqueo de configuración por avances no equivale a un bloqueo universal del rollback de orden; ver el [límite observado](quotes-work-orders-notes.md#de-cotización-a-trabajo).

### Regla objetivo conservada

| ID | Regla | Detalle |
|---|---|---|
| R11 | Nómina semanal | La ejecución registrada alimenta el cálculo de nómina semanal. |

**Contraste observado:** el reporte actual usa órdenes completadas/conceptos y avances; R11 no prueba una UI de ejecución detallada ni que esos registros sean su único insumo. Ver [órdenes](quotes-work-orders-notes.md#de-cotización-a-trabajo).

## Límites y conexiones

No se verificó integración con sistema externo de nómina. La distribución exacta por trabajador debe cotejarse con funciones/pruebas antes de extrapolar. [Panel](dashboard.md) muestra estimaciones; [asistente](completed-work-and-assistant.md) distingue comisión generada de dinero recibido. Volver al [índice](index.md).
