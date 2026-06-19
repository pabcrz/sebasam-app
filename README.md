# SEBASAM Operations App

Aplicación operativa limpia para SEBASAM: cotizaciones, órdenes de trabajo, asignaciones y registro de ejecución. El objetivo del MVP es una PWA instalable en Android Chrome, no un APK.

## Resumen del proyecto

| Aspecto | Detalle |
|---|---|
| Propósito | Reemplazar búsquedas en archivos/PDF por una web app mobile-first donde los datos operativos vivan en base de datos. |
| Alcance implementado | Login admin, clientes, vehículos, cotizaciones en borrador, aprobación administrativa → orden de trabajo, PWA foundation. |
| Referencia visual | Figma — ver [`DESIGN.md`](./DESIGN.md). |
| Referencia de dominio | `prisma/schema.prisma`, [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) y este README. |
| Modelo operativo objetivo | `Quote` y `WorkOrder` separados; el flujo pendiente debe soportar aceptación/autorización, `ESPERA` antes de `EN_PROCESO` y trabajo urgente mediante autorización administrativa auditada. |
| Estado actual | Issues 1–7, 5.1 y 5.2 de [`docs/MVP_ISSUES.md`](./docs/MVP_ISSUES.md) completados; Issues 8–12 pendientes. Ver [`docs/MVP_STATUS.md`](./docs/MVP_STATUS.md). |

## Flujo operativo 🔄

Flujo operativo objetivo del MVP pendiente. Cada cotización debe ser **todo/nada**: el cliente acepta o declina el conjunto completo. Si el cliente acepta por fuera del link (p. ej. teléfono), el admin debe poder autorizar la cotización con una nota obligatoria; la evidencia inicial es opcional. La aceptación o autorización no debe iniciar el trabajo inmediatamente: la orden debe pasar a `ESPERA` hasta confirmar espacio del taller y disponibilidad de maestro.

```mermaid
flowchart LR
    A[Login] --> B[Cotización<br>BORRADOR]
    B --> C[Armar ítems + vehículo<br>+ evidencia inicial opcional]
    C --> D[Compartir:<br>ENVIADA]
    D --> E{Cliente responde<br>todo/nada}
    E -->|Acepta| F[ACEPTADA]
    E -->|Declina| G[DECLINADA]
    F --> H[WorkOrder<br>ESPERA]
    H --> I[Confirmar espacio + maestro<br>EN_PROCESO]
    I --> J[Asignar empleados]
    J --> K[Reportar ejecución<br>+ extras controlados]
    K --> L[Trabajo terminado]
    L --> M[Registrar cobros<br>ajustes, adeudo]
    M --> N[Ledger cliente]
    M --> O[Nómina semanal]
```

## Reglas de negocio 📋

| ID | Regla | Detalle |
|---|---|---|
| R1 | Estados de cotización objetivo | `BORRADOR` → `ENVIADA` → `ACEPTADA` / `DECLINADA`; el admin puede `CANCELADA` en cualquier momento permitido. Tras `ACEPTADA`, la orden debe pasar a `ESPERA` antes de `EN_PROCESO`. |
| R2 | Todo o nada | El cliente acepta o declina la cotización completa; no puede aceptar ítems parciales. |
| R3 | Token expirable | El link de cliente lleva token con vigencia; expirado → no se procesa la respuesta. |
| R4 | Aceptación/autorización → WorkOrder | Regla objetivo: toda orden de trabajo debe nacer de una cotización aceptada o autorizada administrativamente; debe crearse en `ESPERA` y pasar a `EN_PROCESO` al confirmar espacio y maestro. |
| R5 | Asignación controlada | Se asigna 1 maestro + N ayudantes; el empleado solo ve estado operativo y su trabajo. |
| R6 | Reporte de ejecución | El empleado registra avance empatado contra la cotización aceptada o autorizada administrativamente. |
| R7 | Extras controlados | Los extras son posibles, pero requieren registro, control y quedan vinculados a la orden. |
| R8 | Fin de trabajo | El trabajo termina cuando la ejecución cubre el alcance aprobado + extras autorizados. |
| R9 | Cobros, ajustes y adeudo | Se registran pagos con método, ajustes y saldo pendiente. |
| R10 | Ledger del cliente | Cada movimiento de pago o adeudo impacta el estado de cuenta del cliente. |
| R11 | Nómina semanal | La ejecución registrada alimenta el cálculo de nómina semanal. |
| R12 | Autorización administrativa | Regla objetivo: si el cliente aceptó por fuera del link (p. ej. teléfono), el admin debe marcar la cotización como autorizada con una nota obligatoria de canal/motivo. No es un flujo separado: usa el mismo registro de cotización/alcance. |
| R13 | Evidencia inicial | La evidencia inicial es opcional tanto en el borrador como en la autorización administrativa. |

## Modelo de datos operativo 🗂️

Este es el modelo de dominio que soporta el flujo. Las primeras entidades existen en `prisma/schema.prisma`; las últimas tres son el objetivo para pagos, ledger y nómina.

| Entidad | Rol | Relación clave | Estado en schema |
|---|---|---|---|
| `UserProfile` | Usuarios internos: admin, asistente, empleado | Tiene `assignments` y `executionRecords` | ✅ Implementado |
| `Customer` | Cliente del taller | Tiene `quotes` y `vehicles` | ✅ Implementado |
| `Vehicle` | Unidad del cliente | Pertenece a `Customer`; referenciado por `Quote` | ✅ Implementado |
| `Quote` | Cotización comercial | Tiene `QuoteItem`s; origen de `WorkOrder` | ✅ Implementado |
| `QuoteItem` | Línea de cotización: material, mano de obra, servicio externo, etc. | Pertenece a `Quote` | ✅ Implementado |
| `WorkOrder` | Orden de trabajo operativa | Implementado como orden vinculada a `Quote`; el flujo `ESPERA` y autorización administrativa auditada siguen pendientes | ✅ Implementado parcial |
| `WorkAssignment` | Asignación de empleado a orden | Vincula `UserProfile` y `WorkOrder` | ✅ Implementado |
| `ExecutionRecord` | Registro de ejecución/reporte | Vincula `WorkOrder` y `UserProfile` opcional | ✅ Implementado |
| `Payment` | Cobro registrado por el admin | Pendiente: vincular `Quote` / `WorkOrder` y `Customer` | 🎯 Objetivo |
| `LedgerEntry` | Movimiento de estado de cuenta del cliente | Pendiente: refleja pagos, ajustes y adeudos | 🎯 Objetivo |
| `WeeklyPayroll` | Nómina semanal calculada | Pendiente: deriva de `ExecutionRecord` y `WorkAssignment` | 🎯 Objetivo |

## Documentos del proyecto

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — reglas de arquitectura, capas y dominio.
- [`docs/GITFLOW.md`](./docs/GITFLOW.md) — flujo de ramas y PRs.
- [`docs/AI_WORKFLOW.md`](./docs/AI_WORKFLOW.md) — protocolo de trabajo con asistentes de IA.
- [`docs/MVP_ISSUES.md`](./docs/MVP_ISSUES.md) — borrador de backlog del MVP (solo lectura; no mover ni renombrar).
- [`docs/MVP_STATUS.md`](./docs/MVP_STATUS.md) — estado actual del MVP y brechas pendientes.
- [`DESIGN.md`](./DESIGN.md) — sistema de diseño, tokens y componentes basado en Figma.

## Estado de implementación (resumen)

- [x] Setup del proyecto, Prisma + Supabase, login, sesión admin, perfiles/roles.
- [x] CRUD básico de clientes con búsqueda.
- [x] Entidad `Vehicle` vinculada a cliente; placas opcionales; snapshot en cotización.
- [x] Crear cotización borrador con ítems, totales calculados en servidor y validación Zod.
- [x] Aprobar cotización y crear `WorkOrder` transaccionalmente.
- [ ] Asignar `WorkOrder` y registrar ejecución.
- [ ] Finalizar `WorkOrder` y generar PDF/salida final.
- [ ] Verificar instalabilidad PWA.
- [ ] Pipeline de despliegue en Vercel.
- [ ] Localización completa a español de México.

---

## Ruta rápida ⚡

1. Copiar `.env.example` a `.env` y completar los valores de Supabase.
2. Instalar dependencias con `pnpm install`.
3. Generar Prisma Client con `pnpm prisma:generate`.
4. Correr localmente con `pnpm dev`.

## Reglas de arquitectura 🏗️

| Tema | Regla |
|---|---|
| Stack | Next.js App Router, TypeScript strict, Tailwind, Prisma, Supabase Postgres/Auth/Storage, pnpm. |
| Acceso a datos | Usar Prisma para datos operativos de negocio. No consultar las mismas tablas de negocio mediante helpers de Supabase client. |
| Auth | Usar Supabase Auth para sesiones. Guardar roles de app y datos de perfil en `UserProfile`. |
| Cotizaciones y órdenes | Estado actual: `WorkOrder` nace de `Quote` aprobada. Objetivo pendiente: soportar autorización administrativa auditada y `ESPERA` antes de `EN_PROCESO`. |
| Disciplina de deploy | `build` ejecuta `prisma generate && next build`. Las migraciones nunca se esconden dentro de `next build`. |
| Repositorio | Mantener este repositorio privado. |
| Ramas | Seguir el Gitflow pragmático de `docs/GITFLOW.md`. |

## Environment variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Supabase pooled Postgres URL for runtime. |
| `DIRECT_URL` | Supabase non-transaction URL for Prisma CLI migrations: Direct connection preferred, Session pooler accepted when Direct is unreachable. |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser-safe Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser-safe Supabase anonymous key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional server-only key. Never expose it as `NEXT_PUBLIC_*`. |

## Commands

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm build
pnpm prisma:generate
pnpm db:migrate:dev
pnpm db:migrate:deploy
pnpm db:seed
pnpm bootstrap:admin-profile
pnpm auth:set-password
```

## Internal Auth users

SEBASAM uses username-style login for staff, while Supabase Auth still stores email-based
identities internally. The visible username `pablo` maps to `pablo@sebasam.local`.

For the MVP, staff accounts are controlled internally. Do not enable public sign-up.

Create a new internal Auth user or reset an existing user's password with the local/admin script:

```bash
AUTH_USERNAME="pablo" \
AUTH_PASSWORD="temporary-password" \
SUPABASE_SERVICE_ROLE_KEY="<server-only-service-role-key>" \
pnpm auth:set-password
```

If the Auth user already exists, pass its UUID to reset the password:

```bash
AUTH_USERNAME="pablo" \
AUTH_PASSWORD="new-temporary-password" \
AUTH_USER_ID="<supabase-auth-user-uuid>" \
SUPABASE_SERVICE_ROLE_KEY="<server-only-service-role-key>" \
pnpm auth:set-password
```

The service role key is server-only. Never commit it, never expose it to browser code, and never
prefix it with `NEXT_PUBLIC_`.

## Admin profile bootstrap

Supabase Auth owns identity and sessions. Create the Auth user manually in Supabase first,
using the internal email that matches the visible login username, for example
`sebas@sebasam.local` for username `sebas`.

Then create or update the matching app profile with Prisma:

```bash
BOOTSTRAP_AUTH_USER_ID="<supabase-auth-user-uuid>" \
BOOTSTRAP_USERNAME="sebas" \
BOOTSTRAP_EMAIL="sebas@sebasam.local" \
BOOTSTRAP_DISPLAY_NAME="Sebas" \
BOOTSTRAP_ROLE="ADMIN" \
pnpm bootstrap:admin-profile
```

The bootstrap script does not create Supabase Auth users and does not need a service role key.
It only upserts `UserProfile` for an existing Auth user id. `BOOTSTRAP_ROLE` accepts `ADMIN`
or `ADMIN_ASSISTANT`.

Future admin password management can become an app screen, but it must use Radix primitives and
Tailwind wrappers derived from the Figma design system instead of invented visual styling.

## Deploy pipeline

1. Set `DATABASE_URL`, `DIRECT_URL`, and Supabase public env vars in the deploy environment.
2. Run `pnpm db:migrate:deploy` as an explicit release step.
3. Run `pnpm build` to generate Prisma Client and build Next.js.
4. Start with `pnpm start` or the hosting platform equivalent.

## What not to do

- Do not commit `package-lock.json`; this project uses pnpm.
- Do not rename env vars away from `.env.example` without updating Prisma and Supabase helpers.
- Do not run `prisma migrate dev` in production.
- Do not add migrations to `next build`.
- Do not import the schema from the other repository wholesale.
- Do not implement the tokenized customer portal in the initial MVP.

## Reference

See:

- `docs/ARCHITECTURE.md` for the domain and layering rules.
- `docs/GITFLOW.md` for branch and PR workflow.
- `docs/AI_WORKFLOW.md` for AI assistant workflow, branch scope, commit discipline, and handoff rules.
- `docs/MVP_ISSUES.md` for the reviewable MVP issue backlog draft.
- `docs/MVP_STATUS.md` for the current gap analysis against the source MVP docs.
- `DESIGN.md` for the Figma-based design system.
