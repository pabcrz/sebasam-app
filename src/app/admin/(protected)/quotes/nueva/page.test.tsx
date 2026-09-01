import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const requireOperationalRole = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const listCustomers = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const push = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({ requireOperationalRole }));
vi.mock("@/features/customers/queries", () => ({ listCustomers }));
vi.mock("@/features/customers/actions", () => ({ createOrReuseCustomerForQuote: vi.fn(), searchCustomersForQuote: vi.fn() }));
vi.mock("@/features/quotes/actions", () => ({ createQuoteFromForm: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/features/quotes/components/quote-builder", () => ({ QuoteBuilder: () => <div data-testid="quote-builder" /> }));

import NewQuotePage from "./page";

describe("NewQuotePage", () => {
  it("renders the production form header and preserves its expanded close action", async () => {
    render(await NewQuotePage());

    expect(screen.getByTestId("admin-page-header")).toHaveAttribute("data-variant", "expanded");
    expect(screen.getAllByRole("heading", { level: 1, name: "Crear cotización" })).toHaveLength(1);
    expect(screen.getByTestId("quote-builder")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerrar" })).toBeInTheDocument();
    expect(screen.queryByText("Construye una nueva cotización.")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1, name: "Nueva cotización" })).not.toBeInTheDocument();
  });
});
