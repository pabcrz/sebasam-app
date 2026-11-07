# Vehículos y experiencia pública

El personal reutiliza unidades del cliente y comparte documentos acotados; el destinatario público consulta o decide solo lo autorizado por su enlace. Seguir [cliente y trabajo](flows.md#trabajo-habitual-observado); revisar [pagos](payments-and-receivables.md) antes de interpretar instrucciones como cobro.

## Vehículos

Vehículo pertenece a cliente; registra placa, número económico, marca, modelo, año, color y notas. Schemas limitan longitudes y año desde 1950 hasta próximo año. Placa normalizada a mayúsculas puede ser nula y es única por cliente. Fuentes: [schemas](../../src/features/vehicles/schemas.ts), [acciones](../../src/features/vehicles/actions.ts), [modelo](../../prisma/schema.prisma).

Crear/editar cotización busca/reutiliza por placa normalizada o, sin placa, número económico; si encuentra puede actualizar campos recibidos, si no crea. La cotización también conserva snapshot histórico aunque cambie el registro enlazado. Fuentes: [acciones de cotización](../../src/features/quotes/actions.ts), [snapshots](../../src/features/quotes/lib/quote-snapshots.ts). Continuar en [expediente](customers-workers-payroll.md#clientes).

## Cotizador público

`/cotizacion/[token]` muestra documento compartido con expiración/revocación; permite aceptar/declinar conforme a estado y registra decisión. **No es sesión ni portal general.** Las notas completadas tienen tratamiento de enlace canónico y saldo calculable separado. El dueño de decisiones y vigencia es [cotizaciones](quotes-work-orders-notes.md#cotización-propuesta-y-decisión).

La [ruta pública](../../src/app/cotizacion/[token]/page.tsx) y [componentes](../../src/features/public-quotes/components/) delimitan presentación. No deducir que todo dato del cliente se expone ni que cada acción de dominio tiene control visible; verificar selección explícita.

## Páginas públicas de pago

`/datos-de-pago/[token]` presenta referencia, importe guardado/reconciliado en solicitud, cuentas compatibles con factura, contacto y CTA para enviar comprobante por WhatsApp. **No registra captura ni acredita transferencia.** La [ruta](../../src/app/datos-de-pago/[token]/page.tsx) filtra cuentas por preferencia fiscal (`isForInvoicing`), no por indicador de compartir cuenta independiente. La UI no ofrece selector de factura ni formulario fiscal; las capacidades tokenizadas de servidor y su caveat están en [finanzas](payments-and-receivables.md#solicitudes-de-pago-y-configuración).

`/datos-de-pago/cuenta/[token]` consulta cuenta específica con `isPubliclyShareable` activo, titular/banco y al menos cuenta o CLABE. Deshabilitar compartir impide consulta; no atribuirle automáticamente los siete/treinta días de otros tokens. Fuente: [dominio de configuración](../../src/features/payment-settings/domain.ts) y [ruta de cuenta](../../src/app/datos-de-pago/cuenta/[token]/page.tsx).

`/datos-pago` genérico es página distinta: no equivale a solicitud contextual ni genera obligación. Ver [página](../../src/app/datos-pago/page.tsx). Configuración pública no concede acceso PostgREST a tablas operativas. Los límites técnicos están en [arquitectura](../ARCHITECTURE.md#límites-de-datos-y-ejecución).

## Marca pública

La configuración del taller incluye identidad, ubicación, horarios, servicios/productos y bancos; [finanzas](payments-and-receivables.md#solicitudes-de-pago-y-configuración) es dueña de elegibilidad bancaria. [Branding](../../src/features/public-branding/domain.ts) omite textos vacíos y filtra mapas a HTTP/HTTPS; header/documento consumen ajustes. `PublicBusinessIdentity` proyecta nombre y contactos, no logo/dirección/mapa: esos datos son del shell/caller, según [contrato visual](../../DESIGN.md#identidad-pública).

Filtrar URL no valida exactitud comercial de datos ingresados. Cambiar ajustes afecta presentación pública. CTAs, copiar datos y enviar comprobante nunca significan transferencia recibida. Para continuar el proceso interno, volver a [cobranza](payments-and-receivables.md) o al [índice](index.md).
