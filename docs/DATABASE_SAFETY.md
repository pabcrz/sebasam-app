# Seguridad de migraciones y respaldos

`db:migrate:dev` sólo puede usar Postgres local. Las migraciones remotas revisadas se aplican con `db:migrate:deploy`; no es una herramienta de recuperación ni de reset.

## Ruta segura

1. Para crear una migración, configurá **ambas** URLs de Prisma hacia `localhost`, `127.0.0.1` o `[::1]`.
2. Ejecutá `pnpm db:migrate:dev -- --name nombre-de-la-migracion`.
3. Revisá y versioná la migración; antes de aplicarla remotamente creá un respaldo verificable.
4. Durante el release, ejecutá `pnpm db:migrate:deploy` como paso explícito.

El guard falla antes de invocar Prisma si falta `DATABASE_URL` o `DIRECT_URL`, si una URL no es PostgreSQL válida o si apunta a Supabase, un pooler u otro host remoto. No se permiten aliases Docker adicionales: el equipo debe usar los loopbacks explícitos para que el límite sea auditable.

## Respaldo local

Ejecutalo manualmente desde una máquina con el cliente de PostgreSQL (`pg_dump`, versión igual o mayor a la del servidor), `DIRECT_URL` en el entorno o en `.env` y un destino absoluto, por ejemplo una USB montada. No requiere Docker ni la CLI de Supabase. Si tu `pg_dump` por defecto es de una versión anterior, apunta `PG_DUMP` al binario correcto (por ejemplo `PG_DUMP=/opt/homebrew/opt/postgresql@17/bin/pg_dump`):

```bash
pnpm db:backup:public -- --destination /Volumes/SEBASAM-BACKUPS
```

El comando crea un directorio fechado con estos archivos verificados como no vacíos:

| Archivo | Contenido |
|---|---|
| `public-schema.sql` | Esquema `public` mediante `pg_dump --schema-only`. |
| `public-data.sql` | Datos de `public` mediante `pg_dump --data-only --disable-triggers` (hay tablas con claves foráneas circulares). |
| `manifest.json` | Alcance, archivos y hashes generados. |
| `SHA256SUMS` | Checksums SHA-256 de los dumps SQL. |

Las credenciales se pasan a `pg_dump` por variables `PG*`, no por argumentos; no se escriben en el manifiesto ni en los logs. Si un dump falla, el directorio parcial se elimina.

## Límites del respaldo

El respaldo cubre únicamente `public`. Supabase Auth y Storage administrados **no están incluidos** y requieren una exportación separada con el procedimiento autorizado para cada servicio. No uses `db:migrate:deploy`, migraciones de desarrollo ni un reset como sustituto de restauración.

## Política de perímetro y RLS

1. **Tablas nuevas en Prisma:** Toda tabla nueva generada en el esquema `public` mediante Prisma debe incorporar `ENABLE ROW LEVEL SECURITY` en su migración y verificar que los `ALTER DEFAULT PRIVILEGES` sigan vigentes.
2. **Límite del modelo de amenazas:** Esta configuración bloquea únicamente los roles `anon` y `authenticated` de PostgREST. `SUPABASE_SERVICE_ROLE_KEY` bypassa RLS por diseño en PostgreSQL/Supabase y debe vivir exclusivamente server-side (nunca en bundles de cliente ni variables públicas). Si esa clave se filtra, el perímetro de base de datos no la detiene.
3. **Mecanismo de excepción (escape hatch):** Cualquier exposición futura a través de PostgREST (por ejemplo, suscripciones de Realtime, accesos de Storage o un portal tokenizado en `/c/[token]`) debe ser deliberada, documentada y explícita: requiere un `GRANT` específico y una política RLS (`CREATE POLICY`) restringida por tabla. Nunca debe exponerse acceso por defecto.

## Checklist de release

- [ ] La migración fue revisada y está versionada.
- [ ] Existe un directorio de respaldo `public` verificado fuera de la máquina de trabajo.
- [ ] Auth y Storage se exportaron por separado cuando correspondía.
- [ ] `pnpm db:migrate:deploy` se ejecutará sólo para aplicar la migración revisada.
