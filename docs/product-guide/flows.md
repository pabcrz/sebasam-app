# Recorridos conectados

El personal operativo coordina alcance, trabajo y cobranza sin confundir sus estados. Primero revisar [conceptos](concepts.md); cada paso enlaza al único dueño de sus reglas.

## Trabajo habitual observado

1. [Ingresar](auth-and-user-management.md) con perfil operativo activo y resolver el cambio de contraseña cuando corresponda.
2. Buscar o crear [cliente](customers-workers-payroll.md#clientes) y [vehículo](vehicles-and-public-experience.md#vehículos); preparar secciones y conceptos en [cotización](quotes-work-orders-notes.md#cotización-propuesta-y-decisión).
3. Compartir el enlace vigente para decisión pública o registrar autorización externa con nota. La evidencia inicial es opcional; aprobación general no equivale a autorización de todas las secciones.
4. Crear/asignar [orden](quotes-work-orders-notes.md#de-cotización-a-trabajo) con maestro/ayudantes válidos o trabajo especial. La entrada operativa puede registrar aceptación/motivo; no todas las entradas exigen previamente `APPROVED`. Se crea una nota borrador; no un cobro.
5. Cerrar el trabajo conforme a las validaciones actuales: emite nota, completa asignaciones y prepara [conocimiento](completed-work-and-assistant.md). Seguimiento detallado de ejecución no está expuesto como UI completa.
6. Tramitar [cobranza](payments-and-receivables.md) por separado. El cierre no espera pago y el pago no sustituye cierre. Consultar [panel](dashboard.md) para indicadores, no certificación contable.

## Venta y registro directo

La [venta directa de materiales](quotes-work-orders-notes.md#notas-y-venta-directa) crea cotización comercial aprobada y nota `SALE` emitida, **sin orden**. Comparte cliente y circuito de cobro de nota, no asignación ni cierre laboral. El registro directo de trabajo/nota usa una orden respaldada por cotización y puede registrar trabajo ya completado; no confundirlo con la nota independiente que existe solo como capacidad de dominio no confirmada en UI.

## Cobranza independiente

1. El personal decide factura, datos fiscales y total vigente; si aplica, registra [acuerdo](payments-and-receivables.md#acuerdo-de-liquidación).
2. Efectivo no necesita enlace ni cuenta bancaria. Transferencia puede usar solicitud contextual con importe decidido; la [página pública](vehicles-and-public-experience.md#páginas-públicas-de-pago) solo comunica instrucciones/comprobante.
3. Capturar dinero y aplicarlo son efectos distintos. Una aplicación parcial conserva saldo; excedente capturado puede quedar como crédito de cliente.
4. Para errores, usar el proceso de [corrección/reversa](payments-and-receivables.md#crédito-reversas-y-correcciones), no rollback operativo con actividad financiera. Recalcular condiciones comerciales puede invalidar acuerdos/instrucciones; no borra pagos.

## Nómina y consulta

Las órdenes completadas del período alimentan [nómina](customers-workers-payroll.md#nómina), junto con avances registrados durante órdenes activas; la base ya adelantada se descuenta del cálculo restante. Impresión y comisión calculada no prueban pago al trabajador.

El cierre prepara fuentes indexables sin garantizar búsqueda inmediata. Los [históricos importados y trabajos completados](completed-work-and-assistant.md) son procedencias distintas; la búsqueda semántica apoya consulta y los agregados exactos responden estadísticas. Importar histórico no reconstruye cobranza ni crea órdenes operativas por inferencia.

## Flujo objetivo conservado

**Objetivo de producto, no implementación garantizada:** login → cotización `BORRADOR` → secciones, conceptos, vehículo y evidencia opcional → compartir `ENVIADA` → autorizar todo/parcial (`ACEPTADA`) o declinar (`DECLINADA`) → orden `ESPERA` → confirmar espacio y disponibilidad de maestro → `EN_PROCESO` → asignar maestro/ayudantes desde admin → registrar ejecución y extras controlados → terminar trabajo → registrar cobros, ajustes y adeudo → ledger del cliente y nómina semanal.

En ese objetivo, aceptar/autorizar no debe iniciar trabajo automáticamente y el admin registra autorización externa con nota de canal/motivo; la cobranza define factura, datos fiscales y medio de forma independiente. La espera obligatoria, ejecución visible y secuencia ideal no se afirman como comportamiento actual: los contrastes están junto a R1–R8 y R12–R13 en [cotizaciones](quotes-work-orders-notes.md#reglas-objetivo-conservadas).

## Evidencia y siguiente paso

[Acciones de trabajo y venta](../../src/features/work-orders/actions.ts), [validaciones operativas](../../src/features/work-orders/domain.ts), [capturas/aplicaciones](../../src/features/payments/domain.ts), [nómina](../../src/features/payroll/domain.ts) e [importador](../../src/features/historical/importer.ts). Volver al [índice](index.md) para elegir una tarea concreta.
