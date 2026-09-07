# Historical Work Import and Financial Assistant

Captura trabajos históricos de la libreta (dictado por voz, texto o Excel) por concepto — no por totales — y consultalos con el asistente. Cada trabajo se guarda completo en una sola transacción, con búsqueda semántica por concepto y agregación exacta sobre columnas reales.

## Quick path

1. Normalizá el dictado/Excel al JSON `schemaVersion 2` (plantilla abajo).
2. Importá desde la app (`/admin/historical`) o por CLI:
   ```bash
   pnpm historical:import ./data/historico-2026-01.json --dry-run
   pnpm historical:import ./data/historico-2026-01.json
   ```
3. Preguntá en el asistente (`/asistente`), p. ej. “¿Cuánto cobramos por cambiar bujes?” o “¿Cuánto generó Luis en enero?”.

## Plantilla de captura definitiva

**Dictado por voz (conceptos por línea):**

> Trabajo E-01. Fecha 8 enero 2026. Cliente Juan Pérez. Nissan NP300 ABC123. Maestro Luis. Mano de obra: bajar 2 muelles, 900. Mano de obra: cambiar bujes, 1200, taller 1000. Refacción: 4 tornillos, 200. Fin del trabajo.

**Columnas Excel:** `Trabajo | Fecha | Cliente | Unidad | Maestro | Tipo | Concepto | Cantidad | Importe | Taller`

- `Cantidad` solo para material/refacción (mano de obra nunca lleva cantidad).
- `Importe` es SIEMPRE el total de la línea; el unitario se deriva (`importe ÷ cantidad`) y es un precio real por pieza.
- `Taller` es la base de nómina (solo conceptos de mano de obra). La diferencia con el importe al cliente NO es ganancia ni margen.

## JSON schemaVersion 2

```json
{
  "schemaVersion": 2,
  "batch": { "id": "libreta-2026-01", "source": "voice" },
  "works": [
    {
      "ref": "E-01",
      "date": "2026-01-08",
      "customer": { "name": "Juan Pérez", "plate": "ABC123", "brand": "Nissan", "model": "NP300" },
      "master": "Luis",
      "items": [
        { "type": "LABOR", "description": "Cambiar bujes", "customerPrice": 1200, "payrollBase": 1000, "ratePercent": 50 },
        { "type": "REFACCIONES", "description": "4 tornillos", "quantity": 4, "customerPrice": 200 },
        { "type": "REFACCIONES", "description": "Kit de pernos de dirección", "quantity": 1, "customerPrice": 850, "isKit": true }
      ]
    }
  ]
}
```

| Campo | Regla |
|-------|-------|
| `schemaVersion` | Debe ser `2`. |
| `batch.id` | Identificador del lote; junto con `ref` define la idempotencia. |
| `batch.source` | `voice` \| `text` \| `excel`. |
| `date` | `YYYY-MM-DD`. |
| `customer.*` / `master` | Opcionales; valores vacíos o ausentes se guardan como `null`, nunca se adivinan. |
| `items[].type` | `LABOR` \| `MATERIAL` \| `REFACCIONES` \| `OTHER` (enum existente). |
| `customerPrice`, `payrollBase` | Totales de línea en pesos (decimal). Se convierten a centavos enteros al ingerir. |
| `ratePercent` | 1–100. Si se omite en mano de obra, se deriva de la descripción: 50 general / 40 soldadura/soplete/oxicorte (semántica del dominio de nómina). Se permite override explícito. |

## Reglas de negocio (exactas)

| Concepto | Cantidad | Importe | Base taller | % comisión |
|----------|----------|---------|-------------|------------|
| LABOR (siempre nómina) | ❌ nunca | opcional | opcional | derivado 50/40 o explícito |
| OTHER + `includeInPayroll: true` | ❌ nunca | opcional | opcional | derivado o explícito |
| MATERIAL / REFACCIONES | ✅ obligatoria | ✅ obligatorio | se ignora (queda `null`) | se ignora (queda `null`) |
| OTHER sin nómina | ✅ obligatoria | ✅ obligatorio | se ignora | se ignora |

- **Kit**: si la descripción contiene “kit” o `isKit: true`, el importe NUNCA se divide; el unitario es el total del kit.
- **Unitario derivado** = `importe ÷ cantidad` (precio real por pieza), solo partes; se expone como dato derivado en consultas y respuestas.
- **Comisión** = `base_taller × ratePercent / 100` (redondeada), calculada en tiempo de consulta. NUNCA se almacena.
- **Comisión generada ≠ dinero pagado**: el asistente dice “generó/comisionó”, nunca “recibió”.
- **Idempotencia**: por `(batch.id, ref)` para trabajos y por `content_hash` para conceptos. Reimportar el mismo lote no duplica nada.

## CLI

```bash
pnpm historical:import ./data/historico-2026-01.json --dry-run   # valida, no inserta, no llama al proveedor
pnpm historical:import ./data/historico-2026-01.json             # valida, embebe e inserta
```

El dry-run reporta: trabajos detectados/válidos/duplicados/con error, tipos de concepto distintos, descripciones distintas y el detalle por trabajo. No requiere `GEMINI_API_KEY`.

## Flujo de la app (mobile-first)

1. **Pegar o subir**: textarea para pegar JSON y/o input de archivo `.json`.
2. **Revisar**: parseo + validación; tarjetas editables por trabajo (fecha, cliente/unidad, maestro) y por concepto con las primitivas UI existentes. Correcciones en formularios, nunca editando JSON a mano. Maestros resueltos por `displayName` cuando es inequívoco; si no, quedan como texto libre.
3. **Confirmar**: resumen (trabajos, conceptos, rango de fechas, posibles duplicados) y botón explícito. Inserta transaccionalmente (un trabajo = una transacción; si un concepto falla, falla el trabajo completo, sin conceptos huérfanos) y muestra resultado.

## Asistente (`/asistente`, API `POST /api/assistant/chat`)

Flujo: extracción de filtros (marca, modelo, concepto/tipo, maestro, rango de fechas, `wantsStats`) → agregación SQL exacta si pide estadísticas → búsqueda semántica por embeddings de concepto (3–5 fuentes) → respuesta combinando ambas, citando fuentes `[1]`, `[2]`… y etiquetando `[capturado]` / `[derivado]` / `[desconocido]`.

- Muestra línea original (cantidad × total) y unitario derivado real para partes; kits sin dividir.
- Nunca inventa precios, fechas, vehículos ni maestros; si falta un dato, lo dice.
- Panel de fuentes expandible por respuesta con el contenido original del concepto y su contexto de trabajo.

## Modelo de datos

| Tabla | Notas |
|-------|-------|
| `historical_works` | `UNIQUE(batch_id, work_ref)`, índice por `work_date`. |
| `historical_work_items` | `embedding vector(1536)` NOT NULL, `content_hash` único, índice `(type, description)`. |

Los embeddings se insertan por SQL crudo (Prisma no escribe columnas `Unsupported`), dentro de la misma transacción del trabajo. No hay índices ivfflat/hnsw (volumen pequeño; búsqueda secuencial).

## Seguridad / RLS

- RLS habilitado en ambas tablas: `authenticated` puede `select/insert/update`; `service_role` todo. Prisma (owner) bypassa RLS por defecto.
- `GEMINI_API_KEY` y modelos son server-only (`.env.example`); nunca `NEXT_PUBLIC_*`.
- El endpoint del asistente reutiliza `requireOperationalRole`; la importación también.

## Limitaciones

- Sin ivfflat/hnsw: la búsqueda semántica escala linealmente con el volumen.
- `content_hash` incluye `batch_id + ref` + contenido: dos conceptos idénticos dentro del MISMO trabajo se consideran duplicados (línea repetida accidental). Si alguna vez es legítimo, se necesita una columna de índice de línea.
- La resolución de maestro por `displayName` es solo informativa para la UI; el dato fuerte es el nombre capturado.
- El asistente depende del proveedor Gemini; sin `GEMINI_API_KEY` responde que no está configurado.

## Fuera de alcance (v2)

- Cobros/abonos con fechas y saldos por cliente.
- Simulación de sueldo base + comisión (acá solo se generan los datos para evaluarla).
- OCR de fotografías, captura por Telegram, auditoría de ajustes de base taller.