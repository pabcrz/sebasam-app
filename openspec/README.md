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

## Inventario y disposición

- [Gestión de clientes](./specs/customer-management-flow/spec.md).
- [Corrección de trabajos completados](./specs/completed-work-correction/spec.md).
- [Corrección de pagos](./specs/payment-correction/spec.md).
- [Expediente #497](./changes/archive/2026-09-08-497-optimize-customer-management-flow/): archivado tras confirmar que el [issue](https://github.com/pabcrz/sebasam-app/issues/497) está cerrado (2026-09-08) y que su informe histórico registra PASS. La fecha del directorio refleja el cierre, no una nueva ejecución de tests; se conservaron los seis archivos sin modificar su contenido.
- [Expediente de correcciones](./changes/archive/2026-09-08-correct-completed-work-and-payments/): archivo histórico ya existente, conservado sin cambios.

No quedan expedientes de cambios activos en este snapshot. Las tres especificaciones consolidadas se conservan: esta limpieza no declara retirados sus contratos.

`config.yaml` conserva contexto/testing metadata del repo. Sus reglas de artefactos son listas de texto; el YAML se valida estructuralmente, sin afirmar compatibilidad con una versión de CLI no comprobada. Vitest cubre tests de UI/unidad y Playwright tiene fixtures de navegador; eso no equivale a E2E autenticado. No hay proveedor de cobertura ni comando de formateo declarado en `package.json`.

Las especificaciones no prueban cobertura actual. Contrastarlas con código y tests. La selección de ODD/SDD y la ejecución pertenecen a [AI_WORKFLOW](../docs/AI_WORKFLOW.md); GitHub Issues sigue siendo el tracker. No duplicar su checklist en una nueva propuesta.
