# Clientes, trabajadores y nómina

## Clientes

El expediente incluye nombres comercial/legal, contacto, dirección, estado, notas; contactos asociados pueden tener rol conductor, contacto o facturación; se relacionan vehículos, cotizaciones, perfiles fiscales, solicitudes, pagos y movimientos de cuenta. La búsqueda desde cotización considera identidad/contacto, vehículos, contactos y perfiles fiscales. Para reutilización al crear cotización se compara nombre normalizado y correo, además de teléfono mexicano normalizado; el propio código señala que la búsqueda por teléfono recorre candidatos hasta disponer de un campo canónico indexado. Referencias: `src/features/customers/actions.ts`, `src/features/customers/queries.ts`, esquema.

No se permite borrar cliente con cotizaciones, pagos, solicitudes o movimientos financieros. Referencia: `deleteCustomerAuthorized`.

## Equipo

Trabajador es un `UserProfile` de rol `WORKER` con clase `MASTER` o `HELPER` y puede configurarse pago fijo semanal/diario. Los registros los administra personal operativo; la clasificación de trabajador no equivale a rol de acceso de admin. Asignación exige trabajadores activos y clases compatibles. Referencias: `src/features/workers/actions.ts`, `src/features/work-orders/actions.ts`, `src/lib/auth/session.ts`.

El código de autenticación permite roles operativos `SUPER_ADMIN`, `ADMIN`, `ADMIN_ASSISTANT`; los trabajadores no disponen de autoservicio comprobado. No inferir acceso propio de trabajador a partir de su ficha.

## Nómina

La lógica calcula comisión de conceptos `LABOR` y `OTHER` marcado para nómina. Base predeterminada: total al cliente salvo base personalizada; porcentaje predeterminado 50% mano de obra general y 40% soldadura/soplete/oxicorte; `OTHER` comisionable usa 40% predeterminado. La comisión es cálculo de nómina, no prueba de pago. Referencia: `evaluatePayrollItem`, `detectLaborCategory`, `computeCommissionCents` en `src/features/payroll/domain.ts`.

La nómina fija de ayudante puede considerar tarifa semanal, deducción diaria por ausencias y comisión manual. El ajuste por concepto se bloquea si ya tiene avances y solo admite mano de obra u otros conceptos comisionables; la base no puede exceder cobro al cliente. Referencias: `src/features/payroll/actions.ts`, `calculateFixedPayHelperPayroll`.

El reporte cubre órdenes completadas del período, agrupa por maestro/asignación, especial o sin asignación, e incluye avances. Las semanas tienen controles de estado y acciones de cierre/reapertura; revisar `src/features/payroll/queries.ts` y `src/features/payroll/week-control.ts` para reglas completas. La existencia de impresión no implica constancia de transferencia o pago.

## Límites

Las comisiones calculadas, bases y avances no son automáticamente dinero pagado. Ajustes y nómina son datos operativos; no se verificó integración con sistema externo de nómina. Las políticas exactas de cálculo por distribución entre trabajadores deben comprobarse en las funciones actuales y sus pruebas antes de extrapolar.
