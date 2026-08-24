import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ClipboardList } from "lucide-react";
import { AdminPageHeader } from "./admin-page-header";

describe("AdminPageHeader", () => {
  it("renders only the shared icon and title", () => {
    const { container } = render(
      <AdminPageHeader
        icon={ClipboardList}
        title="Trabajos"
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Trabajos" })).toBeInTheDocument();
    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(container.querySelector("p")).not.toBeInTheDocument();
  });
});
