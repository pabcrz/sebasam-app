import { describe, expect, it, vi } from "vitest";

const notFoundMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ notFound: notFoundMock }));

import CotizacionIndexPage from "./page";

describe("CotizacionIndexPage", () => {
  it("delegates the bare quote route to its route-level not-found boundary", () => {
    CotizacionIndexPage();

    expect(notFoundMock).toHaveBeenCalledOnce();
  });
});
