import type { QuoteItemType } from "@prisma/client";
import {
  computeHistoricalCommissionCents,
  computeUnitPriceCents,
} from "@/features/historical/domain";
import { createGeminiProvider, ProviderError } from "@/features/historical/provider";
import {
  aggregateHistoricalItems,
  matchHistoricalItems,
  type AggregateHistoricalItemsInput,
  type HistoricalAggregateRow,
  type HistoricalMatchSource,
} from "@/features/historical/repository";
import { formatCents } from "@/features/quotes/lib/format";

export interface AssistantFilters {
  brand: string | null;
  model: string | null;
  description: string | null;
  type: QuoteItemType | null;
  master: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  wantsStats: boolean;
}

export interface AssistantAnswer {
  answer: string;
  filters: AssistantFilters;
  sources: HistoricalMatchSource[];
  aggregation: HistoricalAggregateRow[] | null;
  envError: string | null;
}

export function emptyFilters(): AssistantFilters {
  return {
    brand: null,
    model: null,
    description: null,
    type: null,
    master: null,
    dateFrom: null,
    dateTo: null,
    wantsStats: false,
  };
}

const KNOWN_TYPES = new Set<QuoteItemType>(["LABOR", "MATERIAL", "REFACCIONES", "OTHER"]);

function toNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function normalizeType(value: unknown): QuoteItemType | null {
  if (typeof value !== "string") return null;
  const upper = value.trim().toUpperCase();
  return KNOWN_TYPES.has(upper as QuoteItemType) ? (upper as QuoteItemType) : null;
}

function normalizeDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim()) ? value.trim() : null;
}

/**
 * Parses the provider's filter-extraction JSON. Tolerates markdown fences.
 * Unknown or invalid values become null — never guessed.
 */
export function parseAssistantFilters(raw: string): AssistantFilters {
  const cleaned = raw.replace(/```json|```/gi, "").trim();
  let json: unknown;
  try {
    json = JSON.parse(cleaned);
  } catch {
    return emptyFilters();
  }
  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    return emptyFilters();
  }
  const record = json as Record<string, unknown>;
  return {
    brand: toNullableString(record.brand),
    model: toNullableString(record.model),
    description: toNullableString(record.description),
    type: normalizeType(record.type),
    master: toNullableString(record.master),
    dateFrom: normalizeDate(record.dateFrom),
    dateTo: normalizeDate(record.dateTo),
    wantsStats: record.wantsStats === true,
  };
}

const EXTRACTION_SYSTEM_PROMPT = `
Eres un extractor de filtros. Recibes una pregunta sobre trabajos históricos de un taller.
Responde ÚNICAMENTE con un objeto JSON con estas claves (todas opcionales, sin texto adicional):
{
  "brand": string | null,
  "model": string | null,
  "description": string | null,
  "type": "LABOR" | "MATERIAL" | "REFACCIONES" | "OTHER" | null,
  "master": string | null,
  "dateFrom": "YYYY-MM-DD" | null,
  "dateTo": "YYYY-MM-DD" | null,
  "wantsStats": boolean
}
- wantsStats=true solo si la pregunta pide totales, sumas, promedios, conteos, estacionalidad, ingresos o comisiones (por ejemplo "cuánto cobramos", "cuánto generó", "cuántos trabajos").
- Si un dato no aparece en la pregunta, pon null. Nunca inventes valores.
- "unidad", "coche", "camioneta" se refieren al vehículo (brand/model). "maestro", "sebas" o nombres propios van en master.
`.trim();

const ANSWER_SYSTEM_PROMPT = `
Eres el asistente del taller SEBASAM. Respondés en español, claro y breve, sobre trabajos históricos capturados de la libreta.
Tus únicas fuentes son los conceptos (con su contexto de trabajo) y la agregación exacta que se te entregan. NUNCA inventes precios, fechas, vehículos, clientes o maestros: si un dato no está en las fuentes, decilo explícitamente ("no tengo ese dato").

Reglas obligatorias:
1. Cada cifra debe etiquetarse: [capturado] si viene directo de la libreta, [derivado] si es un cálculo (unitario = importe ÷ cantidad, o comisión = base taller × porcentaje), o [desconocido] si no hay dato.
2. Para refacciones/materiales mostrá SIEMPRE la línea original (cantidad × importe total) y el unitario derivado (precio real por pieza), salvo kits: el importe del kit NO se divide, el unitario es el total del kit.
3. La comisión SIEMPRE es "generada"/"comisionó" (cálculo), NUNCA "recibió" ni "cobró" — la comisión generada no es dinero pagado.
4. La base "taller" es la base de nómina, no el precio al cliente; la diferencia entre importe al cliente y base taller no es ganancia ni margen. No la reportes como tal.
5. Citá cada fuente con su índice entre corchetes, ej. [1]. Cuando haya agregación exacta, preferila para cifras globales y aclará que es cálculo sobre columnas reales.
6. Si la pregunta pide estadísticas y no hay agregación, respondé con lo que haya y aclará qué falta.
`.trim();

function sourceToPromptBlock(source: HistoricalMatchSource, index: number): string {
  const unitPrice = computeUnitPriceCents(
    source.type,
    source.quantity,
    source.customerPriceCents,
    source.isKit,
  );
  const commission = computeHistoricalCommissionCents(source.payrollBaseCents, source.ratePercent);
  const vehicle = [source.brand, source.model].filter(Boolean).join(" ") || "sin unidad";
  const line = source.quantity != null
    ? `${source.quantity} × ${formatCents(source.customerPriceCents)}`
    : formatCents(source.customerPriceCents);
  return [
    `[${index}] Trabajo ${source.workRef} · fecha ${source.workDate ?? "desconocida"} · cliente ${source.customerName ?? "desconocido"} · ${vehicle}${source.plate ? ` (${source.plate})` : ""} · maestro ${source.masterName ?? "desconocido"}`,
    `    Concepto: ${source.description} (${source.type})`,
    `    Línea original: ${line} [capturado]`,
    source.quantity != null && source.isKit
      ? `    Unitario: kit — NO se divide; unitario = total ${formatCents(source.customerPriceCents)} [derivado]`
      : source.quantity != null
        ? `    Unitario derivado: ${formatCents(unitPrice)} [derivado]`
        : "    Sin cantidad (mano de obra u otro en nómina)",
    source.payrollBaseCents != null
      ? `    Base taller: ${formatCents(source.payrollBaseCents)} [capturado]`
      : "    Base taller: no capturada",
    source.ratePercent != null
      ? `    Comisión generada: ${formatCents(commission)} (${source.ratePercent}% sobre base taller) [derivado]`
      : "    Sin comisión (no es concepto de nómina)",
  ].join("\n");
}

function buildAnswerUserPrompt(
  question: string,
  filters: AssistantFilters,
  sources: HistoricalMatchSource[],
  aggregation: HistoricalAggregateRow[] | null,
): string {
  const parts: string[] = [`Pregunta: ${question}`];
  parts.push(`Filtros detectados: ${JSON.stringify(filters)}`);
  if (aggregation && aggregation.length > 0) {
    parts.push(
      `Agregación exacta (SQL sobre columnas reales):\n${aggregation
        .map((row) =>
          [
            `- grupo "${row.groupKey}": ${row.itemCount} conceptos en ${row.workCount} trabajos`,
            `  total importes cliente ${formatCents(row.totalCustomerCents)}, base taller ${formatCents(row.totalPayrollBaseCents)}, comisión generada ${formatCents(row.totalCommissionCents)}`,
            `  promedio importe ${formatCents(row.avgCustomerCents)}, promedio comisión ${formatCents(row.avgCommissionCents)}`,
          ].join("\n"),
        )
        .join("\n")}`,
    );
  } else {
    parts.push("Agregación exacta: no solicitada o sin resultados.");
  }
  if (sources.length === 0) {
    parts.push("Fuentes semánticas: ninguna coincidencia.");
  } else {
    parts.push(`Fuentes semánticas (${sources.length}):\n${sources.map(sourceToPromptBlock).join("\n")}`);
  }
  return parts.join("\n\n");
}

export function mapFiltersToAggregateInput(filters: AssistantFilters): AggregateHistoricalItemsInput {
  return {
    filterType: filters.type,
    filterBrand: filters.brand,
    filterModel: filters.model,
    filterMaster: filters.master,
    dateFrom: filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00.000Z`) : null,
    dateTo: filters.dateTo ? new Date(`${filters.dateTo}T23:59:59.999Z`) : null,
    groupBy: "all",
  };
}

/**
 * Orchestrates an assistant answer:
 * 1. extract filters via the provider,
 * 2. exact SQL aggregation when stats are requested,
 * 3. always semantic search over item embeddings (up to 5 sources),
 * 4. answer model combines both, citing sources and labeling derived vs
 *    captured vs unknown data.
 */
export async function answerHistoricalQuestion(question: string): Promise<AssistantAnswer> {
  let provider;
  try {
    provider = createGeminiProvider();
  } catch (error) {
    const message = error instanceof ProviderError ? error.message : String(error);
    return {
      answer: `El asistente no está configurado: ${message}`,
      filters: emptyFilters(),
      sources: [],
      aggregation: null,
      envError: message,
    };
  }

  const filters = parseAssistantFilters(
    await provider.generateText({ system: EXTRACTION_SYSTEM_PROMPT, user: question }),
  );

  const aggregation = filters.wantsStats
    ? await aggregateHistoricalItems(mapFiltersToAggregateInput(filters))
    : null;

  const embedding = await provider.embedText(question);
  const sources = await matchHistoricalItems({
    embedding,
    threshold: 0.4,
    count: 5,
    filterType: filters.type,
    filterBrand: filters.brand,
    filterModel: filters.model,
  });

  const answer = await provider.generateText({
    system: ANSWER_SYSTEM_PROMPT,
    user: buildAnswerUserPrompt(question, filters, sources, aggregation),
  });

  return { answer, filters, sources, aggregation, envError: null };
}