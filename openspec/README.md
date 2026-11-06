# Especificaciones e historial de cambios

OpenSpec contiene documentación de requisitos y decisiones, no código necesario para ejecutar la aplicación. No hay scripts de `package.json` que lo invoquen ni referencias desde `src`, `scripts` o `.github`.

## Qué leer

| Carpeta | Propósito |
|---|---|
| [`specs/`](./specs/) | Requisitos consolidados de clientes y correcciones de trabajos/pagos. |
| [`changes/`](./changes/) | Expedientes de propuesta, diseño, tareas y verificación de cada cambio. |
| [`changes/archive/`](./changes/archive/) | Expedientes históricos; sus resultados de tests corresponden a la revisión original. |
| [`config.yaml`](./config.yaml) | Contexto y reglas para herramientas de especificación; no configura el runtime. |

Una especificación consolidada y su delta histórico pueden compartir texto intencionalmente: el delta explica el cambio y la versión consolidada conserva el contrato resultante. No borrar una de las dos por coincidencia textual.

Las especificaciones no prueban cobertura actual. Contrastarlas con código y tests. La selección de ODD/SDD y la ejecución pertenecen a [AI_WORKFLOW](../docs/AI_WORKFLOW.md); GitHub Issues sigue siendo el tracker. No duplicar su checklist en una nueva propuesta.
