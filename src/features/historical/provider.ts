/**
 * Minimal Gemini-compatible provider adapter used for:
 * - item embeddings (1536 dims) during historical import,
 * - assistant filter extraction and answer generation.
 *
 * Env vars (server-only, documented in .env.example):
 * - GEMINI_API_KEY (required)
 * - GEMINI_BASE_URL (default: https://generativelanguage.googleapis.com/v1beta)
 * - GEMINI_EMBEDDING_MODEL (default: gemini-embedding-2)
 * - GEMINI_ANSWER_MODEL (default: gemini-3.5-flash-lite)
 */

export class ProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderError";
  }
}

export interface HistoricalProvider {
  /** Returns an embedding with EXACTLY EMBEDDING_DIMENSIONS numbers. */
  embedText(text: string): Promise<number[]>;
  /** Returns the model's text answer for a system + user prompt pair. */
  generateText(input: { system: string; user: string }): Promise<string>;
}

export interface ProviderEnv {
  GEMINI_API_KEY?: string;
  GEMINI_BASE_URL?: string;
  GEMINI_EMBEDDING_MODEL?: string;
  GEMINI_ANSWER_MODEL?: string;
  [key: string]: string | undefined;
}

export const EMBEDDING_DIMENSIONS = 1536;
const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_EMBEDDING_MODEL = "gemini-embedding-2";
const DEFAULT_ANSWER_MODEL = "gemini-3.5-flash-lite";

export function createGeminiProvider(env: ProviderEnv = process.env): HistoricalProvider {
  const apiKey = env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new ProviderError(
      "GEMINI_API_KEY no está configurada. Agregala al .env (solo servidor, nunca NEXT_PUBLIC_*).",
    );
  }
  const key: string = apiKey;

  const baseUrl = (env.GEMINI_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const embeddingModel = env.GEMINI_EMBEDDING_MODEL ?? DEFAULT_EMBEDDING_MODEL;
  const answerModel = env.GEMINI_ANSWER_MODEL ?? DEFAULT_ANSWER_MODEL;

  async function embedText(text: string): Promise<number[]> {
    const response = await fetch(`${baseUrl}/models/${embeddingModel}:embedContent`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({
        content: { parts: [{ text }] },
        outputDimensionality: EMBEDDING_DIMENSIONS,
      }),
    });

    if (!response.ok) {
      throw new ProviderError(`Solicitud de embedding falló (HTTP ${response.status}).`);
    }

    const data: unknown = await response.json();
    const values = (data as { embedding?: { values?: unknown } })?.embedding?.values;

    if (!Array.isArray(values)) {
      throw new ProviderError("La respuesta de embedding no incluye valores.");
    }

    if (values.length !== EMBEDDING_DIMENSIONS) {
      throw new ProviderError(
        `Dimensión de embedding ${values.length} no coincide con la esperada (${EMBEDDING_DIMENSIONS}).`,
      );
    }

    if (!values.every((value) => typeof value === "number" && Number.isFinite(value))) {
      throw new ProviderError("Los valores del embedding deben ser números finitos.");
    }

    return values as number[];
  }

  async function generateText(input: { system: string; user: string }): Promise<string> {
    const response = await fetch(`${baseUrl}/models/${answerModel}:generateContent`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: input.system }] },
        contents: [{ role: "user", parts: [{ text: input.user }] }],
        generationConfig: { temperature: 0.2 },
      }),
    });

    if (!response.ok) {
      throw new ProviderError(`Solicitud de respuesta falló (HTTP ${response.status}).`);
    }

    const data: unknown = await response.json();
    const candidates = (data as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
      ?.candidates;

    const text =
      candidates
        ?.flatMap((candidate) => candidate.content?.parts?.map((part) => part.text ?? "") ?? [])
        .join("") ?? "";

    if (text.trim() === "") {
      throw new ProviderError("La respuesta del modelo no incluye texto.");
    }

    return text;
  }

  return { embedText, generateText };
}