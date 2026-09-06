/**
 * CLI importer for historical work batches (schemaVersion 2).
 *
 * Usage:
 *   pnpm historical:import ./data/historico-2026-01.json
 *   pnpm historical:import ./data/historico-2026-01.json --dry-run
 *
 * Dry run validates, reports detected/valid/duplicate/errors and the distinct
 * item types and descriptions without inserting or calling the provider.
 */
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { importHistoricalPayload, HistoricalImportError } from "../src/features/historical/importer";
import { createGeminiProvider, ProviderError } from "../src/features/historical/provider";

async function main() {
  try {
    process.loadEnvFile();
  } catch {
    // .env es opcional; las variables faltantes se reportan como errores de config.
  }

  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      "dry-run": { type: "boolean", default: false },
    },
  });

  function fail(message: string, code: number): never {
    console.error(`✗ ${message}`);
    process.exit(code);
  }

  if (positionals.length !== 1) {
    fail("Uso: tsx scripts/import-historical.ts <archivo.json> [--dry-run]", 2);
  }

  const filePath = positionals[0];
  const dryRun = values["dry-run"] === true;

  let payload: unknown;
  try {
    const raw = await readFile(filePath, "utf8");
    payload = JSON.parse(raw);
  } catch (error) {
    fail(`El archivo ${filePath} no es JSON válido: ${error instanceof Error ? error.message : String(error)}`, 2);
  }

  let provider;
  if (!dryRun) {
    try {
      provider = createGeminiProvider();
    } catch (error) {
      fail(error instanceof ProviderError ? error.message : String(error), 2);
    }
  }

  try {
    const report = await importHistoricalPayload({ payload, dryRun, provider });

    if (report.parseError) {
      fail(`Error de esquema: ${report.parseError}`, 1);
    }

    console.log(`Lote: ${report.batchId} (fuente: ${report.source}, schemaVersion: ${report.schemaVersion})`);
    console.log(
      `Trabajos: detectados ${report.detectedWorks} · válidos ${report.validWorks} · duplicados ${report.duplicateWorks} · con error ${report.errorWorks}`,
    );
    console.log(
      `Conceptos: importados ${report.importedItems} · duplicados ${report.duplicatedItems}${dryRun ? " (dry-run: no se insertó nada)" : ""}`,
    );
    console.log(`Tipos detectados: ${report.distinctItemTypes.join(", ") || "ninguno"}`);
    console.log(`Conceptos detectados (${report.distinctDescriptions.length}):`);
    for (const description of report.distinctDescriptions) {
      console.log(`  - ${description}`);
    }
    console.log("Detalle por trabajo:");
    for (const work of report.works) {
      const statusIcon = work.status === "imported" ? "✓" : work.status === "duplicate" ? "↻" : "✗";
      console.log(`  ${statusIcon} ${work.ref} — ${work.status}${work.error ? ` (${work.error})` : ""}`);
    }

    process.exitCode = report.errorWorks > 0 ? 1 : 0;
  } catch (error) {
    if (error instanceof HistoricalImportError) {
      fail(error.message, 1);
    }
    throw error;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "La importación histórica falló.");
  process.exitCode = 1;
});