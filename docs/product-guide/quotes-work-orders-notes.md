# Cotizaciones, órdenes de trabajo y notas

## Cotización: propuesta y decisión

Las cotizaciones se guardan como `Quote`, con secciones y conceptos (`QuoteSection`, `QuoteItem`), cliente/contacto/unidad y snapshots. La creación valida datos, calcula importes y persiste cotización y conceptos en transacción. El estado inicial es `DRAFT`; la vigencia predeterminada es de siete días. Referencias: `src/features/quotes/actions.ts` (`createQuoteAuthorized`, `updateDraftQuote`), `src/features/quotes/lib/calculate.ts`, `prisma/schema.prisma`.

Para compartir, la acción de publicar valida el contenido comercial y pasa de borrador a `SENT`; el enlace usa token revocable con expiración máxima de 30 días. La decisión pública no requiere sesión: el token autoriza acceso a esa cotización. El cliente puede aceptar o declinar solo una cotización en borrador/enviada; se registra origen `CUSTOMER`. Referencias: `publishSharedQuote`, `acceptSharedQuoteAction`, `declineSharedQuoteAction` en `src/features/quotes/actions.ts`; `src/features/quotes/domain.ts`; `app/cotizacion/[token]/page.tsx`.

El personal también puede registrar una autorización con nota obligatoria. Al aceptar se marca `APPROVED`; si no se indica una lista de secciones, se autorizan todas. Si se indica, se marcan solo las identificadas. **Importante:** el estado general aprobado y el indicador `QuoteSection.isAuthorized` son datos diferentes; una autorización parcial no crea cotizaciones separadas. Las decisiones guardan actor, canal, nota e IDs autorizados cuando aplica. Referencias: `authorizeQuote`, `acceptSharedQuote`, `QuoteDecision` en `src/features/quotes/domain.ts` y `prisma/schema.prisma`.

Rechazo cambia el estado general a `REJECTED`. Las correcciones administrativas de decisión solo permiten estados aprobada/rechazada, y no cotizaciones con orden asociada. Referencias: `correctQuoteDecision`, `declineSharedQuote`.

## De cotización a trabajo

Una orden (`WorkOrder`) está vinculada de forma única a una cotización de tipo trabajo. El flujo comprobado crea/obtiene orden y nota pagable borrador, registra aceptación o motivo cuando procede y asigna maestro/ayudantes activos de clases correspondientes; también admite trabajo especial sin asignación a perfiles. El flujo implementado puede asignar inmediatamente: no hay estado persistido `ESPERA`; enum actual: `PLANNED`, `ASSIGNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`. Referencias: `src/features/work-orders/actions.ts` (`createAndAssignWorkOrder`, `assignWorkOrder`), `src/features/work-orders/domain.ts`, esquema.

El cierre valida el alcance comercial, cambia orden asignada a completada, emite la nota pagable, fija vencimiento si falta, completa asignaciones y programa indexación de conocimiento y notificación. Los conceptos se usan para generar la nota de remisión; pagos se tramitan aparte. `recordExecution` existe en código, pero los comentarios del propio módulo indican que seguimiento de ejecución no está expuesto en UI. Referencias: `completeWorkOrder`, `recordExecution` en `src/features/work-orders/actions.ts`.

Cancelar/revertir orden comprueba que no haya pagos, aplicaciones, movimientos de ledger ni avances; si los hay requiere otro proceso. El rollback actualiza estado y puede revocar enlaces al volver a borrador. No confundir rollback operativo con reversa financiera. Referencia: `rollbackWorkOrder`.

## Notas y venta directa

Una orden crea inicialmente nota `WORK` en borrador; completar emite la nota. Venta directa de materiales crea cotización comercial aprobada y nota `SALE` emitida sin crear orden. La venta exige cliente y conceptos/precios comercialmente válidos. Referencias: `createDirectMaterialSale`, `createDirectWorkOrder` en `src/features/work-orders/actions.ts`; `PayableNoteKind` en esquema.

El dominio también contiene creación de notas independientes (`createStandalonePayableNote`), pero no se verificó una ruta/flujo de usuario que la invoque; no se afirma que sea una función disponible en pantalla. Referencia: `src/features/payable-notes/domain.ts`.

Una nota de trabajo completado tiene enlace compartido canónico, con expiración y revocación auditada; el documento público puede mostrar estado de saldo si se puede calcular. Cotizaciones archivadas sin orden no son accesibles mediante enlace. Referencias: `ensureSharedQuoteInTransaction`, `getSharedQuoteByToken`, `revokeCanonicalNoteSharedQuote` en `src/features/quotes/domain.ts`.

## Límites

- La conversión de venta es una nota emitida, no orden de trabajo.
- La guía de arquitectura describe `ESPERA` como objetivo, pero el enum y acciones actuales no lo implementan.
- No inferir lo que la UI muestra únicamente de estas acciones; las rutas/páginas y pruebas delimitan la presentación concreta.
