# Seguridad de migraciones y respaldos

`db:migrate:dev` sólo puede usar Postgres local. Las migraciones remotas revisadas se aplican con `db:migrate:deploy`; no es una herramienta de recuperación ni de reset.

## Ruta segura

1. Para crear una migración, configurá **ambas** URLs de Prisma hacia `localhost`, `127.0.0.1` o `[::1]`.
2. Ejecutá `pnpm db:migrate:dev -- --name nombre-de-la-migracion`.
3. Revisá y versioná la migración; antes de aplicarla remotamente creá un respaldo verificable.
4. Durante el release, ejecutá `pnpm db:migrate:deploy` como paso explícito.

El guard falla antes de invocar Prisma si falta `DATABASE_URL` o `DIRECT_URL`, si una URL no es PostgreSQL válida o si apunta a Supabase, un pooler u otro host remoto. No se permiten aliases Docker adicionales: el equipo debe usar los loopbacks explícitos para que el límite sea auditable.

## Respaldo local

Ejecutalo manualmente desde una máquina con el proyecto Supabase vinculado y con un destino absoluto, por ejemplo una USB montada:

```bash
pnpm db:backup:public -- --destination /Volumes/SEBASAM-BACKUPS
```

El comando crea un directorio fechado con estos archivos verificados como no vacíos:

| Archivo | Contenido |
|---|---|
| `public-schema.sql` | Esquema `public` mediante `supabase db dump --linked`. |
| `public-data.sql` | Datos de `public` mediante `supabase db dump --linked --data-only`. |
| `manifest.json` | Alcance, archivos y hashes generados. |
| `SHA256SUMS` | Checksums SHA-256 de los dumps SQL. |

No se escriben URLs ni credenciales en el comando, el manifiesto o los logs del wrapper.

## Límites del respaldo

El respaldo cubre únicamente `public`. Supabase Auth y Storage administrados **no están incluidos** y requieren una exportación separada con el procedimiento autorizado para cada servicio. No uses `db:migrate:deploy`, migraciones de desarrollo ni un reset como sustituto de restauración.

## Checklist de release

- [ ] La migración fue revisada y está versionada.
- [ ] Existe un directorio de respaldo `public` verificado fuera de la máquina de trabajo.
- [ ] Auth y Storage se exportaron por separado cuando correspondía.
- [ ] `pnpm db:migrate:deploy` se ejecutará sólo para aplicar la migración revisada.
