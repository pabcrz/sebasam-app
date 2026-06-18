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

**Objetivo:** Agregar una entidad explícita de vehículo vinculada al cliente y congelar sus datos dentro de cada cotización para preservar el contexto histórico del trabajo.

**Criterios de aceptación:**
- [x] Existe `Vehicle` como entidad operativa vinculada a `Customer`.
- [x] `Quote` puede referenciar opcionalmente un `Vehicle` y guarda `vehicleSnapshot` con placa, marca, modelo, color y año al momento de creación.
- [x] La creación de cotizaciones permite capturar placa, marca, modelo, color y año en línea, sin obligar al admin a registrar primero el vehículo en otra pantalla.
- [x] La creación de cotizaciones ejecuta un flujo `findOrCreateVehicle`: reutiliza el vehículo del cliente cuando la placa ya existe y crea uno nuevo cuando no existe.
- [x] El listado de cotizaciones muestra el vehículo asociado o el snapshot histórico disponible.
- [x] `pnpm lint`, `pnpm typecheck` y `pnpm build` ejecutan correctamente.

**Dependencias/notas:** Depende de los Issues 5, 6 y 7. Mantener la UI neutral y funcional hasta que Figma defina la línea visual final.

**Nota de verificación:** Verificado en la rama `feature/5-1-customer-vehicles`: Prisma agrega `Vehicle` vinculado a `Customer`, `Quote.vehicleId` opcional con `onDelete: SetNull` y `vehicleSnapshot` JSON; la creación de cotizaciones captura vehículo en línea y ejecuta `findOrCreateVehicle` dentro de la transacción antes de guardar la cotización; el listado de cotizaciones muestra vehículo vinculado o snapshot histórico. `pnpm prisma migrate dev --name add_customer_vehicles`, `pnpm lint`, `pnpm typecheck` y `pnpm build` ejecutan correctamente.

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

### Issue 8: Asignación de `WorkOrder` y registros de ejecución

**Objetivo:** Asignar trabajo y registrar progreso de ejecución para operaciones de campo.

**Criterios de aceptación:**
- [ ] Los administradores pueden asignar un work order a trabajadores o usuarios responsables.
- [ ] Se pueden agregar registros de ejecución con fecha, notas y detalles relevantes para el estado.
- [ ] El estado del work order refleja la asignación y el progreso de ejecución.
- [ ] Los registros quedan vinculados al `WorkOrder` correcto.

**Dependencias/notas:** Depende del Issue 7.

### Issue 9: Finalizar `WorkOrder` y generar PDF/salida final de orden

**Objetivo:** Cerrar trabajo completado y generar la salida final operativa o visible para el cliente.

**Criterios de aceptación:**
- [ ] Un work order solo puede finalizarse desde un estado permitido.
- [ ] La salida final incluye cliente, cotización aprobada, work order, ítems, totales y resumen de ejecución.
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
- [ ] Los textos operativos evitan anglicismos innecesarios cuando exista una opción natural en español de México.
- [ ] Los mensajes de validación mostrados al usuario están localizados.
- [ ] Los identificadores técnicos, nombres de archivos, código y migraciones permanecen en inglés salvo que el contexto del proyecto indique lo contrario.

**Dependencias/notas:** Puede hacerse por etapas mientras se tocan pantallas existentes, pero antes del primer release de producción debe revisarse de punta a punta.
