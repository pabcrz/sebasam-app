import { render, screen, waitFor } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { TruckStage } from "./truck-stage";

vi.mock("./truck-scene", () => ({
  default: () => {
    throw new Error("WebGL unavailable");
  },
}));

describe("TruckStage", () => {
  beforeAll(() => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("exposes one labelled image and shows no drawing while the scene loads", () => {
    const { container } = render(<TruckStage />);

    expect(screen.getByRole("img", { name: "Camión de carga con una llanta trasera salida" })).toBeInTheDocument();
    expect(container.querySelector("svg")).not.toBeInTheDocument();
  });

  it("falls back to the SVG truck when the 3D scene fails", async () => {
    const { container } = render(<TruckStage />);

    await waitFor(() => expect(container.querySelector("svg")).toBeInTheDocument());
  });
});
