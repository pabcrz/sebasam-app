import {
  getSharedQuoteStatusByToken,
  SharedQuoteExpiredError,
  SharedQuoteNotFoundError,
  SharedQuoteRevokedError,
} from "@/features/quotes/domain";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStoreHeaders() {
  return { "Cache-Control": "no-store" };
}

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token) {
    return Response.json({ available: false }, { status: 400, headers: noStoreHeaders() });
  }

  try {
    const status = await getSharedQuoteStatusByToken(token);
    return Response.json({ available: true, ...status }, { headers: noStoreHeaders() });
  } catch (error) {
    const status = error instanceof SharedQuoteNotFoundError
      ? 404
      : error instanceof SharedQuoteExpiredError || error instanceof SharedQuoteRevokedError
        ? 410
        : 500;
    return Response.json({ available: false }, { status, headers: noStoreHeaders() });
  }
}
