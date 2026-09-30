import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const listArchivedEligibleQuotes = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const listRecoverableTrashedQuotes = vi.hoisted(() => vi.fn().mockResolvedValue([]));
vi.mock("@/features/quotes/queries", () => ({ listArchivedEligibleQuotes, listRecoverableTrashedQuotes }));
vi.mock("@/features/quotes/actions", () => ({ restoreTrashedQuoteFromForm: vi.fn() }));

import QuoteRetentionPage from "./page";

describe("QuoteRetentionPage", () => {
  it("renders archived and recoverable-trash operations with a return path", async () => {
    render(await QuoteRetentionPage());

    expect(screen.getByRole("heading", { level: 1, name: "Retención de cotizaciones" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /Archivadas elegibles/ })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /Papelera recuperable/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver a cotizaciones" })).toHaveAttribute("href", "/admin/quotes");
    expect(listArchivedEligibleQuotes).toHaveBeenCalledOnce();
    expect(listRecoverableTrashedQuotes).toHaveBeenCalledOnce();
  });
});
