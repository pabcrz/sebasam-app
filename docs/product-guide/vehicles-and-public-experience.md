# Vehículos y experiencia pública

## Vehículos

Vehículo pertenece a un cliente. Se registra placa, número económico, marca, modelo, año, color y notas; el esquema limita longitud de varios campos y año desde 1950 hasta próximo año. La placa se normaliza a mayúsculas y puede quedar nula. La unicidad de placa es por cliente. Referencias: `src/features/vehicles/schemas.ts`, `src/features/vehicles/actions.ts`, `Vehicle` en `prisma/schema.prisma`.

En creación/edición de cotización se busca/reutiliza vehículo por placa normalizada o, si no hay placa, por número económico. Si se encuentra puede actualizarse con campos recibidos; si no, se crea. La cotización conserva también snapshot para representar datos históricos aunque cambie el registro enlazado. Referencias: `findOrCreateVehicle`, `createVehicleSnapshot`, `src/features/quotes/lib/quote-snapshots.ts`.

## Cotizador público

`/cotizacion/[token]` sirve documento compartido con token, expiración y revocación. La decisión pública permite aceptación/rechazo conforme al estado de la cotización y guarda decisión; véase [cotizaciones y órdenes](quotes-work-orders-notes.md). La vista de documento y su shell están en `src/features/public-quotes/components/`; la ruta está en `src/app/cotizacion/[token]/page.tsx`.

## Páginas públicas de pago

`/datos-de-pago/[token]` presenta referencia, importe capturado en solicitud, cuentas elegibles, contacto y CTA para enviar comprobante por WhatsApp; no registra el pago. `/datos-de-pago/cuenta/[token]` consulta una cuenta específica solo si está habilitada para compartir y cumple datos mínimos. `src/features/public-payment/` y `src/features/payment-settings/domain.ts` contienen el contrato. El `/datos-pago` genérico es una página distinta; no asumir que representa una solicitud ni que genera obligación.

## Marca pública

`src/features/public-branding/domain.ts` elimina textos vacíos y filtra mapas a URLs HTTP/HTTPS. El header/documento público consume identidad del taller desde ajustes. Esto no valida exactitud comercial de los datos ingresados; actualizar ajustes afecta lo que se presenta públicamente.

## Límites de la vista

Los CTAs y enlaces no son confirmación de transferencia recibida. No asumir que todos los datos del cliente se exponen; comprobar selección explícita de datos en la ruta/componente. La configuración pública de cuentas no equivale a autorización PostgREST para tablas operativas.
