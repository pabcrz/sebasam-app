import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "./route";

const { requireOperationalRole, UnauthorizedRoleError } = vi.hoisted(() => ({
  requireOperationalRole: vi.fn(),
  UnauthorizedRoleError: class UnauthorizedRoleError extends Error {
    constructor(role: string, allowedRoles: string[]) {
      super(`Role ${role} cannot perform this action. Allowed roles: ${allowedRoles.join(", ")}.`);
      this.name = "UnauthorizedRoleError";
    }
  },
}));

const { answerHistoricalQuestion, ProviderError } = vi.hoisted(() => ({
  answerHistoricalQuestion: vi.fn(),
  ProviderError: class ProviderError extends Error {},
}));

vi.mock("@/lib/auth/session", () => ({ requireOperationalRole, UnauthorizedRoleError }));
vi.mock("@/features/assistant/service", () => ({ answerHistoricalQuestion }));
vi.mock("@/features/historical/provider", () => ({ ProviderError }));

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/assistant/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  requireOperationalRole.mockResolvedValue({ profile: { role: "ADMIN" } });
  answerHistoricalQuestion.mockResolvedValue({
    answer: "Respuesta",
    filters: {},
    sources: [],
    aggregation: null,
    envError: null,
  });
});

describe("POST /api/assistant/chat", () => {
  it("requires the operational role", async () => {
    await POST(jsonRequest({ question: "hola" }));
    expect(requireOperationalRole).toHaveBeenCalledTimes(1);
  });

  it("returns 403 for non-operational roles", async () => {
    requireOperationalRole.mockRejectedValue(new UnauthorizedRoleError("WORKER", ["ADMIN"]));
    const response = await POST(jsonRequest({ question: "hola" }));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: expect.stringContaining("No autorizado") });
  });

  it("returns 400 for an invalid body", async () => {
    const noQuestion = await POST(jsonRequest({}));
    expect(noQuestion.status).toBe(400);

    const badJson = await POST(new Request("http://localhost/api/assistant/chat", {
      method: "POST",
      body: "not json",
    }));
    expect(badJson.status).toBe(400);
  });

  it("returns 200 with the assistant answer for a valid question", async () => {
    const response = await POST(jsonRequest({ question: "¿Cuánto cobramos por cambiar bujes?" }));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.answer).toBe("Respuesta");
    expect(answerHistoricalQuestion).toHaveBeenCalledWith("¿Cuánto cobramos por cambiar bujes?");
  });

  it("returns 502 when the provider fails", async () => {
    answerHistoricalQuestion.mockRejectedValue(new ProviderError("Solicitud de embedding falló (HTTP 500)."));
    const response = await POST(jsonRequest({ question: "hola" }));
    expect(response.status).toBe(502);
  });
});