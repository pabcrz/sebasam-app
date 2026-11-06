# Conocimiento de trabajos completados y asistente

## Indexación

Al completar una orden se preparan fuentes por conceptos de secciones autorizadas y conceptos sueltos, con contexto de número/fecha/unidad/responsable/tipo/descripción. Las fuentes guardan estado `PENDING`, `INDEXING`, `INDEXED`, `FAILED` o `INELIGIBLE`; la sincronización se programa tras la operación principal y fallos se registran por fuente sin deshacer el cierre del trabajo. Referencias: `src/features/work-orders/actions.ts` (`scheduleCompletedWorkKnowledge`), `src/features/completed-work-knowledge/service.ts`, modelo `CompletedWorkKnowledgeSource`.

El índice requiere trabajo completado con fecha. Si no cumple, queda inelegible. El contexto deriva unidad del vehículo/snapshot y responsable del maestro asignado o nombre de trabajo especial. La sincronización puede fallar por proveedor ausente; estados pendientes/fallidos se pueden reintentar y un estado `INDEXING` viejo puede reclamarse pasados diez minutos. No hay garantía de disponibilidad inmediata al cerrar. Referencia: `prepareCompletedWorkKnowledge`, `synchronizeCompletedWorkKnowledge`.

La búsqueda lee solo fuentes indexadas y vuelve a consultar valores operativos actuales; tras cambios comerciales los importes/comisiones mostrados pueden reflejar datos vigentes y no snapshot de cuando se completó. Referencia: `src/features/completed-work-knowledge/repository.ts`.

## Asistente

`POST /api/assistant/chat` exige rol operacional, JSON y pregunta de 1–1000 caracteres. El servicio usa Gemini para extraer filtros; pregunta estadística activa agregación exacta sobre columnas y el sistema además consulta hasta cinco coincidencias semánticas entre historial importado y trabajos indexados. La lista semántica no es total estadístico. Referencias: `src/app/api/assistant/chat/route.ts`, `src/features/assistant/service.ts`, `src/features/historical/repository.ts`, `src/features/completed-work-knowledge/repository.ts`.

El proveedor puede fallar o no estar configurado; el endpoint responde error según causa. Las respuestas distinguen ingreso/comisión generados de pagos recibidos; material/refacción puede mostrar unitario derivado; los kits no se dividen. Fuentes semánticas e importes actuales tienen procedencias diferentes.

## Importación histórica

El formato es JSON `schemaVersion: 2`, tipos de concepto del enum, fecha ISO y lote con `id`/fuente. Importe/precio en pesos se valida y convierte a centavos; las reglas diferencian conceptos en nómina (sin cantidad) de partes (cantidad e importe requeridos). Trabajo duplicado se detecta por lote y referencia; conceptos repetidos por hash. Referencias: `src/features/historical/schemas.ts`, `src/features/historical/domain.ts`, `src/features/historical/importer.ts`.

Importar persiste cada trabajo completo en su propia transacción lógica; no es una transacción global del lote: otros trabajos pueden guardarse aunque uno falle. Embeddings se preparan por concepto y una falla impide guardar ese trabajo; dry-run valida sin inserción ni llamada al proveedor. La acción de app requiere proveedor Gemini. La UX exacta documentada en `docs/HISTORICAL_IMPORT.md` debe cotejarse con el flujo actual (`src/features/historical/components/`).

## Límites

La búsqueda semántica no es inventario completo ni agregación exacta; la indexación puede retrasarse/fallar y búsqueda actual usa valores operativos actuales. Sin credencial Gemini, asistente/importación activa no ofrecen la misma capacidad. Datos históricos incompletos no deben completarse por inferencia.
