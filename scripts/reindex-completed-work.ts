/**
 * Indexes completed work orders for the assistant (backfill and retry of failures).
 *
 * Usage: pnpm assistant:reindex
 */
import { reindexCompletedWorkKnowledge } from "../src/features/completed-work-knowledge/service";
import { createGeminiProvider, ProviderError } from "../src/features/historical/provider";

async function main() {
  try {
    process.loadEnvFile();
  } catch {
    // .env es opcional; las variables faltantes se reportan como errores de config.
  }

  let provider;
  try {
    provider = createGeminiProvider();
  } catch (error) {
    console.error(`✗ ${error instanceof ProviderError ? error.message : String(error)}`);
    process.exit(2);
  }

  const result = await reindexCompletedWorkKnowledge(provider);
  console.log(`Órdenes: ${result.orders} · indexados: ${result.indexed} · fallidos: ${result.failed} · omitidos: ${result.skipped}`);
  process.exit(result.failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(`✗ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
