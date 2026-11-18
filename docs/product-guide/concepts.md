# Conceptos compartidos

Para personal operativo y lectores del manual: identificar qué dato cambia antes de interpretar un estado o un importe. Continuar con los [recorridos](flows.md) y volver al [índice](index.md).

## Planos independientes

| Plano | Entidades y significado | Dueño |
|---|---|---|
| Comercial | Cotización, sección y concepto describen propuesta, alcance autorizado y precios | [Cotizaciones](quotes-work-orders-notes.md) |
| Operativo | Orden, asignaciones y cierre representan el trabajo; una nota documenta el cargo emitido | [Órdenes y notas](quotes-work-orders-notes.md#de-cotización-a-trabajo) |
| Financiero | Captura de dinero, aplicación a cargo, crédito disponible, saldo y preferencia fiscal | [Pagos](payments-and-receivables.md) |
| Laboral | Base de nómina, porcentaje, comisión y avance; no prueban desembolso | [Nómina](customers-workers-payroll.md#nómina) |

En la UI del cotizador cada línea se llama **concepto** y la acción es **Agregar concepto**; en dominio sigue siendo `QuoteItem`. Incluye mano de obra, material, refacción, servicio externo y otro. Una sección agrupa conceptos con subtotal; no es otra cotización. Cliente, contacto y vehículo pueden vincularse a la propuesta, que conserva snapshots históricos.

## Estados, objetivos y evidencia

**Objetivo conservado:** el vocabulario de producto incluye `BORRADOR`, `ENVIADA`, `ACEPTADA`, `DECLINADA`, `CANCELADA`, `ESPERA`, `EN_PROCESO` y ajuste final. No es una máquina de estados persistida. En particular, `ESPERA` no existe en `WorkOrderStatus`; las acciones actuales pueden asignar inmediatamente. Los valores persistidos y el mapa de rutas pertenecen a [arquitectura](../ARCHITECTURE.md#modelo-y-estados-no-confundir-producto-con-enums), no a una segunda definición aquí.

El estado general aprobado y `QuoteSection.isAuthorized` son independientes: una aceptación puede autorizar solo determinadas secciones. Una nota emitida tampoco significa pagada. Los labels financieros objetivo `PARTIAL` o los de factura no se deben asumir enums existentes; consultar el [contrato financiero](payments-and-receivables.md#contrato-de-cobro-y-facturación).

## Personas y registros

| Concepto | Qué representa | Continuar en |
|---|---|---|
| Cliente | Identidad comercial a la que se vinculan operaciones y cuenta | [Expediente](customers-workers-payroll.md#clientes) |
| Contacto | Persona relacionada con el cliente, por ejemplo conductor o contacto de facturación; no sustituye al cliente | [Expediente](customers-workers-payroll.md#clientes) |
| Perfil fiscal | Datos fiscales reutilizables; el snapshot de una operación conserva sus propios datos históricos | [Cobranza](payments-and-receivables.md#solicitudes-de-pago-y-configuración) |
| Usuario / trabajador | Una cuenta autenticable y un perfil laboral son registros con responsabilidades distintas; crear la ficha laboral no crea credenciales ni autoservicio | [Acceso](auth-and-user-management.md) y [equipo](customers-workers-payroll.md#equipo) |

## Dinero y registro

| Concepto | Distinguir de |
|---|---|
| Solicitud de pago | Instrucciones e importe compartidos; no es dinero recibido |
| Captura de pago | Dinero registrado; puede no estar aplicado completamente a un cargo |
| Aplicación | Porción de una captura o crédito destinada a un cargo; no otro ingreso |
| Crédito disponible | Importe del cliente aún disponible para aplicar; no saldo adeudado |
| Ledger | Registro de movimientos para trazabilidad y cuenta; no se deduce del estado de la cotización |

Los cálculos, restricciones y correcciones tienen un solo dueño: [pagos](payments-and-receivables.md).

## Tres fechas distintas

| Fecha | Qué limita | Dueño |
|---|---|---|
| Vigencia comercial (`Quote.validUntil`) | Validez comercial de la propuesta; también participa en retención | [Cotizaciones](quotes-work-orders-notes.md) |
| Expiración del enlace (`expiresAt`) | Acceso por ese token, además de su revocación; las superficies tienen reglas propias | [Experiencia pública](vehicles-and-public-experience.md) |
| Vencimiento de pago (`paymentDueDate`) | Fecha de cobro de la nota/orden cuando está registrada; no demuestra pago ni invalida por sí sola el enlace | [Cobranza](payments-and-receivables.md) |

Renovar o restaurar un documento no equivale a renovar todos sus tokens ni a liquidar el saldo.

## Identidad y superficies
- Un token público autoriza una superficie específica, con reglas propias; no equivale a sesión. Cotización, solicitud de pago y cuenta bancaria no comparten automáticamente vigencia ni revocación.
- Un resultado semántico no es un agregado exacto ni inventario completo. Ver [conocimiento](completed-work-and-assistant.md).

## Alcance e historial

El MVP original excluía el portal tokenizado de clientes; esa exclusión es histórica: ya existe `/cotizacion/[token]`. El self-service de trabajadores sigue siendo propuesta distinta del registro interno administrado. Las diferencias entre objetivos y código se resuelven mediante issues aprobados, no cambiando el runtime desde documentación. Git conserva los primeros snapshots; GitHub Issues es el tracker vigente y [OpenSpec](../../openspec/README.md) conserva especificaciones de correcciones y clientes.

## Evidencia

[Schema](../../prisma/schema.prisma), [decisiones por secciones](../../src/features/quotes/domain.ts), [notas](../../src/features/payable-notes/domain.ts), [pagos](../../src/features/payments/domain.ts) y [guards](../../src/lib/auth/session.ts). La presencia de funciones/modelos prueba capacidad de código, no disponibilidad de una pantalla ni configuración efectiva de producción.
