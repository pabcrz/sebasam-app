# Manual de producto SEBASAM

Guía operativa basada en el comportamiento implementado, no una promesa de interfaz. Está organizada por tarea:

- [Cotizaciones, órdenes y notas](quotes-work-orders-notes.md): crear/compartir/decidir cotizaciones, autorización por secciones, órdenes, cierre y ventas directas.
- [Pagos y cuentas por cobrar](payments-and-receivables.md): cobros, crédito, ledger, correcciones, reversas y enlaces de pago.
- [Clientes, equipo y nómina](customers-workers-payroll.md): expedientes y cálculos.
- [Autenticación y usuarios](auth-and-user-management.md): login, permisos y administración de cuentas.
- [Panel y acuerdos de liquidación](dashboard-and-settlements.md): métricas operativas y reglas del acuerdo.
- [Vehículos y experiencia pública](vehicles-and-public-experience.md): registros, tokens y presentación.
- [Trabajos completados, importación y asistente](completed-work-and-assistant.md): indexación, fuentes y límites.
- [Plataforma y módulos](platform-modules.md): inventario de rutas y configuración.
- [Arquitectura y seguridad](architecture-and-security.md): límites técnicos y operación.

## Cómo leer esta guía

**Hecho** identifica reglas observadas en acciones, dominios, esquema o pruebas, con rutas de código para comprobarlas. **Límite / por confirmar** separa capacidades incompletas, no expuestas o cuyo alcance no se pudo verificar. Las rutas citadas son rutas de repositorio; el esquema es `prisma/schema.prisma`.

Esta guía describe lógica de servidor y dominio. La presencia de una acción exportada no prueba que exista un control visible o ruta de usuario; guards se atribuyen únicamente donde fueron comprobados. No reemplaza procedimientos contables, fiscales, de respaldo o de despliegue.
