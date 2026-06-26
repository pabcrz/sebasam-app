# Borrador de backlog del MVP

Este documento es un borrador revisable de planificación. Todavía no reemplaza a los issues del tracker. Usalo para acordar alcance, orden de trabajo y criterios de aceptación antes de abrir o implementar cada issue.

## Fuera del MVP

- Portal de clientes con acceso tokenizado.
- Libro contable completo.
- Nómina/liquidación de sueldos.
- Gestión estricta de inventario.

## Primer issue recomendado

Empezar por el **Issue 1: Endurecimiento del setup del proyecto y revisión de documentación de despliegue**. Reduce riesgo de configuración antes de que el esquema, la autenticación y el despliegue dependan de las mismas suposiciones de entorno.

## Follow-up de autenticación antes del Issue 5

Antes de avanzar con clientes, validar el acceso real de Pablo como admin interno:

- [x] `SUPABASE_SERVICE_ROLE_KEY` está disponible solo en entorno local/admin, nunca en frontend.
- [x] `pnpm auth:set-password` puede crear o resetear la contraseña de `pablo@sebasam.local` sin correo real.
- [x] `UserProfile` de Pablo existe con `role = ADMIN`.
- [x] Pablo puede autenticarse con username `pablo` y contraseña temporal; queda pendiente solo una prueba manual en `/admin/login` desde navegador.

La pantalla futura de gestión de contraseñas queda fuera del MVP inmediato de clientes; cuando se implemente debe usar Radix para comportamiento/accesibilidad y wrappers Tailwind derivados de Figma, sin inventar línea visual.

## Issues

### Issue 1: Endurecimiento del setup del proyecto y revisión de documentación de despliegue

**Objetivo:** Confirmar que el entorno local y el flujo de despliegue están listos para desarrollar el MVP.

**Criterios de aceptación:**
- [x] `.env.example` coincide con las variables documentadas en `README.md`.
- [x] `pnpm install`, `pnpm lint`, `pnpm typecheck` y `pnpm build` están documentados y verificados.
- [x] Los comandos de Prisma para generar cliente, crear migraciones de desarrollo y aplicar migraciones de despliegue están documentados.
- [x] Las notas de configuración de Vercel/Supabase son suficientemente claras para que una persona nueva pueda preparar el entorno.

**Dependencias/notas:** Hacer antes del trabajo de base de datos y autenticación.

**Nota de verificación:** Verificado en la rama `feature/1-setup-hardening`: `.env.example` coincide con las variables documentadas en `README.md`; los comandos `pnpm install`, `pnpm lint`, `pnpm typecheck` y `pnpm build` ejecutan correctamente; los comandos de Prisma `pnpm prisma:generate`, `pnpm db:migrate:dev` y `pnpm db:migrate:deploy` están documentados; las notas de Vercel/Supabase cubren las variables requeridas y el paso explícito de `pnpm db:migrate:deploy` antes del build.

### Issue 2: Proyecto Supabase y primera migración Prisma

**Objetivo:** Crear el primer esquema operativo sobre Supabase Postgres usando Prisma.

**Criterios de aceptación:**
- [x] Las cadenas de conexión del proyecto Supabase están configuradas mediante `DATABASE_URL` y `DIRECT_URL`.
- [x] Prisma tiene una migración inicial para las entidades centrales del MVP.
- [x] El flujo de migraciones usa `prisma migrate dev` en local y `prisma migrate deploy` para releases.
- [x] La generación de Prisma Client funciona después de aplicar la migración.

**Dependencias/notas:** Depende del Issue 1.

**Nota de verificación:** Verificado en la rama `feature/2-supabase-first-migration`: `.env` contiene `DATABASE_URL` y `DIRECT_URL` para Supabase sin valores plantilla; `pnpm prisma migrate reset --force --skip-seed` aplicó `20260617000000_init`; `pnpm prisma:generate`, `pnpm lint`, `pnpm typecheck` y `pnpm build` ejecutan correctamente.

### Issue 3: Login con Auth y base de sesión admin

**Objetivo:** Establecer login con Supabase Auth y manejo de sesión server-side para usuarios administradores.

**Criterios de aceptación:**
- [x] Existe un flujo de login para administradores.
- [x] Las rutas/actions protegidas pueden leer la sesión del lado del servidor.
- [x] Los usuarios no autenticados son redirigidos fuera de las pantallas operativas protegidas.
- [x] Los helpers de autenticación no consultan tablas operativas de negocio directamente mediante clientes Supabase.

**Dependencias/notas:** Depende del Issue 2 si los registros de sesión necesitan vínculo con perfiles.

**Nota de verificación:** Verificado en la rama `feature/3-auth-admin-session`: existe `/admin/login` con username/password; el servidor transforma el username a email interno `@sebasam.local` para Supabase Auth, `/admin` queda protegido por server layout y proxy, los helpers `getCurrentUser`/`requireUser` leen la sesión server-side sin consultar tablas operativas mediante Supabase, y las actions/queries operativas existentes exigen sesión antes de usar Prisma. `pnpm lint`, `pnpm typecheck` y `pnpm build` ejecutan correctamente.

### Issue 4: `UserProfile` y bootstrap de roles

**Objetivo:** Guardar roles de la app y datos de perfil operativo en `UserProfile`.

**Criterios de aceptación:**
- [x] `UserProfile` está vinculado con la identidad de Supabase Auth.
- [x] Al menos un perfil administrador puede inicializarse de forma segura.
- [x] Las actions protegidas pueden validar roles mediante Prisma.
- [x] La falta de perfil tiene un error claro o un camino explícito de setup.

**Dependencias/notas:** Depende de los Issues 2 y 3.

**Nota de verificación:** Verificado en la rama `feature/4-userprofile-role-bootstrap`: `UserProfile.id` sigue siendo el UUID de Supabase Auth, se agregó `username` único, `UserRole` separa `ADMIN`, `ADMIN_ASSISTANT` y `WORKER`, y `WorkerKind` separa clasificación laboral. Las actions/queries operativas usan helpers Prisma de perfil/rol, `/admin/setup-required` cubre perfiles faltantes, y `pnpm bootstrap:admin-profile` permite inicializar un perfil admin para un Auth user existente. `pnpm prisma migrate dev`, `pnpm lint`, `pnpm typecheck` y `pnpm build` ejecutan correctamente.

### Issue 5: Alta, búsqueda y edición básica de clientes

**Objetivo:** Agregar el flujo mínimo de gestión de clientes necesario antes de cotizaciones.

**Criterios de aceptación:**
- [x] Los administradores pueden crear clientes.
- [x] Los administradores pueden buscar clientes por identificadores útiles.
- [x] Los administradores pueden editar datos básicos de clientes.
- [x] La validación de entrada evita registros de cliente inválidos.

**Dependencias/notas:** Depende del Issue 4.

**Nota de verificación:** Verificado en la rama `feature/5-customer-basics`: existe `/admin/customers` para alta y búsqueda por nombre, email, teléfono, dirección o notas; existe `/admin/customers/[id]/edit` para editar datos básicos y estado; las queries/actions operativas usan `requireOperationalRole` y Prisma; la validación Zod normaliza campos opcionales vacíos y rechaza registros inválidos. `pnpm lint`, `pnpm typecheck` y `pnpm build` ejecutan correctamente.

### Issue 5.1: Entidad de Vehículo y vinculación en Cotizaciones

**Objetivo:** Agregar una entidad explícita de vehículo vinculada al cliente y congelar sus datos dentro de cada cotización para preservar el contexto del trabajo.

**Criterios de aceptación:**
- [x] Existe `Vehicle` como entidad operativa vinculada a `Customer`.
- [x] `Quote` puede referenciar opcionalmente un `Vehicle` y guarda `vehicleSnapshot` con placa, marca, modelo, color y año al momento de creación.
- [x] La creación de cotizaciones permite capturar placa, marca, modelo, color y año en línea, sin obligar al admin a registrar primero el vehículo en otra pantalla.
- [x] La creación de cotizaciones ejecuta un flujo `findOrCreateVehicle`: reutiliza el vehículo del cliente cuando la placa ya existe y crea uno nuevo cuando no existe.
- [x] El listado de cotizaciones muestra el vehículo asociado o el snapshot histórico disponible.
- [x] `pnpm lint`, `pnpm typecheck` y `pnpm build` ejecutan correctamente.

**Dependencias/notas:** Depende de los Issues 5, 6 y 7. Mantener la UI neutral y funcional hasta que Figma defina la línea visual final.

**Nota de verificación:** Verificado en la rama `feature/5-1-customer-vehicles`: Prisma agrega `Vehicle` vinculado a `Customer`, `Quote.vehicleId` opcional con `onDelete: SetNull` y `vehicleSnapshot` JSON; la creación de cotizaciones captura vehículo en línea y ejecuta `findOrCreateVehicle` dentro de la transacción antes de guardar la cotización; el listado de cotizaciones muestra vehículo vinculado o snapshot del vehículo. `pnpm prisma migrate dev --name add_customer_vehicles`, `pnpm lint`, `pnpm typecheck` y `pnpm build` ejecutan correctamente.

### Issue 5.2: Placas opcionales en cotización

**Objetivo:** Permitir cotizar cuando todavía no se conocen las placas del vehículo, conservando el modelo como dato mínimo.

**Criterios de aceptación:**
- [x] `Vehicle.plate` es opcional y no obliga a capturar placas falsas.
- [x] `Vehicle.brand` es opcional porque en algunas cotizaciones solo se conoce el modelo.
- [x] La creación de cotizaciones sigue requiriendo modelo del vehículo.
- [x] Si hay placas, el sistema reutiliza el vehículo por cliente y placa normalizada.
- [x] Si no hay placas, el sistema crea un vehículo nuevo sin deduplicar por marca/modelo/color.
- [x] El snapshot de la cotización conserva placa y marca como valores opcionales.

**Dependencias/notas:** Depende del Issue 5.1. Las placas podrán actualizarse después durante el reporte de trabajo del maestro.

**Nota de verificación:** Verificado en la rama `feature/5-2-optional-vehicle-plates`: Prisma elimina la unicidad global de placas y permite `plate`/`brand` nulos; la validación permite placas y marca vacías, pero mantiene `model` requerido; `findOrCreateVehicle` reutiliza solo por `customerId + plate` cuando hay placa y crea un vehículo nuevo cuando no la hay. `pnpm prisma migrate dev`, `pnpm lint`, `pnpm typecheck` y `pnpm build` ejecutan correctamente.

### Issue 6: Creación de cotización borrador con ítems, totales y validación Zod

**Objetivo:** Crear cotizaciones en borrador con líneas de detalle y totales confiables.

**Criterios de aceptación:**
- [x] Los administradores pueden crear una cotización borrador para un cliente.
- [x] Las cotizaciones soportan ítems con cantidad, precio unitario y subtotal.
- [x] Los totales se calculan consistentemente en el servidor.
- [x] La validación con Zod protege las entradas de cotización e ítems.

**Dependencias/notas:** Depende del Issue 5.

**Nota de verificación:** Verificado en la rama `feature/6-quote-draft`: existe `/admin/quotes` con formulario funcional para crear cotizaciones `DRAFT` para clientes existentes usando hasta 5 ítems simples; `createQuote` y `createQuoteFromForm` validan con Zod y calculan subtotales/totales en centavos del lado servidor; el listado de cotizaciones incluye cliente e ítems ordenados. `pnpm lint`, `pnpm typecheck` y `pnpm build` ejecutan correctamente.

### Issue 7: Aprobar cotización y crear `WorkOrder` transaccionalmente

**Objetivo:** Convertir una cotización aprobada en una orden de trabajo sin romper la regla de dominio.

**Criterios de aceptación:**
- [x] Una cotización solo puede aprobarse desde un estado borrador permitido.
- [x] Cada nuevo `WorkOrder` referencia exactamente una `Quote` aprobada.
- [x] La aprobación de la cotización y la creación del work order ocurren en una única transacción.
- [x] Se previenen work orders duplicados para la misma cotización aprobada.

**Dependencias/notas:** Depende del Issue 6. Este issue refuerza la separación central entre `Quote` y `WorkOrder`.

**Nota de verificación:** Verificado en la rama `feature/7-approve-quote-workorder`: existe `approveQuoteAndCreateWorkOrder` para aprobar solo cotizaciones `DRAFT`; la aprobación y creación de `WorkOrder` ocurren dentro de una transacción Prisma; `WorkOrder.quoteId` único previene duplicados y la UI de `/admin/quotes` permite aprobar borradores y muestra el work order vinculado. `pnpm lint`, `pnpm typecheck`, `pnpm build` y una lectura Prisma ligera de la relación cotización/work order ejecutan correctamente.

**Follow-up UI:** La acción de aprobar cotización debería usar un modal de confirmación cuando se implemente la capa visual real con Radix/Figma.

### Issue 7.5: Base de componentes UI con Figma + Radix

**Objetivo:** Establecer la capa base de componentes de interfaz tokenizada desde Figma, usando Radix como fundamento de accesibilidad y envolviéndolo en `src/components/ui` para que las pantallas no importen Radix directamente.

**Criterios de aceptación:**
- [x] Los tokens globales de color, radio, sombra, fondo suave, texto secundario, borde y estados se agregan a `src/app/globals.css` a partir de `DESIGN.md`.
- [x] Se instalan únicamente las dependencias de Radix que se usan: `@radix-ui/react-slot`, `@radix-ui/react-label`, `@radix-ui/react-checkbox`, `@radix-ui/react-select` y `@radix-ui/react-dialog`, más `clsx` para composición de clases.
- [x] Existen wrappers en `src/components/ui` para `Button`, `Label`, `Input`, `Textarea`, `Checkbox`, `Select`, `Dialog` (con `ConfirmDialog`), `Card`, `Badge`, `Table`, `Spinner` y `Skeleton`.
- [x] Cada wrapper que corresponde a un primitivo real de Radix lo usa por debajo (`Slot`, `Label`, `Checkbox`, `Select`, `Dialog`).
- [x] `src/components/ui/index.ts` exporta todos los componentes base de forma ordenada.
- [x] La pantalla `/admin/quotes` consume los wrappers en lugar de elementos HTML crudos, preservando comportamiento, validación y copia en español de México.
- [x] `DESIGN.md` o `docs/MVP_ISSUES.md` documenta que las pantallas futuras deben usar wrappers de `src/components/ui` y no importar Radix directamente.
- [x] `pnpm lint`, `pnpm typecheck` y `pnpm build` ejecutan correctamente después de los cambios.

**Dependencias/notas:** Depende del Issue 7. Debe completarse antes de aplicar la línea visual de Figma a pantallas adicionales. No implementa el Issue 8 ni cambia reglas de negocio.

**Nota de verificación:** Verificado en la rama `feature/7-5-ui-foundation-radix`: se instalaron las dependencias de Radix usadas; los tokens de `DESIGN.md` se reflejan en `src/app/globals.css`; los wrappers de `src/components/ui` usan Radix donde aplica; `/admin/quotes` consume los wrappers sin alterar la lógica de cotizaciones; y `pnpm lint`, `pnpm typecheck` y `pnpm build` ejecutan correctamente.

### Issue 7.6: Pantallas mobile-first con modo claro/oscuro Figma

**Objetivo:** Aplicar la línea visual de Figma a las pantallas operativas protegidas, priorizando móvil y soportando modo claro y oscuro sin romper comportamiento de negocio.

**Criterios de aceptación:**
- [x] `docs/MVP_ISSUES.md` registra el issue en español de México con criterios y nota de verificación.
- [x] `DESIGN.md` documenta el contrato de tema claro/oscuro: fondos con tinte azul en claro, superficies deep navy en oscuro, acentos azules y texto accesible en ambos modos.
- [x] El soporte de tema usa una solución compatible con Next.js que evite saltos de hidratación; el modo por defecto es claro y existe un interruptor visible en el shell admin.
- [x] El shell de rutas protegidas `/admin/*` es mobile-first: navegación inferior amigable para móvil, encabezado deep navy, iconografía consistente y áreas de toque ≥ 44 px.
- [x] Las pantallas `/admin`, `/admin/login`, `/admin/customers`, `/admin/customers/[id]/edit` y `/admin/quotes` usan tarjetas, listas y espaciado responsive; ya no lucen como formularios de escritorio neutros.
- [x] `/admin/quotes` conserva su comportamiento y campo de formulario; no se rediseña el constructor de cotizaciones más allá del ajuste visual general.
- [x] Los textos visibles de las pantallas tocadas usan español de México; los identificadores técnicos, nombres de archivo y código permanecen en inglés.
- [x] `pnpm test:ui`, `pnpm test:ui-contract`, `pnpm lint`, `pnpm typecheck` y `pnpm build` ejecutan correctamente.

**Dependencias/notas:** Depende del Issue 7.5. No implementa el Issue 8 ni cambia reglas de negocio.

**Nota de verificación:** Verificado en la rama `feature/7-6-mobile-first-figma-modes`: `DESIGN.md` incluye contrato de modo claro/oscuro; `next-themes` maneja el tema con `class` en `<html>` e interruptor accesible en español; el shell admin usa navegación inferior en móvil y encabezado deep navy con iconos de `lucide-react`; las pantallas operativas usan wrappers de `src/components/ui` y copia en español de México; no se importa Radix directamente en las páginas; `pnpm test:ui`, `pnpm test:ui-contract`, `pnpm lint`, `pnpm typecheck` y `pnpm build` ejecutan correctamente.

### Issue 7.7: Rediseño mobile-first del flujo de cotización

**Objetivo:** Reemplazar el formulario funcional de cotización por un flujo mobile-first alineado a Figma, sin cambiar las reglas de negocio ni los contratos de server actions.

**Criterios de aceptación:**
- [x] `/admin/quotes` permite crear cotizaciones mediante un flujo por pasos: cliente/unidad, conceptos, notas, resumen y preview/envío.
- [x] Los nombres de campos y contratos de `createQuoteFromForm` se preservan para cliente, vehículo, título, descripción, bandera administrativa e ítems.
- [x] La aprobación conserva `approveQuoteAndCreateWorkOrderFromForm`, `quoteId` oculto y prevención de doble envío mediante confirmación.
- [x] Las validaciones del builder bloquean avanzar con conceptos incompletos o inválidos antes de llegar a pasos ocultos.
- [x] Los totales visibles en cliente son solo preview; el cálculo autoritativo sigue ocurriendo en servidor.
- [x] La vista móvil usa cards y acciones táctiles; la vista de escritorio conserva una tabla alineada al diseño visual actual.
- [x] La copia visible usa español de México; los identificadores técnicos permanecen en inglés.
- [x] No se implementa el Issue 8 ni se agregan reglas de asignación/ejecución de work orders.
- [x] `pnpm test:ui-contract`, `pnpm test:ui`, `pnpm lint`, `pnpm typecheck` y `pnpm build` ejecutan correctamente.

**Dependencias/notas:** Depende de los Issues 7.5 y 7.6. El cambio se dividió en PRs encadenados por presupuesto de revisión: helpers/contract guard, formulario de aprobación y builder principal. El slice del builder tiene `size:exception` aprobado porque concentra estado del stepper, validación, tests y wiring de página en una unidad cohesiva.

**Nota de verificación:** Preparado en PRs encadenados #27, #28 y #29 vinculados al Issue GitHub #26. La re-revisión fresca pasó; el bloqueo inicial de tests se corrigió siguiendo el patrón existente de fallback de Radix Select en jsdom. Verificación final: `pnpm test:ui-contract`, `pnpm test:ui` (49 tests), `pnpm lint`, `pnpm typecheck` y `pnpm build` ejecutan correctamente.

### Issue 7.8: IVA y vigencia comercial en cotizaciones

**Objetivo:** Agregar IVA 16 % activado por defecto y vigencia comercial de 7 días para que la cotización tenga reglas comerciales claras antes de compartirse.

**Criterios de aceptación:**
- [ ] Las cotizaciones calculan IVA 16 % por defecto en servidor.
- [ ] La UI permite desactivar IVA con un interruptor explícito cuando aplique.
- [ ] Los totales muestran subtotal, IVA y total de forma clara.
- [ ] La cotización guarda o calcula una vigencia de 7 días.
- [ ] La salida al cliente muestra una nota de vigencia sujeta a cambios imprevistos en precios de materiales.

**Dependencias/notas:** Depende del Issue 7.7. Debe resolverse antes de compartir cotizaciones con clientes.

### Issue 7.9: Edición de cotizaciones en borrador

**Objetivo:** Permitir completar, corregir o eliminar cotizaciones antes de enviarlas al cliente.

**Criterios de aceptación:**
- [ ] Solo las cotizaciones en `BORRADOR` pueden editarse libremente.
- [ ] Se pueden editar cliente/unidad, notas, conceptos, cantidades y precios antes del envío.
- [ ] Los totales se recalculan en servidor después de guardar cambios.
- [ ] Se puede eliminar o cancelar un borrador sin afectar cotizaciones enviadas o aceptadas.
- [ ] La UI comunica claramente cuándo una cotización ya no es editable como borrador.

**Dependencias/notas:** Depende del Issue 7.8 para preservar el cálculo completo de totales.

### Issue 7.10: Filtros operativos en cotizaciones y clientes

**Objetivo:** Agregar filtros y búsqueda consistentes para que la operación encuentre información sin depender del orden cronológico.

**Criterios de aceptación:**
- [ ] Cotizaciones pueden filtrarse por estado, cliente, folio, placa y rango de fechas.
- [ ] Clientes pueden buscarse o filtrarse por nombre, teléfono, email, dirección y placas relacionadas cuando estén disponibles.
- [ ] Los filtros funcionan bien en móvil y escritorio.
- [ ] El estado vacío explica cómo limpiar filtros o crear nuevos registros.
- [ ] La lógica de filtros queda preparada para extenderse a trabajos, pagos y nómina.

**Dependencias/notas:** Puede hacerse después del Issue 7.7 y antes del flujo público de cotización.

### Issue 7.11: Compartir cotización con link tokenizado

**Objetivo:** Permitir que una cotización lista se comparta con el cliente mediante un link seguro, expirable y de solo lectura.

**Criterios de aceptación:**
- [ ] Solo cotizaciones válidas y completas pueden compartirse.
- [ ] Al compartir, la cotización cambia a `ENVIADA` (`SENT`) o estado equivalente.
- [ ] El sistema genera un token persistido o firmado, revocable y con expiración.
- [ ] Existe una ruta pública de solo lectura para revisar folio, cliente, vehículo, conceptos, montos, vigencia y estado.
- [ ] El sistema maneja token inválido, revocado o expirado con mensajes claros.

**Dependencias/notas:** Depende de los Issues 7.8 y 7.9. No inicia trabajo ni asigna maestro.

### Issue 7.12: Aceptación o declinación de cotización por cliente

**Objetivo:** Registrar la decisión del cliente o la autorización administrativa sobre una cotización compartida bajo una regla todo/nada.

**Criterios de aceptación:**
- [ ] El cliente puede aceptar o declinar la cotización completa desde el link público.
- [ ] Antes del Issue GitHub #37, la aceptación del link público es completa; la autorización parcial se habilita después mediante secciones controladas.
- [ ] La aceptación por cliente cambia la cotización a `ACEPTADA` (`APPROVED`) o estado equivalente.
- [ ] La declinación cambia la cotización a `DECLINADA` o estado equivalente acordado.
- [ ] Si el cliente aceptó por fuera del link (p. ej. teléfono, WhatsApp o presencial), el admin puede marcar la cotización como autorizada. No es un flujo aparte: usa el mismo registro de cotización/alcance.
- [ ] La autorización administrativa requiere una nota obligatoria con canal/motivo (p. ej. "autorización por teléfono") y queda auditada.
- [ ] La evidencia inicial en la autorización administrativa es opcional.
- [ ] Tanto la aceptación del cliente como la autorización administrativa mueven la cotización a `ACEPTADA` y habilitan el paso a `ESPERA`.
- [ ] La decisión queda registrada con fecha, origen y estado resultante.
- [ ] Una cotización expirada no puede aceptarse sin intervención administrativa.

**Dependencias/notas:** Depende del Issue 7.11. La aceptación o autorización administrativa habilita el estado `ESPERA` y el inicio de trabajo del Issue 8.

### Issue 8: Asignación administrativa de `WorkOrder` y registros de ejecución

**Objetivo:** Iniciar el trabajo de una cotización aceptada o autorizada administrativamente, pasando por `ESPERA`, asignar maestro/ayudantes y registrar progreso de ejecución desde el panel admin para operaciones de campo.

> **Nota de alcance (GitHub #65):** en el MVP inmediato el registro de trabajadores, asignaciones y ejecución es **admin-led**. El admin asigna maestro/ayudantes, captura quién realizó el trabajo y registra avances/extras para accountability, nómina y cuenta del cliente. El trabajador no inicia sesión ni usa una app propia (`/mis-trabajos`, `/mi-nomina`) en el MVP inmediato; ese self-service queda para post-MVP. El libro físico del taller puede coexistir durante la adopción temprana.

**Criterios de aceptación:**
- [ ] Tras la aceptación del cliente o la autorización administrativa, la cotización/orden pasa a `ESPERA`.
- [ ] Solo una cotización en `ESPERA` puede pasar a `EN_PROCESO` o generar/activar su `WorkOrder` operativo.
- [ ] La transición de `ESPERA` a `EN_PROCESO` requiere confirmar espacio del taller y disponibilidad de maestro.
- [ ] Los administradores pueden asignar 1 Maestro obligatorio y N Ayudantes opcionales.
- [ ] Se pueden agregar registros de ejecución con fecha, notas, avance, trabajador vinculado y detalles relevantes para el estado.
- [ ] Los registros de ejecución se empatan contra la cotización y el `WorkOrder` correcto.
- [ ] Los extras quedan identificados como adicionales y sujetos a control administrativo.
- [ ] El estado del work order refleja asignación, progreso y bloqueo de cambios inseguros.
- [ ] Los registros quedan vinculados al `WorkOrder` correcto.
- [ ] No se implementa login ni app de trabajador; el registro es capturado por el admin.

**Dependencias/notas:** Depende del Issue 7.12. La asignación de maestro/ayudantes no pertenece al borrador de cotización; ocurre al pasar de `ESPERA` a `EN_PROCESO`, una vez confirmados espacio del taller y disponibilidad de maestro. En el MVP inmediato el admin es quien captura asignación y ejecución; el self-service del trabajador es post-MVP. Ver GitHub #65.

### Issue 9: Finalizar `WorkOrder` y generar PDF/salida final de orden

**Objetivo:** Cerrar trabajo completado y generar la salida final operativa del trabajo, separada del cierre comercial inicial de la cotización.

**Criterios de aceptación:**
- [ ] Un work order solo puede finalizarse desde un estado permitido.
- [ ] La salida final incluye cliente, cotización aprobada, work order, ítems, totales y resumen de ejecución.
- [ ] La salida final distingue el alcance cotizado de extras autorizados durante la ejecución.
- [ ] La salida final puede generarse como PDF o en el formato de documento de orden acordado.
- [ ] Los work orders finalizados quedan protegidos contra ediciones inseguras.

**Dependencias/notas:** Depende del Issue 8.

### Issue 10: Verificación de instalabilidad PWA

**Objetivo:** Confirmar que el MVP funciona como PWA instalable en Chrome para Android.

**Criterios de aceptación:**
- [ ] El manifest y los íconos de la app están configurados.
- [ ] Se cumplen los criterios del prompt de instalación en Chrome para Android.
- [ ] Las rutas operativas centrales se comportan aceptablemente al abrir la PWA instalada.
- [ ] Lighthouse o una herramienta equivalente confirma los requisitos básicos de instalabilidad.

**Dependencias/notas:** Puede empezar cuando exista el shell básico de la app; la verificación final debería hacerse después del Issue 9.

### Issue 11: Pipeline de despliegue en Vercel con `migrate deploy` explícito

**Objetivo:** Desplegar el MVP de forma segura sin esconder migraciones dentro del build de Next.js.

**Criterios de aceptación:**
- [ ] El proyecto Vercel tiene las variables de entorno requeridas para Supabase y Prisma.
- [ ] El proceso de release ejecuta `pnpm db:migrate:deploy` explícitamente antes del despliegue de la app.
- [ ] `pnpm build` se ejecuta sin aplicar migraciones.
- [ ] Una rama de release puede promoverse a `main` mediante PR.

**Dependencias/notas:** Depende del Issue 2 y debería verificarse antes del primer release listo para producción.

### Issue 12: Localización del sistema a español de México

**Objetivo:** Asegurar que toda la experiencia operativa visible para usuarios de SEBASAM use español de México consistente.

**Criterios de aceptación:**
- [ ] Las pantallas administrativas usan español de México en títulos, etiquetas, botones, mensajes de error y estados visibles.
- [ ] Todos los módulos operativos visibles al usuario usan español de México: cotizaciones, clientes, trabajos, cobros, estado de cuenta y nómina cuando existan.
- [ ] Los textos operativos evitan anglicismos innecesarios cuando exista una opción natural en español de México.
- [ ] Los mensajes de validación mostrados al usuario están localizados.
- [ ] Los identificadores técnicos, nombres de archivos, código y migraciones permanecen en inglés salvo que el contexto del proyecto indique lo contrario.

**Dependencias/notas:** Puede hacerse por etapas mientras se tocan pantallas existentes, pero antes del primer release de producción debe revisarse de punta a punta.

### Issue GitHub #42: Página pública de datos de pago (`/datos-de-pago/[token]`)

**Objetivo:** Implementar la página pública donde el cliente accede a los datos de pago de una `PaymentRequest` mediante un token seguro, con opción de capturar o confirmar datos fiscales cuando se requiera factura.

**Criterios de aceptación:**
- [ ] La ruta pública `/datos-de-pago/[token]` resuelve el `PaymentRequest` por su token.
- [ ] Muestra estados de error claros para token inválido, expirado o cancelado.
- [ ] El cliente puede decidir si requiere factura; la decisión se registra en `PaymentRequest.requiresInvoice`.
- [ ] Si no requiere factura: muestra directamente los datos de pago y el botón/contacto de WhatsApp para enviar el comprobante.
- [ ] Si requiere factura: muestra formulario para capturar o confirmar datos fiscales (razón social, RFC, código postal, domicilio, email, teléfono); guarda o actualiza `CustomerFiscalProfile` y almacena un `fiscalSnapshot` en `PaymentRequest`.
- [ ] Tras capturar datos fiscales, muestra los datos de pago y el contacto de WhatsApp para enviar el comprobante.
- [ ] El comprobante se envía por WhatsApp; no se implementa upload ni storage de archivos en el MVP.
- [ ] La UI sigue la línea visual de Figma: header con gradiente SEBASAM, layout desktop+mobile, cards de transferencia/contacto/nota y footer oscuro.
- [ ] Los componentes necesarios se reutilizan o crean en `src/components/ui` y `src/features/payment-requests`.
- [ ] `pnpm lint`, `pnpm typecheck` y `pnpm build` ejecutan correctamente.

**Dependencias/notas:** Depende del Issue GitHub #41 (`PaymentRequest`, `CustomerFiscalProfile` y domain/actions ya integrados en `develop`). El backend puede requerir extender `CustomerFiscalProfile` para régimen fiscal, uso CFDI y tipo de persona (física/moral) durante o antes de este issue. Prepara terreno para el Issue GitHub #43 (vista pública de cotización/documento compartido y flujo de aceptación).

**Fuera de alcance:** Subida de comprobante de pago, conciliación automática de pagos, facturación SAT automática, edición admin de datos bancarios desde esta pantalla.

### Issue GitHub #37: Flujo de pago y autorización parcial de cotizaciones

**Objetivo:** Separar el flujo de datos de pago de la aceptación de cotización, permitir autorización parcial por secciones sin perder la distinción operativa entre aceptada, espera y en progreso.

**Criterios de aceptación:**
- [ ] El flujo de datos de pago es independiente de la aceptación de la cotización.
- [ ] Si la cotización no requiere factura, los datos de pago se muestran directamente al cliente.
- [ ] Si la cotización requiere factura, se solicitan los datos fiscales faltantes del cliente o se confirman los existentes antes de mostrar los datos de pago.
- [ ] El modelo de cotización soporta secciones o grupos de conceptos; cada sección tiene su propio subtotal y la cotización conserva un total final único.
- [ ] La experiencia de autor del cotizador se construye por secciones desde el inicio: la acción principal es **Agregar sección**, y dentro de cada sección se agregan conceptos con **Agregar concepto**. Los subtotales por sección y el total de la cotización se calculan automáticamente. Las acciones visibles para el cliente son **Autorizar sección** y **Autorizar cotización completa**. La agrupación retrospectiva de conceptos queda fuera del flujo principal del MVP y podría considerarse como una acción avanzada posterior.
- [ ] El cliente puede autorizar una o más secciones sin autorizar la cotización completa.
- [ ] Las secciones autorizadas no se modelan como cotizaciones separadas por defecto; se mantiene una sola cotización cliente con autorización a nivel sección.
- [ ] Se preserva la distinción operativa existente: una vez autorizada toda la cotización o las secciones necesarias, la orden sigue pasando por `ACEPTADA` → `ESPERA` → `EN_PROGRESO`.

**Dependencias/notas:** Depende de los Issues 7.11 y 7.12 (compartir y aceptación/declinación). Reemplaza la regla de aceptación todo/nada por autorización parcial controlada. El detalle de secciones debe reflejarse en `docs/ARCHITECTURE.md` y en el modelo de dominio del README.
