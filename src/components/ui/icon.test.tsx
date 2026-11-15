import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Icon, type IconProps } from "./icon";

describe("Icon", () => {
  it("renders an svg for a semantic name", () => {
    const { container } = render(<Icon name="home" />);

    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("applies className and size to the svg", () => {
    const { container } = render(<Icon name="quotes" className="h-4 w-4 text-red-500" size={16} />);
    const svg = container.querySelector("svg");

    expect(svg).toHaveClass("h-4", "w-4", "text-red-500");
    expect(svg).toHaveAttribute("width", "16");
    expect(svg).toHaveAttribute("height", "16");
  });

  it("uses the outline set with stroke width 2", () => {
    const { container } = render(<Icon name="jobs" />);
    const svg = container.querySelector("svg");

    expect(svg).toHaveAttribute("stroke-width", "2");
    expect(svg).toHaveAttribute("fill", "none");
  });

  it("hides decorative icons from assistive tech by default", () => {
    const { container } = render(<Icon name="chevron-down" />);

    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("exposes a labelled icon as an image instead of hiding it", () => {
    const { container } = render(<Icon name="close" aria-label="Cerrar" />);
    const svg = container.querySelector("svg");

    expect(svg).toHaveAttribute("aria-label", "Cerrar");
    expect(svg).toHaveAttribute("role", "img");
    expect(svg).not.toHaveAttribute("aria-hidden", "true");
  });

  it("passes an explicit aria-hidden through", () => {
    const { container } = render(<Icon name="print" aria-hidden="false" />);

    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "false");
  });

  it("rejects unknown names at compile time", () => {
    // @ts-expect-error -- "not-an-icon" is not in the icon name map
    const props: IconProps = { name: "not-an-icon" };

    expect(props.name).toBe("not-an-icon");
  });
});
