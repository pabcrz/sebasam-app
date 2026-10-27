import type { QuoteItemType } from "@/generated/prisma/client";
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
import {
  aggregateCompletedWork,
  matchCompletedWork,
  type AggregateCompletedWorkInput,
  type CompletedWorkAggregate,
  type CompletedWorkMatchSource,
} from "@/features/completed-work-knowledge/repository";
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
  sources: AssistantSource[];
  aggregation: AssistantAggregations | null;
  envError: string | null;
}

export type AssistantSource = (HistoricalMatchSource & { provenance: "historical" }) | CompletedWorkMatchSource;

export interface AssistantAggregations {
  historical: HistoricalAggregateRow[];
  completedWork: CompletedWorkAggregate;
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
Tus únicas fuentes son los conceptos (con su contexto de trabajo) y la agregación exacta que se te entregan. NUNCA inventes precios, fechas, vehículos, clientes o maestros: si un dato no está en las fuentes, decilo explícitamente ("No registrado").

Formato de respuesta (obligatorio):
1. Texto plano con markdown mínimo: **negritas** para etiquetas o cifras clave, guiones "-" para listas y saltos de línea. No uses asteriscos sueltos, ni HTML, ni tablas.
2. No uses citas [n] inline ni etiquetas [capturado]/[derivado]/[desconocido]. El dato capturado es el valor por defecto y NO se marca. Solo mencioná de forma natural cuando un valor sea calculado (ej. "unitario calculado $50") o falte ("No registrado").
3. Al final, cuando aplique, agregá una línea compacta "**Fuentes:** E-01" con las referencias de trabajo que sustentan la respuesta (sin índices).

Reglas de contenido:
1. Para refacciones/materiales mostrá SIEMPRE la línea original (cantidad × importe total) y el unitario calculado (precio real por pieza), salvo kits: el importe del kit NO se divide, el unitario es el total del kit.
2. La comisión SIEMPRE es "generada"/"comisionó" (cálculo), NUNCA "recibió" ni "cobró" — la comisión generada no es dinero pagado.
3. La base "taller" es la base de nómina, no el precio al cliente; la diferencia entre importe al cliente y base taller no es ganancia ni margen. No la reportes como tal.
4. Si la pregunta pide estadísticas y no hay agregación, respondé con lo que haya y aclará qué falta.
5. Las fuentes semánticas pueden ser historial importado o trabajo completado. NUNCA presentes una suma de la lista semántica como total: solo las secciones de agregación exacta son totales.
6. Para trabajo completado, ingreso y comisión siempre son "generados"; NUNCA los describas como cobrados, recaudados o pagados. No respondas sobre referencias de precios de cotizaciones.
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
    `[${index}] Historial importado · trabajo ${source.workRef} · fecha ${source.workDate ?? "desconocida"} · cliente ${source.customerName ?? "desconocido"} · ${vehicle}${source.plate ? ` (${source.plate})` : ""} · maestro ${source.masterName ?? "desconocido"}`,
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
  sources: AssistantSource[],
  aggregation: AssistantAggregations | null,
): string {
  const parts: string[] = [`Pregunta: ${question}`];
  parts.push(`Filtros detectados: ${JSON.stringify(filters)}`);
  if (aggregation?.historical.length) {
    parts.push(
      `Agregación exacta de historial importado (SQL sobre columnas reales):\n${aggregation.historical
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
    parts.push("Agregación exacta de historial importado: no solicitada o sin resultados.");
  }
  const completed = aggregation?.completedWork;
  parts.push(completed && completed.workCount > 0
    ? `Agregación exacta de trabajo completado (valores operativos actuales): ${completed.itemCount} conceptos en ${completed.workCount} órdenes; ingreso generado ${formatCents(completed.totalGeneratedIncomeCents)}; comisión generada ${formatCents(completed.totalGeneratedCommissionCents)}.`
    : "Agregación exacta de trabajo completado: no solicitada o sin resultados.");
  if (sources.length === 0) {
    parts.push("Fuentes semánticas: ninguna coincidencia.");
  } else {
    parts.push(`Fuentes semánticas (${sources.length}, no son una agregación):\n${sources.map((source, index) => source.provenance === "historical"
      ? sourceToPromptBlock(source, index + 1)
      : [`[${index + 1}] Trabajo completado ${source.workOrderNumber} · fecha ${source.completedAt} · ${[source.brand, source.model].filter(Boolean).join(" ") || "sin unidad"}${source.plate ? ` (${source.plate})` : ""} · responsable ${source.responsibleWorker}`,
        `    Concepto actual: ${source.description} (${source.type}) · importe ${formatCents(source.itemTotalCents)}`,
        `    Ingreso generado por la orden (cotización actual): ${formatCents(source.currentQuoteTotalCents)} [derivado]`,
        `    Comisión generada: ${formatCents(source.generatedCommissionCents)} [derivado]`,
      ].join("\n")).join("\n")}`);
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

function mapFiltersToCompletedAggregateInput(
  filters: AssistantFilters,
): AggregateCompletedWorkInput {
  return {
    filterType: filters.type,
    filterBrand: filters.brand,
    filterModel: filters.model,
    filterDescription: filters.description,
    filterMaster: filters.master,
    dateFrom: filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00.000Z`) : null,
    dateTo: filters.dateTo ? new Date(`${filters.dateTo}T23:59:59.999Z`) : null,
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

  const aggregationPromise = filters.wantsStats
    ? Promise.all([
      aggregateHistoricalItems(mapFiltersToAggregateInput(filters)),
      aggregateCompletedWork(mapFiltersToCompletedAggregateInput(filters)),
    ])
    : null;

  const embedding = await provider.embedText(question);
  const [[historicalSources, completedSources], aggregateResults] = await Promise.all([
    Promise.all([
      matchHistoricalItems({ embedding, threshold: 0.4, count: 5, filterType: filters.type, filterBrand: filters.brand, filterModel: filters.model }),
      matchCompletedWork({ embedding, threshold: 0.4, count: 5, filterType: filters.type, filterBrand: filters.brand, filterModel: filters.model }),
    ]),
    aggregationPromise,
  ]);
  const sources: AssistantSource[] = [
    ...historicalSources.map((source) => ({ ...source, provenance: "historical" as const })),
    ...completedSources,
  ].sort((left, right) => right.similarity - left.similarity).slice(0, 5);
  const aggregation = aggregateResults
    ? { historical: aggregateResults[0], completedWork: aggregateResults[1] }
    : null;

  const answer = await provider.generateText({
    system: ANSWER_SYSTEM_PROMPT,
    user: buildAnswerUserPrompt(question, filters, sources, aggregation),
  });

  return { answer, filters, sources, aggregation, envError: null };
}
