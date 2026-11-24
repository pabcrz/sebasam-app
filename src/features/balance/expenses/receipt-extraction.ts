import { z } from "zod";
import { EXPENSE_CATEGORIES } from "./categories";

const categoryValues = EXPENSE_CATEGORIES.map((category) => category.value) as [string, ...string[]];

/** What the model reads from a receipt. Every field may be missing: the person confirms or fixes it in the form. */
const extractionSchema = z.object({
  spentAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().catch(null),
  amount: z.number().positive().max(1_000_000).nullable().catch(null),
  supplier: z.string().trim().max(120).nullable().catch(null),
  category: z.enum(categoryValues).nullable().catch(null),
  invoiced: z.boolean().nullable().catch(null),
});
export type ReceiptExtraction = z.infer<typeof extractionSchema>;

const PROMPT = `Lee este comprobante de un gasto de un taller mecánico en México (factura, ticket o nota) y responde SOLO un JSON con:
- spentAt: fecha de la compra como YYYY-MM-DD, o null.
- amount: el TOTAL pagado en pesos (número, con IVA incluido), o null.
- supplier: nombre comercial del proveedor, o null.
- category: una de ${categoryValues.join(", ")}, o null si no estás seguro.
- invoiced: true solo si es una factura fiscal (CFDI: folio fiscal/UUID, RFC del emisor y receptor); false si es ticket o nota simple; null si no se distingue.
No inventes datos: usa null cuando no se lea con claridad.`;

/** Reads a receipt with the Gemini vision model already configured for the assistant. Returns null when it cannot (no key, bad answer): the receipt is still kept. */
export async function extractReceipt(bytes: Uint8Array, mimeType: string, env: Record<string, string | undefined> = process.env): Promise<ReceiptExtraction | null> {
  const key = env.GEMINI_API_KEY?.trim();
  if (!key) return null;
  const baseUrl = (env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta").replace(/\/+$/, "");
  const model = env.GEMINI_VISION_MODEL ?? env.GEMINI_ANSWER_MODEL ?? "gemini-3.5-flash-lite";

  try {
    const response = await fetch(`${baseUrl}/models/${model}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: PROMPT }, { inlineData: { mimeType, data: Buffer.from(bytes).toString("base64") } }] }],
        generationConfig: { temperature: 0, responseMimeType: "application/json" },
      }),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = data.candidates?.flatMap((candidate) => candidate.content?.parts?.map((part) => part.text ?? "") ?? []).join("") ?? "";
    const parsed = extractionSchema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
