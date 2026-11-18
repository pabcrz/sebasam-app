# Cotizaciones, órdenes de trabajo y notas

El personal prepara alcance comercial, registra decisiones y coordina el taller; el cliente decide mediante enlace válido. Seguir el [recorrido conectado](flows.md#trabajo-habitual-observado); la [cobranza](payments-and-receivables.md) es independiente del cierre.

## Cotización: propuesta y decisión

**Hecho observado:** `Quote` contiene secciones y conceptos (`QuoteSection`, `QuoteItem`), cliente/contacto/unidad y snapshots. Crear valida datos, calcula importes y persiste cotización y conceptos en transacción; inicia en `DRAFT` con vigencia comercial predeterminada de siete días. Publicar valida contenido comercial y pasa a `SENT`. Fuentes: [acciones](../../src/features/quotes/actions.ts), [cálculo](../../src/features/quotes/lib/calculate.ts), [pruebas de vigencia](../../src/features/quotes/lib/calculate.test.ts) y [schema](../../prisma/schema.prisma).

El enlace usa token revocable, con expiración efectiva limitada a 30 días desde emisión. La decisión pública no requiere sesión; permite aceptar/declinar cotización `DRAFT`/`SENT` disponible, desbloqueada y que no sea nota de trabajo completado. Registra origen `CUSTOMER`. La página está en [cotización pública](../../src/app/cotizacion/[token]/page.tsx); reglas en [dominio](../../src/features/quotes/domain.ts).

La autorización administrativa exige nota no vacía y registra origen `ADMIN`, actor cuando se proporciona e IDs de secciones. Aceptar marca `APPROVED`; sin lista explícita se autorizan todas las secciones, con lista solo las identificadas. **Aprobación general y `QuoteSection.isAuthorized` son distintos:** autorización parcial no crea cotizaciones separadas. Rechazar marca `REJECTED`. `correctQuoteDecision` parte de aprobada/rechazada, permite destino aprobado/rechazado/borrador y bloquea documento con orden asociada; registra decisión e historial. Ver [dominio y pruebas](../../src/features/quotes/domain.test.ts).

## De cotización a trabajo

Una orden tiene vínculo único con cotización de trabajo. Las acciones operativas admiten cotizaciones `DRAFT`, `SENT` o `APPROVED`; la entrada de crear/asignar puede registrar aceptación o motivo cuando procede. Crea/obtiene orden y nota pagable borrador, asigna maestro/ayudantes activos con clases compatibles o trabajo especial sin asignación a perfiles. Puede asignar inmediatamente: **no hay enum `ESPERA`**. No convertir el objetivo R4 en precondición universal de las acciones actuales. Fuentes: [acciones](../../src/features/work-orders/actions.ts), [dominio](../../src/features/work-orders/domain.ts) y [pruebas](../../src/features/work-orders/actions.test.ts).

Cerrar valida identidad (cliente o unidad identificable), conceptos, precios y totales vigentes, además de orden `ASSIGNED`; la pasa a `COMPLETED`, emite nota, fija vencimiento si falta y completa asignaciones. La validación operativa no es idéntica a exigir cliente comercial en todas las entradas; ver [validaciones de inicio/cierre](../../src/features/work-orders/operational-validation.ts). Los conceptos generan la nota de remisión; pagos van aparte. Después prepara indexación y notificación, sin prometer indexación instantánea. `recordExecution` existe para uso interno/futuro; el módulo indica que seguimiento no está expuesto en UI y sus wrappers de compatibilidad no prueban registro efectivo de avance/fotos.

Cancelar/revertir mediante `rollbackWorkOrder` comprueba ausencia de pagos, aplicaciones y ledger; con esa actividad requiere otro proceso. Actualiza estados y puede revocar enlaces al volver a borrador. **Límite reconciliado:** el borrador anterior incluía avances entre los bloqueos, pero esta función no consulta `WorkOrderLaborAdvance`; no afirmar una protección financiera universal por existir avances de nómina. **Rollback operativo no es reversa financiera.**

## Notas y venta directa

La orden crea nota `WORK` borrador; completar emite la nota. La venta directa de materiales crea cotización comercial aprobada y nota `SALE` emitida **sin orden**; exige cliente y conceptos/precios comercialmente válidos, mediante acción administrativa. El registro directo de trabajo puede crear orden activa o ya completada; `createDirectNote` reutiliza ese camino como completado, no una nota sin respaldo. La conversión de cotización de venta emite nota, no orden. Fuente: [acciones de trabajo/venta](../../src/features/work-orders/actions.ts).

`createStandalonePayableNote` es capacidad del [dominio de notas](../../src/features/payable-notes/domain.ts); no se verificó ruta/flujo de usuario que la invoque. No anunciarla como pantalla disponible.

La nota de trabajo completado tiene enlace compartido canónico con expiración y revocación auditada (actor/motivo). El documento público puede mostrar saldo si logra calcularlo. Cotizaciones archivadas sin orden y documentos en papelera no están disponibles por enlace. Ver [dominio de enlaces](../../src/features/quotes/domain.ts) y [experiencia pública](vehicles-and-public-experience.md).

## Retención y restauración

**Política observada:** el proceso archiva `SENT`/`APPROVED` con vigencia vencida, sin orden ni nota y fuera de papelera, y revoca enlaces. Tras 30 días desde `validUntil` inicia papelera; tras 60 días puede purgar, no desde la fecha de ejecución tardía del cron. Cada fase toma hasta 100 registros.

Antes de purgar protege dependencias: orden, nota, pago, solicitud de pago, decisión, evento de ciclo de vida, corrección comercial y acuerdo. Los archivos manuales sin `retentionStartedAt` no entran en esa eliminación automática. Fuentes: [retención](../../src/features/quotes/retention.ts) y [pruebas](../../src/features/quotes/retention.test.ts).

Restaurar archivo a borrador requiere rol operativo, motivo y vigencia comercial aún abierta. Restaurar papelera exige archivo de retención con `deletedAt` dentro de los últimos 30 días (no futuro); quita papelera/seguimiento de retención pero **permanece `ARCHIVED`**, no renueva vigencia ni revive enlaces. Registra evento. Ver [acciones de restauración](../../src/features/quotes/actions.ts) y [pruebas](../../src/features/quotes/actions.test.ts). El archivo de nota completada tiene tratamiento separado en esas acciones; no inferir que borra finanzas.

Configuración del cron y comprobación de ejecución pertenecen al [runbook de release](../PRODUCTION_RELEASE.md#quote-retention-cron). El calendario está versionado; su ejecución en producción no fue verificada aquí.

## Reglas objetivo conservadas

Estas filas preservan el contrato acordado, **no certifican UI ni estados persistidos**. R1/R4 describen espera objetivo, frente a asignación inmediata observada. R6–R8 no prueban seguimiento/extras visibles ni que el cierre actual exija cobertura de registros de ejecución. R13 preserva evidencia inicial opcional; R17 expresa el contrato de autoría/interacción, no prueba cada botón público. Los controles visuales pertenecen a [diseño](../../DESIGN.md).

| ID | Regla | Detalle |
|---|---|---|
| R1 | Estados de cotización objetivo | `BORRADOR` → `ENVIADA` → `ACEPTADA` / `DECLINADA`; el admin puede `CANCELADA` en cualquier momento permitido. Tras `ACEPTADA`, la orden debe pasar a `ESPERA` antes de `EN_PROCESO`. |
| R2 | Autorización por secciones | La cotización puede dividirse en secciones con subtotal propio. El cliente puede autorizar una o más secciones sin autorizar la cotización completa; las secciones no se modelan como cotizaciones separadas. |
| R3 | Token expirable | El link de cliente lleva token con vigencia; expirado → no se procesa la respuesta. |
| R4 | Aceptación/autorización → WorkOrder | Regla objetivo: toda orden de trabajo debe nacer de una cotización aceptada o autorizada administrativamente; debe crearse en `ESPERA` y pasar a `EN_PROCESO` al confirmar espacio y maestro. |
| R5 | Asignación controlada | Se asigna 1 maestro + N ayudantes desde el panel admin. En el MVP inmediato el registro es administrativo; el trabajador no tiene login/app propio. |
| R6 | Reporte de ejecución | El admin registra avance de ejecución empatado contra la cotización aceptada o autorizada administrativamente. Los registros se vinculan al trabajador para trazabilidad, nómina y cuenta del cliente. |
| R7 | Extras controlados | Los extras son posibles, pero requieren registro, control y quedan vinculados a la orden. |
| R8 | Fin de trabajo | El trabajo termina cuando la ejecución cubre el alcance aprobado + extras autorizados. |
| R12 | Autorización administrativa | Regla objetivo: si el cliente aceptó por fuera del link (p. ej. teléfono), el admin debe marcar la cotización como autorizada con una nota obligatoria de canal/motivo. No es un flujo separado: usa el mismo registro de cotización/alcance. |
| R13 | Evidencia inicial | La evidencia inicial es opcional tanto en el borrador como en la autorización administrativa. |
| R17 | Construcción por secciones desde el inicio | La experiencia de autor parte de una cotización con secciones. La acción principal es **Agregar sección**; dentro de cada sección se agregan conceptos con **Agregar concepto**. Los subtotales y el total se calculan automáticamente. Las acciones del cliente son **Autorizar sección** y **Autorizar cotización completa**. La agrupación retrospectiva de conceptos queda fuera del MVP inmediato. |

## Disponibilidad y conexiones

La UI actual se localiza en [rutas de arquitectura](../ARCHITECTURE.md#hosting-y-modelo-de-rutas), no se deduce de funciones exportadas. Los guards deben comprobarse siguiendo también las funciones llamadas: `createWorkOrder` delega en `ensureWorkOrderPlanned`, que exige `requireOperationalRole`; la ausencia de un guard en el cuerpo del wrapper no implica ausencia de autorización. Consultar [auth](auth-and-user-management.md#roles-y-límites). Al emitir nota, continuar en [pagos](payments-and-receivables.md); al cerrar, en [nómina](customers-workers-payroll.md) y [conocimiento](completed-work-and-assistant.md).
