# Estado del MVP en `sebasam-app`

Resumen del estado actual del proyecto y las brechas que faltan cerrar antes del release de producción.

## Veredicto general

**El MVP de cotizador interno está ~55 % completo.**

Las bases de arquitectura, autenticación, clientes, vehículos y cotizaciones están funcionales. El cálculo de subtotal, IVA y total, el ciclo de token de `PaymentRequest`, la reutilización y snapshot de `CustomerFiscalProfile` y el filtrado de cuentas bancarias están implementados. Faltan los registros de cobro, pagos parciales en efectivo, ledger del cliente, estados de pago y factura, e indicador financiero de saldo pendiente. También quedan brechas en PDF o vista pública de cotización, compartir/enviar, respuesta del cliente y localización completa al español de México.

> Alcance: `/datos-de-pago/[token]` sirve como instrucción opcional y contextual para transferencias. La ruta genérica `/datos-pago` no es autoritativa para una operación y su alcance final permanece pendiente.

## Estado por área

### 1) Autenticación y navegación

| Funcionalidad | Estado | Evidencia |
|---|---|---|
| Login admin | **Completo** | `/admin/login` con username/password; sesión server-side (`src/lib/auth/session.ts`). |
| Dashboard con módulos mínimos (Clientes, Cotizaciones) | **Parcial** | `src/app/admin/(protected)/page.tsx` enlaza solo clientes y cotizaciones; no hay inventario ni pagos. |

### 2) Clientes

| Funcionalidad | Estado | Evidencia |
|---|---|---|
| Alta/edición rápida | **Completo** | `src/features/customers/actions.ts`, `/admin/customers`, `/admin/customers/[id]/edit`. |
| Búsqueda usable desde móvil | **Completo** | `listCustomers` busca por nombre, email, teléfono, dirección y notas (`src/features/customers/queries.ts`). |
| Ver historial de cotizaciones del cliente | **Parcial** | No existe pantalla de detalle de cliente; el historial solo es visible indirectamente en el listado de cotizaciones. |

### 3) Cotizaciones

| Funcionalidad | Estado | Evidencia |
|---|---|---|
| Crear cotización en `BORRADOR` | **Completo** | `createQuote` / `createQuoteFromForm` crean `DRAFT` (`src/features/quotes/actions.ts`). |
| Capturar cliente | **Completo** | Select de clientes en `/admin/quotes`. |
| Capturar datos de vehículo (unidad/modelo + placas) | **Completo** | Formulario de vehículo con placas opcionales y modelo requerido; `findOrCreateVehicle` reutiliza por cliente+placa (`src/features/vehicles/actions.ts`). |
| Notas opcionales | **Completo** | Campo `description` en cotización. |
| Asignación: 1 Maestro obligatorio + N Ayudantes opcionales | **Falta** | La asignación ocurre al pasar de `ESPERA` a `EN_PROCESO`, una vez confirmados espacio del taller y disponibilidad de maestro; `WorkAssignment` existe en schema pero no se crea desde la UI. |
| Ítems tipo `MATERIAL`, `MANO_OBRA`, `SERVICIO_EXTERNO` | **Parcial** | Schema tiene `SERVICE`, `MATERIAL`, `LABOR`, `EQUIPMENT`, `OTHER`; los labels en UI se traducen, pero no coinciden 1:1 con los tipos esperados. |
| Cantidad, descripción, precio final, importe | **Completo** | `QuoteItem` con `quantity`, `description`, `unitPriceCents`, `totalCents`. |
| Totales: `subtotal`, `iva`, `total` persistidos | **Completo** | El servidor calcula y persiste subtotal, IVA y total. |
| Preferencia de factura y recálculo controlado | **Parcial** | Existe base de cálculo de IVA; falta el flujo interno auditado para cambiar la preferencia y refrescar instrucciones hasta la liquidación final. |
| Listado: buscar por folio/cliente/placas | **Parcial** | Tabla de cotizaciones existe, pero sin búsqueda ni filtros. |
| Filtros por estado de cotización | **Falta** | No hay filtros en el listado. |

### 4) PDF y salida final

| Funcionalidad | Estado | Evidencia |
|---|---|---|
| Botón "Generar PDF" desde cotización | **Falta** | No existe generación de PDF. |
| PDF generado desde BD | **Falta** | — |
| Formato renovado: 1 hoja limpia, sin CLABEs | **Falta** | — |
| URL + QR a página de datos de pago | **Falta** | No existe `/pago` ni QR. |

### 5) Cobranza e instrucciones de transferencia

| Funcionalidad | Estado | Evidencia |
|---|---|---|
| Ciclo tokenizado de `PaymentRequest` | **Completo** | Creación, resolución, expiración, cancelación y estados de solicitud implementados. No registra pagos ni prueba liquidación. |
| Perfil y snapshot fiscal | **Completo** | `CustomerFiscalProfile` se reutiliza y `fiscalSnapshot` preserva datos de la operación cuando aplica. |
| Cuentas bancarias elegibles | **Completo** | La página tokenizada filtra las cuentas por preferencia fiscal. |
| Contrato público exclusivo para transferencia | **Parcial** | Existe `/datos-de-pago/[token]`, pero conserva decisión de factura y captura fiscal públicas que no pertenecen al contrato objetivo. |
| Registro `Payment` y métodos `CASH`, `TRANSFER`, `OTHER` | **Falta** | Entidad y persistencia planificadas. |
| Efectivo total o parcial | **Falta** | No existe captura de cobro en efectivo ni aplicación parcial. |
| Ledger y saldo pendiente del cliente | **Falta** | No existen movimientos financieros ni saldo asociado al cliente. |
| Estados de pago y factura | **Falta** | `PENDING`/`PARTIAL`/`PAID` y `NOT_REQUESTED`/`DATA_MISSING`/`READY`/`ISSUED` son objetivo. |
| Indicador financiero de saldo en `Quote` | **Falta** | Debe permanecer separado de `QuoteStatus`. |

### 5a) Ruta pública genérica (`/datos-pago`)

| Funcionalidad | Estado | Evidencia |
|---|---|---|
| Instrucciones contextuales de una operación | **No aplica** | No tiene `PaymentRequest`, importe decidido ni selección contextual de cuenta. |
| Alcance final de producto | **Pendiente** | No debe presentarse como fuente autoritativa para cobrar una cotización. |

### 6) URL pública para cliente

| Funcionalidad | Estado | Evidencia |
|---|---|---|
| Token firmado o persistido/revocable | **Falta** | No existe tokenización de cliente. |
| Ruta pública por token | **Falta** | No existe `/c/[token]` ni similar. |
| Vista de solo lectura con folio, cliente, ítems, montos, vigencia, estado | **Falta** | La vigencia comercial definida es de 7 días, con nota por cambios imprevistos en precios de materiales. |
| Manejo de token inválido/expirado | **Falta** | — |
| Cambiar estado a `ENVIADA` al compartir | **Falta** | — |

### 7) Backend y datos

| Funcionalidad | Estado | Evidencia |
|---|---|---|
| Folio único por cotización | **Completo** | `Quote.number` con `@unique`. |
| Estados objetivo del MVP: `BORRADOR`, `ENVIADA`, `ACEPTADA`, `DECLINADA`, `CANCELADA`, `ESPERA`, `EN_PROCESO` | **Parcial** | Estados existentes (`DRAFT`, `SENT`, `APPROVED`, `CANCELLED`), pero `SENT` no se usa aún. `ESPERA` es un estado operativo pendiente para separar aceptación/autorización del inicio real del trabajo. |
| Cálculo centralizado de subtotal, IVA y total | **Completo** | `calculateQuoteTotals` aplica IVA y produce el total pagable en servidor. |
| `saldoPendiente = total - totalAbonado` | **Falta** | No hay pagos ni ledger. |
| Vigencia obligatoria en cotización | **Completo** | La cotización calcula 7 días por defecto. |
| Acciones de servidor: crear, actualizar, cambiar estado, link público, PDF | **Parcial** | Existe crear y aprobar (`approveQuoteAndCreateWorkOrder`); faltan actualizar, cambiar estado independiente, link público y PDF. |
| Guardar ítems en `ItemCotizacion` con tipo correcto | **Completo** | `QuoteItem` con `type` del enum `QuoteItemType`. |
| Recalcular montos al guardar ítems | **Completo** | `calculateItemTotalCents` y reducción en `createQuote`. |
| Guardar enlace PDF en `pdfUrl` | **Falta** | No existe generación ni campo `pdfUrl`. |

### 8) Validaciones y QA

| Funcionalidad | Estado | Evidencia |
|---|---|---|
| Validar formulario con Zod | **Completo** | `quoteFormInputSchema`, `quoteItemInputSchema`, `vehicleInputSchema`, etc. |
| Prohibir cantidad o precio negativo | **Completo** | `quantity` positiva; `unitPriceCents` no negativa. |
| Requerir al menos 1 ítem para compartir/generar PDF | **Necesita verificación** | Se requiere ≥1 ítem para crear cotización, pero no se puede probar el caso compartir/PDF porque esas funciones no existen. |
| QA funcional: crear, compartir en incógnito, generar PDF, comparar montos | **Falta** | — |

### 9) Alcance de trabajadores y requisitos fuera del MVP inmediato

| Funcionalidad | Estado | Notas |
|---|---|---|
| Inventario | **Fuera del MVP** | No implementado; acorde a `docs/MVP_ISSUES.md`. |
| Registros admin-led de trabajadores, asignaciones y ejecución | **En dominio / UI pendiente** | Schema tiene `UserProfile`, `WorkAssignment`, `ExecutionRecord`. El MVP inmediato requiere que el admin asigne maestro/ayudantes y registre ejecución desde el panel admin para accountability, nómina y cuenta del cliente. Ver GitHub #65. |
| Login/app de trabajador (`/mis-trabajos`, `/mi-nomina`) | **Fuera del MVP** | El trabajador no tiene sesión propia en el MVP inmediato; se revisa para post-MVP. |
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
| Issue 8 — Asignación administrativa de `WorkOrder` y registros de ejecución | **Falta** |
| Issue 9 — Finalizar `WorkOrder` y generar PDF/salida final | **Falta** |
| Issue 10 — Verificación de instalabilidad PWA | **Falta** |
| Issue 11 — Pipeline de despliegue en Vercel | **Falta** |
| Issue 12 — Localización a español de México | **Parcial** |
| Issue GitHub #37 — Flujo de pago y autorización parcial de cotizaciones | **Pendiente** |
| Issue GitHub #41 — `PaymentRequest`, `CustomerFiscalProfile` y acciones de servidor | **Completo** |
| Issue GitHub #42 — Página pública `/datos-de-pago/[token]` | **Implementado; ajuste de contrato pendiente** |

## Principales brechas

1. **Cierre de venta**: falta el flujo para compartir la cotización, mostrarla al cliente y registrar aceptación o declinación todo/nada.
2. **Cobranza**: faltan `Payment`, efectivo total/parcial, ledger, estados financieros e indicador de saldo pendiente separado de `QuoteStatus`.
3. **Asignación de trabajadores**: debe ocurrir cuando la cotización aceptada inicia trabajo, no durante el borrador. En el MVP inmediato el admin asigna maestro/ayudantes y registra ejecución desde el panel admin; el trabajador no tiene login/app propio. Ver GitHub #65.
4. **Edición de borradores**: faltan opciones para editar, completar o eliminar cotizaciones antes de enviarlas.
5. **Filtros y búsqueda en listados**: todos los módulos operativos necesitan filtros; cotizaciones y clientes son prioridad.
6. **Localización**: todo texto operativo visible al usuario debe estar en español de México.
7. **Modelo de dominio**: la separación `Quote`/`WorkOrder` es correcta; la UI debe traducirla a estados de negocio claros para el usuario.

### Decisiones para cerrar brechas

| Brecha | Decisión | Impacto en implementación |
|---|---|---|
| Cierre de venta | Significa compartir la cotización y capturar aceptación/declinación del cliente. | Crear link tokenizado, vista pública, estado `ENVIADA` y acciones de respuesta todo/nada. |
| IVA | IVA 16 % activado por defecto. | Agregar cálculo centralizado, persistencia y switch "Con IVA". |
| Excepción de IVA | Debe poder desactivarse manualmente. | El switch debe dejar rastro claro en UI y totales. |
| Vigencia | 7 días por defecto. | Agregar `validUntil` o equivalente y mostrarlo en cotización/PDF/vista pública. |
| Volatilidad de materiales | La vigencia queda sujeta a cambios imprevistos de precios. | Mostrar nota comercial en salida al cliente. |
| Maestro y ayudantes | Se asignan al pasar de `ESPERA` a `EN_PROCESO`, después de confirmar espacio del taller y disponibilidad de maestro. El registro es admin-led en el MVP inmediato. | Mover asignación al flujo `ESPERA` → `EN_PROCESO`; el admin captura asignación y ejecución, no el trabajador. |
| Filtros | Todo listado operativo debe tener filtros. | Priorizar cotizaciones y clientes; extender a trabajos, pagos y nómina cuando existan. |
| Autorización parcial | Las cotizaciones se dividen en secciones con subtotal propio; el cliente puede autorizar secciones individuales sin autorizar la cotización completa. | Agregar `QuoteSection` al modelo; registrar autorización por sección sin crear cotizaciones separadas. |
| Flujo de cobro | Factura, método, pago, factura emitida y saldo son conceptos independientes. | Resolver fiscalidad internamente; usar `PaymentRequest` solo para transferencias y registrar el pago por separado. |
| Idioma | Todo lo operativo visible debe estar en español. | Barrido de UI, mensajes, estados, botones y validaciones visibles. |

## Recomendación de orden para cerrar brechas

1. Implementar `Payment`, aplicación de efectivo total/parcial y ledger del cliente.
2. Agregar estados de pago y factura e indicador financiero de saldo pendiente en la cotización.
3. Ajustar `/datos-de-pago/[token]` a instrucciones de transferencia sin selector de factura ni formulario fiscal.
4. Habilitar edición de cotizaciones en borrador.
5. Agregar filtros a cotizaciones y clientes.
6. Generar vista pública de cotización + token expirable (`/c/[token]`).
7. Capturar aceptación o declinación todo/nada del cliente; permitir autorización administrativa con nota obligatoria cuando el cliente aceptó por fuera del link.
8. Tras la aceptación o autorización, mover la orden a `ESPERA`; al confirmar espacio y maestro, pasar a `EN_PROCESO` y asignar maestro/ayudantes.
9. Localizar toda la UI visible al español de México.
