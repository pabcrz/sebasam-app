import { describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import toast from "react-hot-toast";
import { ToasterProvider } from "./toaster";

describe("ToasterProvider", () => {
  it("renders a toast when the library is called", async () => {
    render(<ToasterProvider />);

    act(() => {
      toast.success("Cotización creada");
    });

    expect(await screen.findByText("Cotización creada")).toBeInTheDocument();
  });
});
