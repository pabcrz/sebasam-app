import { processQuoteRetention } from "@/features/quotes/retention";

export async function GET(request: Request): Promise<Response> {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const result = await processQuoteRetention();
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
