# Manual de producto SEBASAM

Una sola entrada para entender y operar clientes, cotizaciones, trabajo, notas, cobranza y nómina. El personal administra la operación; los enlaces públicos habilitan tareas acotadas, no un portal autenticado general.

## Ruta rápida

1. Leer [conceptos compartidos](concepts.md) para separar propuesta, operación y dinero.
2. Seguir los [recorridos conectados](flows.md): trabajo, venta directa, cobranza, nómina y consulta.
3. Abrir el capítulo dueño de la tarea:

| Necesidad | Capítulo canónico |
|---|---|
| Preparar, compartir, autorizar, asignar y cerrar; conservar documentos | [Cotizaciones, órdenes y notas](quotes-work-orders-notes.md) |
| Capturar y aplicar pagos, crédito, acuerdos y datos bancarios | [Pagos y cuentas por cobrar](payments-and-receivables.md) |
| Mantener expedientes y calcular nómina/avances | [Clientes, trabajadores y nómina](customers-workers-payroll.md) |
| Ingresar y administrar cuentas | [Autenticación y usuarios](auth-and-user-management.md) |
| Interpretar métricas | [Panel operativo](dashboard.md) |
| Reutilizar unidades y entender qué comparte un enlace | [Vehículos y experiencia pública](vehicles-and-public-experience.md) |
| Consultar trabajos y distinguir fuentes | [Conocimiento y asistente](completed-work-and-assistant.md) |

## Cómo interpretar las afirmaciones

- **Hecho observado:** comportamiento del código versionado enlazado; no certifica su despliegue ni la ejecución reciente de pruebas.
- **Objetivo conservado:** reglas R1–R18 y contratos acordados; no son un checklist de pendientes ni evidencia de implementación. Cada fila original se conserva en su capítulo dueño.
- **Límite / no verificado:** alcance de UI, integración o producción que no se comprobó. Una acción exportada no demuestra un control visible ni un guard uniforme.

Los nombres de negocio y labels visuales no sustituyen los enums del [schema](../../prisma/schema.prisma). Este manual no modifica comportamiento ni incorpora propuestas de ramas sin integrar.

## Referencias con otro propósito

| Dueño | Consultar para |
|---|---|
| [Arquitectura](../ARCHITECTURE.md) | Estructura, modelos/enums, rutas y límites técnicos de seguridad |
| [Diseño](../../DESIGN.md) | Tokens y contratos visuales/de interacción |
| [Importación histórica](../HISTORICAL_IMPORT.md) | Formato, validación y procedimiento de importación |
| [Seguridad de base de datos](../DATABASE_SAFETY.md) | Migraciones, respaldo y límites de recuperación |
| [Release](../PRODUCTION_RELEASE.md) | Despliegue y configuración/ejecución del cron |
| [AI workflow](../AI_WORKFLOW.md) y [Gitflow](../GITFLOW.md) | Contribución, issues, ramas y verificación |

No reemplaza procedimientos contables o fiscales, conciliación bancaria ni recuperación integral. GitHub Issues registra ejecución; [ODD](../../odd/README.md), evidencia por trabajo; [OpenSpec](../../openspec/README.md), especificaciones detalladas de cambios. Los archivos históricos son evidencia, no manuales activos.
