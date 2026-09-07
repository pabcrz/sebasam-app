import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOperationalRole, UnauthorizedRoleError } from "@/lib/auth/session";
import { ProviderError } from "@/features/historical/provider";
import { answerHistoricalQuestion } from "@/features/assistant/service";

const chatRequestSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, "La pregunta no puede estar vacía")
    .max(1000, "La pregunta es demasiado larga"),
});

export async function POST(request: Request) {
  try {
    await requireOperationalRole();
  } catch (error) {
    if (error instanceof UnauthorizedRoleError) {
      return NextResponse.json({ error: "No autorizado para usar el asistente." }, { status: 403 });
    }
    throw error;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido: se esperaba JSON." }, { status: 400 });
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Pregunta inválida.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const result = await answerHistoricalQuestion(parsed.data.question);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ProviderError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    throw error;
  }
}