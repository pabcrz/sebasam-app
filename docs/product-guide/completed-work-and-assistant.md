# Conocimiento de trabajos completados y asistente

El personal consulta antecedentes de trabajo y estadísticas sin confundir similitud con totales exactos ni comisión generada con dinero pagado. El [cierre operativo](quotes-work-orders-notes.md#de-cotización-a-trabajo) alimenta conocimiento; importar histórico es un proceso distinto.

## Indexación

Completar orden prepara fuentes por conceptos de secciones autorizadas y conceptos sueltos, con número/fecha/unidad/responsable/tipo/descripción. Guarda estados `PENDING`, `INDEXING`, `INDEXED`, `FAILED`, `INELIGIBLE`. La sincronización se programa después de la operación principal; fallos por fuente no deshacen cierre. Fuentes: [acciones de trabajo](../../src/features/work-orders/actions.ts), [servicio](../../src/features/completed-work-knowledge/service.ts), [modelo](../../prisma/schema.prisma).

Requiere trabajo `COMPLETED` con fecha; de otro modo las fuentes quedan inelegibles. Unidad deriva de vehículo/snapshot y responsable de maestro asignado o nombre especial. Proveedor ausente puede fallar; pendientes/fallidas se pueden reintentar y `INDEXING` antiguo se reclama pasados diez minutos. **No garantiza disponibilidad inmediata al cerrar.**

La búsqueda usa solo fuentes indexadas y vuelve a consultar valores operativos actuales: tras cambios comerciales, importes/comisiones pueden ser vigentes y no snapshot del cierre. Fuente: [repositorio](../../src/features/completed-work-knowledge/repository.ts). No interpretar indexación como respaldo ni garantía de consistencia instantánea.

## Asistente

1. Personal autorizado pregunta en `/asistente`; `POST /api/assistant/chat` exige rol operativo, JSON y pregunta de 1–1000 caracteres.
2. Gemini extrae filtros. Pregunta estadística activa agregación SQL exacta sobre columnas; además consulta hasta cinco coincidencias semánticas entre histórico importado y trabajos indexados.
3. Revisar respuesta, procedencia y fuentes: la lista semántica **no es total estadístico** ni inventario completo.

Fuentes: [endpoint](../../src/app/api/assistant/chat/route.ts), [servicio](../../src/features/assistant/service.ts), [histórico](../../src/features/historical/repository.ts) y [trabajos actuales](../../src/features/completed-work-knowledge/repository.ts). Sin configuración Gemini, el servicio devuelve respuesta de no configuración con `envError` en el payload (el endpoint la serializa, no necesariamente con HTTP de error); `ProviderError` durante la consulta se traduce a HTTP 502. No ofrece capacidad equivalente sin proveedor.

Las respuestas distinguen ingreso/comisión generados de pagos recibidos; material/refacción puede mostrar unitario derivado y los kits no se dividen. Fuentes semánticas e importes actuales tienen procedencias diferentes. No completar datos históricos ausentes por inferencia ni tratar generación como desembolso de [nómina](customers-workers-payroll.md#nómina) o [cobro](payments-and-receivables.md).

## Importación histórica: conexión, no otro procedimiento

Formato, plantilla, tipos, fecha ISO, importes en pesos convertidos a centavos, cantidades de partes frente a conceptos de nómina y pasos app/CLI pertenecen a [HISTORICAL_IMPORT](../HISTORICAL_IMPORT.md). Esa guía también conserva límites de índices vectoriales, resolución informativa de maestros, hash y seguridad; no repetir formato aquí.

La implementación valida lotes versión 2 e identifica trabajo por `(batchId, workRef)` y concepto por hash. Persiste **cada trabajo completo** en transacción, no todo el lote: otros trabajos pueden guardarse aunque uno falle. Prepara embeddings por concepto antes de insertar; fallo impide guardar ese trabajo. Dry-run valida sin inserción ni llamada al proveedor; importación activa exige proveedor (la acción de app usa Gemini). Fuentes: [importador](../../src/features/historical/importer.ts), [acciones](../../src/features/historical/actions.ts), [schemas](../../src/features/historical/schemas.ts), [componentes actuales](../../src/features/historical/components/).

## Límites y siguiente paso

No se verificaron producción, latencia garantizada, indexación instantánea ni ejecución sin proveedor. La búsqueda histórica no tiene ivfflat/hnsw; ver [limitaciones del importador](../HISTORICAL_IMPORT.md#limitaciones). El histórico no reconstruye ledger, cobros o saldos por inferencia. Para interpretar indicadores ir a [panel](dashboard.md); para el circuito completo, a [recorridos](flows.md#nómina-y-consulta) o al [índice](index.md).
