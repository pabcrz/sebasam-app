# Borrador de backlog del MVP

Este documento es un borrador revisable de planificación. Todavía no reemplaza a los issues del tracker. Usalo para acordar alcance, orden de trabajo y criterios de aceptación antes de abrir o implementar cada issue.

## Fuera del MVP

- Portal de clientes con acceso tokenizado.
- Libro contable completo.
- Nómina/liquidación de sueldos.
- Gestión estricta de inventario.

## Primer issue recomendado

Empezar por el **Issue 1: Endurecimiento del setup del proyecto y revisión de documentación de despliegue**. Reduce riesgo de configuración antes de que el esquema, la autenticación y el despliegue dependan de las mismas suposiciones de entorno.

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
- [ ] Las cadenas de conexión del proyecto Supabase están configuradas mediante `DATABASE_URL` y `DIRECT_URL`.
- [ ] Prisma tiene una migración inicial para las entidades centrales del MVP.
- [ ] El flujo de migraciones usa `prisma migrate dev` en local y `prisma migrate deploy` para releases.
- [ ] La generación de Prisma Client funciona después de aplicar la migración.

**Dependencias/notas:** Depende del Issue 1.

### Issue 3: Login con Auth y base de sesión admin

**Objetivo:** Establecer login con Supabase Auth y manejo de sesión server-side para usuarios administradores.

**Criterios de aceptación:**
- [ ] Existe un flujo de login para administradores.
- [ ] Las rutas/actions protegidas pueden leer la sesión del lado del servidor.
- [ ] Los usuarios no autenticados son redirigidos fuera de las pantallas operativas protegidas.
- [ ] Los helpers de autenticación no consultan tablas operativas de negocio directamente mediante clientes Supabase.

**Dependencias/notas:** Depende del Issue 2 si los registros de sesión necesitan vínculo con perfiles.

### Issue 4: `UserProfile` y bootstrap de roles

**Objetivo:** Guardar roles de la app y datos de perfil operativo en `UserProfile`.

**Criterios de aceptación:**
- [ ] `UserProfile` está vinculado con la identidad de Supabase Auth.
- [ ] Al menos un perfil administrador puede inicializarse de forma segura.
- [ ] Las actions protegidas pueden validar roles mediante Prisma.
- [ ] La falta de perfil tiene un error claro o un camino explícito de setup.

**Dependencias/notas:** Depende de los Issues 2 y 3.

### Issue 5: Alta, búsqueda y edición básica de clientes

**Objetivo:** Agregar el flujo mínimo de gestión de clientes necesario antes de cotizaciones.

**Criterios de aceptación:**
- [ ] Los administradores pueden crear clientes.
- [ ] Los administradores pueden buscar clientes por identificadores útiles.
- [ ] Los administradores pueden editar datos básicos de clientes.
- [ ] La validación de entrada evita registros de cliente inválidos.

**Dependencias/notas:** Depende del Issue 4.

### Issue 6: Creación de cotización borrador con ítems, totales y validación Zod

**Objetivo:** Crear cotizaciones en borrador con líneas de detalle y totales confiables.

**Criterios de aceptación:**
- [ ] Los administradores pueden crear una cotización borrador para un cliente.
- [ ] Las cotizaciones soportan ítems con cantidad, precio unitario y subtotal.
- [ ] Los totales se calculan consistentemente en el servidor.
- [ ] La validación con Zod protege las entradas de cotización e ítems.

**Dependencias/notas:** Depende del Issue 5.

### Issue 7: Aprobar cotización y crear `WorkOrder` transaccionalmente

**Objetivo:** Convertir una cotización aprobada en una orden de trabajo sin romper la regla de dominio.

**Criterios de aceptación:**
- [ ] Una cotización solo puede aprobarse desde un estado borrador permitido.
- [ ] Cada nuevo `WorkOrder` referencia exactamente una `Quote` aprobada.
- [ ] La aprobación de la cotización y la creación del work order ocurren en una única transacción.
- [ ] Se previenen work orders duplicados para la misma cotización aprobada.

**Dependencias/notas:** Depende del Issue 6. Este issue refuerza la separación central entre `Quote` y `WorkOrder`.

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
