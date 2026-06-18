# Estado del MVP en `sebasam-app`

> Comparación del estado actual del proyecto contra los documentos fuente del repo hermano `sebasam`:
> - [`sebasam/MVP.md`](https://github.com/gentleman-programming/sebasam/blob/main/MVP.md)
> - [`sebasam/MVP_COTIZACIONES_CHECKLIST.md`](https://github.com/gentleman-programming/sebasam/blob/main/MVP_COTIZACIONES_CHECKLIST.md)

## Veredicto general

**El MVP de cotizador interno está ~55 % completo.**

Las bases de arquitectura, autenticación, clientes, vehículos y creación de cotizaciones en borrador están funcionales. Faltan los elementos visibles de cierre de venta: **PDF**, **URL pública / portal cliente** y el flujo de **compartir/enviar**. También hay brechas en IVA, vigencia, edición de borradores, filtros de listado y localización completa al español de México.

## Hallazgo importante entre fuentes

`MVP.md` posterga explícitamente el **portal cliente tokenizado** y la **página `/pago`** a la siguiente fase. En cambio, `MVP_COTIZACIONES_CHECKLIST.md` incluye "compartir por URL pública", "cambiar estado a ENVIADA al compartir" y "generar PDF" como parte del MVP de cotizaciones compartibles. Este informe marca esos ítems según el checklist, pero se señala la tensión de alcance.

## Comparativa por área

### 1) Autenticación y navegación

| Requisito fuente | Estado | Evidencia |
|---|---|---|
| Login admin | **Completo** | `/admin/login` con username/password; sesión server-side (`src/lib/auth/session.ts`). |
| Dashboard con módulos mínimos (Clientes, Cotizaciones) | **Parcial** | `src/app/admin/(protected)/page.tsx` enlaza solo clientes y cotizaciones; no hay inventario ni pagos. |

### 2) Clientes

| Requisito fuente | Estado | Evidencia |
|---|---|---|
| Alta/edición rápida | **Completo** | `src/features/customers/actions.ts`, `/admin/customers`, `/admin/customers/[id]/edit`. |
| Búsqueda usable desde móvil | **Completo** | `listCustomers` busca por nombre, email, teléfono, dirección y notas (`src/features/customers/queries.ts`). |
| Ver historial de cotizaciones del cliente | **Parcial** | No existe pantalla de detalle de cliente; el historial solo es visible indirectamente en el listado de cotizaciones. |

### 3) Cotizaciones

| Requisito fuente | Estado | Evidencia |
|---|---|---|
| Crear cotización en `BORRADOR` | **Completo** | `createQuote` / `createQuoteFromForm` crean `DRAFT` (`src/features/quotes/actions.ts`). |
| Capturar cliente | **Completo** | Select de clientes en `/admin/quotes`. |
| Capturar datos de vehículo (unidad/modelo + placas) | **Completo** | Formulario de vehículo con placas opcionales y modelo requerido; `findOrCreateVehicle` reutiliza por cliente+placa (`src/features/vehicles/actions.ts`). |
| Notas opcionales | **Completo** | Campo `description` en cotización. |
| Asignación: 1 Maestro obligatorio + N Ayudantes opcionales | **Falta** | El formulario de cotización no asigna trabajadores; `WorkAssignment` existe en schema pero no se crea desde la UI. |
| Ítems tipo `MATERIAL`, `MANO_OBRA`, `SERVICIO_EXTERNO` | **Parcial** | Schema tiene `SERVICE`, `MATERIAL`, `LABOR`, `EQUIPMENT`, `OTHER`; los labels en UI se traducen, pero no coinciden 1:1 con los tipos fuente. |
| Cantidad, descripción, precio final, importe | **Completo** | `QuoteItem` con `quantity`, `description`, `unitPriceCents`, `totalCents`. |
| Totales: `subtotal`, `iva`, `total` persistidos | **Parcial** | Campos existen, pero `taxCents` siempre es `0` y no hay toggle de IVA ni tasa del 16 %. |
| Opción "Con IVA" default ON al 16 % | **Falta** | No hay campo ni cálculo de IVA. |
| Listado: buscar por folio/cliente/placas | **Parcial** | Tabla de cotizaciones existe, pero sin búsqueda ni filtros. |
| Filtros por estado de cotización | **Falta** | No hay filtros en el listado. |

### 4) PDF y salida final

| Requisito fuente | Estado | Evidencia |
|---|---|---|
| Botón "Generar PDF" desde cotización | **Falta** | No existe generación de PDF. |
| PDF generado desde BD | **Falta** | — |
| Formato renovado: 1 hoja limpia, sin CLABEs | **Falta** | — |
| URL + QR a página de datos de pago | **Falta** | No existe `/pago` ni QR. |

### 5) Página pública fija "Datos de pago" (`/pago`)

| Requisito fuente | Estado | Evidencia |
|---|---|---|
| Mostrar CLABE(s) y banco(s) | **Falta** | No existe la ruta. |
| Acciones "Copiar CLABE", "Abrir WhatsApp", "Llamar" | **Falta** | — |

### 6) URL pública para cliente (del checklist)

| Requisito fuente | Estado | Evidencia |
|---|---|---|
| Token firmado o persistido/revocable | **Falta** | No existe tokenización de cliente. |
| Ruta pública por token | **Falta** | No existe `/c/[token]` ni similar. |
| Vista de solo lectura con folio, cliente, ítems, montos, vigencia, estado | **Falta** | — |
| Manejo de token inválido/expirado | **Falta** | — |
| Cambiar estado a `ENVIADA` al compartir | **Falta** | — |

### 7) Backend y datos (checklist)

| Requisito fuente | Estado | Evidencia |
|---|---|---|
| Folio único por cotización | **Completo** | `Quote.number` con `@unique`. |
| Estados usados en MVP: `BORRADOR`, `ENVIADA`, `APROBADA`, `CANCELADA` | **Parcial** | Estados existentes (`DRAFT`, `SENT`, `APPROVED`, `CANCELLED`), pero `SENT` no se usa aún. |
| Cálculo centralizado de subtotal, IVA y total | **Parcial** | Subtotal/total en servidor; IVA no calculado. |
| `saldoPendiente = total - totalAbonado` | **Falta** | No hay pagos ni ledger. |
| Vigencia obligatoria en cotización | **Falta** | No existe campo de vigencia. |
| Acciones de servidor: crear, actualizar, cambiar estado, link público, PDF | **Parcial** | Existe crear y aprobar (`approveQuoteAndCreateWorkOrder`); faltan actualizar, cambiar estado independiente, link público y PDF. |
| Guardar ítems en `ItemCotizacion` con tipo correcto | **Completo** | `QuoteItem` con `type` del enum `QuoteItemType`. |
| Recalcular montos al guardar ítems | **Completo** | `calculateItemTotalCents` y reducción en `createQuote`. |
| Guardar enlace PDF en `pdfUrl` | **Falta** | No existe generación ni campo `pdfUrl`. |

### 8) Validaciones y QA

| Requisito fuente | Estado | Evidencia |
|---|---|---|
| Validar formulario con Zod | **Completo** | `quoteFormInputSchema`, `quoteItemInputSchema`, `vehicleInputSchema`, etc. |
| Prohibir cantidad o precio negativo | **Completo** | `quantity` positiva; `unitPriceCents` no negativa. |
| Requerir al menos 1 ítem para compartir/generar PDF | **Necesita verificación** | Se requiere ≥1 ítem para crear cotización, pero no se puede probar el caso compartir/PDF porque esas funciones no existen. |
| QA funcional: crear, compartir en incógnito, generar PDF, comparar montos | **Falta** | — |

### 9) Otros requisitos del MVP.md fuente

| Requisito | Estado | Notas |
|---|---|---|
| Inventario | **Fuera del MVP** | No implementado; acorde a `MVP.md`. |
| Empleados, trabajos realizados y nómina | **Fuera del MVP** | Schema tiene `UserProfile`, `WorkAssignment`, `ExecutionRecord`, `NominaSemanal`; UI pendiente. |
| Cuentas de empleados (adeudos/abonos) | **Fuera del MVP** | No implementado. |
| Evidencias (fotos/timeline) | **Fuera del MVP** | No implementado. |

### 10) Issues internos `docs/MVP_ISSUES.md`

| Issue | Estado |
|---|---|
| Issue 1 — Setup y documentación de despliegue | **Completo** |
| Issue 2 — Proyecto Supabase y primera migración | **Completo** |
| Issue 3 — Login con Auth y sesión admin | **Completo** |
| Issue 4 — `UserProfile` y bootstrap de roles | **Completo** |
| Issue 5 — Alta, búsqueda y edición básica de clientes | **Completo** |
| Issue 5.1 — Entidad `Vehicle` y vinculación en cotizaciones | **Completo** |
| Issue 5.2 — Placas opcionales en cotización | **Completo** |
| Issue 6 — Creación de cotización borrador con ítems | **Completo** |
| Issue 7 — Aprobar cotización y crear `WorkOrder` | **Completo** |
| Issue 8 — Asignación de `WorkOrder` y registros de ejecución | **Falta** |
| Issue 9 — Finalizar `WorkOrder` y generar PDF/salida final | **Falta** |
| Issue 10 — Verificación de instalabilidad PWA | **Falta** |
| Issue 11 — Pipeline de despliegue en Vercel | **Falta** |
| Issue 12 — Localización a español de México | **Parcial** |

## Principales brechas

1. **Cierre de venta no existe**: no hay PDF, URL pública, botón "Compartir" ni transición a `ENVIADA`.
2. **IVA y vigencia**: faltan en el modelo y en la UI; el source las considera obligatorias para cotizaciones comerciales.
3. **Asignación de trabajadores**: el schema la soporta, pero la cotización no captura maestro/ayudantes.
4. **Edición de borradores**: solo se pueden crear y aprobar; no editar ni eliminar.
5. **Filtros y búsqueda en listados**: clientes tienen búsqueda; cotizaciones solo listado crono.
6. **Localización**: pantallas admin mezclan inglés y español; el source espera español de México para todo texto visible.
7. **Modelo de dominio divergente**: este proyecto separa `Quote`/`WorkOrder`; el source trata a la cotización como entidad central que cambia de fase. La UI debe reflejar los estados de negocio del source (`BORRADOR`, `ENVIADA`, `APROBADA`, `EN_PROCESO`, `AJUSTE_FINAL`, etc.) aunque el schema los tenga divididos.

## Recomendación de orden para cerrar brechas

1. Agregar toggle de IVA y campo de vigencia en cotización.
2. Habilitar edición de cotizaciones en borrador.
3. Implementar asignación de maestro/ayudantes al aprobar (o al crear orden de trabajo).
4. Generar vista pública de cotización + token expirable (`/c/[token]`).
5. Al compartir, cambiar estado a `SENT` y mostrar PDF/URL.
6. Crear página fija `/pago` con CLABEs, QR y acciones.
7. Localizar toda la UI visible al español de México.
