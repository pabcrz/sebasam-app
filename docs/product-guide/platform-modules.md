# Plataforma y módulos

## Inventario de rutas observadas

Las páginas localizadas bajo `src/app` incluyen:

| Área | Rutas implementadas localizadas |
|---|---|
| Acceso | `/admin/login`, `/admin/change-password`, `/admin/setup-required` |
| Administración | `/admin`, `/admin/users`, `/admin/configuracion-pago` |
| Clientes | `/admin/customers`, `/admin/customers/[id]`, `/admin/customers/[id]/estado-de-cuenta` |
| Cotizaciones | `/admin/quotes`, `/admin/quotes/nueva`, `/admin/quotes/[id]/edit`, `/admin/quotes/[id]/print`, `/admin/quotes/retention` |
| Taller | `/admin/workers`, `/admin/workers/[id]/edit`, `/admin/work-orders`, `/admin/work-orders/[id]`, `/admin/notas`, `/admin/notas/[id]/print` |
| Nómina | `/admin/nomina`, `/admin/nomina/imprimir/firmas`, `/admin/nomina/imprimir/sobre/[workerId]` |
| Conocimiento | `/admin/historical`, `/asistente` |
| Público | `/cotizacion`, `/cotizacion/[token]`, `/datos-de-pago/[token]`, `/datos-de-pago/cuenta/[token]`, `/datos-pago` |
| API | `/api/assistant/chat`, `/api/cotizacion/[token]/status`, `/api/cron/quote-retention` |

Esto es inventario de archivos de ruta, no matriz de acceso completa. Guards se comprueban en layouts, páginas, acciones y endpoints; no extrapolar autorización desde prefijos. Rutas base y literales se encuentran en `src/app/`. `docs/ARCHITECTURE.md` es una referencia arquitectónica que también contiene rutas planeadas; distinguir ese objetivo del inventario real.

## Configuración y datos públicos

La configuración de pago incluye datos del taller, horario, servicios/productos y cuentas bancarias. Las cuentas se comparten públicamente solo si tienen indicador activado y datos mínimos; la ruta de cuenta usa token público. Referencias: `src/features/payment-settings/actions.ts`, `src/features/payment-settings/domain.ts`, `src/features/public-payment/`.

`/datos-pago` es ruta genérica; no equivale a la solicitud contextual ligada a operación. Véase `app/datos-pago/page.tsx`.

## Importación histórica y asistente

El importador acepta JSON versión 2, valida lotes y guarda cada trabajo completo en transacción; duplicados de trabajo se identifican por `(batchId, workRef)` y conceptos por hash. La importación activa requiere proveedor de embeddings; el dry-run no inserta ni llama proveedor. Referencias: `src/features/historical/importer.ts`, `src/features/historical/actions.ts`, `src/features/historical/schemas.ts`; instrucciones ampliadas en [HISTORICAL_IMPORT.md](../HISTORICAL_IMPORT.md).

El asistente extrae filtros, hace agregación SQL cuando se piden estadísticas y búsqueda semántica en histórico importado y trabajos completados. La respuesta depende de Gemini y separa coincidencias semánticas de agregados exactos. Si falta configuración devuelve error de configuración. Referencias: `src/features/assistant/service.ts`, `app/api/assistant/chat/route.ts`, `src/features/completed-work-knowledge/`.

## Retención de cotizaciones

Existe handler GET `/api/cron/quote-retention`: exige `Authorization: Bearer <CRON_SECRET>` y llama a `processQuoteRetention`. El proceso archiva cotizaciones enviadas/aprobadas vencidas sin orden ni nota, aplica ventanas de archivo/papelera y elimina solo sin dependencias protegidas; procesa lotes acotados. No se verificó en este recorrido el calendario/proveedor que invoca el endpoint ni una garantía de ejecución periódica. Restauración y retención están descritas en `src/features/quotes/retention.ts` y acciones de `src/features/quotes/actions.ts`.

No atribuir al asistente garantía de respuesta exacta para una lista semántica, ejecución sin proveedor o indexación instantánea; véase [conocimiento y asistente](completed-work-and-assistant.md).
