import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const requireProfileForPage = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({ requireProfileForPage }));

import DocumentLayout from "./layout";

describe("DocumentLayout", () => {
  it("requires the server-side administrative profile without rendering AdminShell", async () => {
    requireProfileForPage.mockResolvedValue({ profile: { role: "ADMIN" } });

    render(await DocumentLayout({ children: <main>Documento</main> }));

    expect(requireProfileForPage).toHaveBeenCalledOnce();
    expect(screen.getByRole("main")).toHaveTextContent("Documento");
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });
});
