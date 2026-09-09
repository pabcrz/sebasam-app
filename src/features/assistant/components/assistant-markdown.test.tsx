import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AssistantMarkdown } from "./assistant-markdown";

describe("AssistantMarkdown", () => {
  it("renders plain text with line breaks", () => {
    render(<AssistantMarkdown text={"Hola\nmundo"} />);
    expect(screen.getByText("Hola")).toBeInTheDocument();
    expect(screen.getByText("mundo")).toBeInTheDocument();
  });

  it("renders **bold** as strong", () => {
    render(<AssistantMarkdown text={"Importe: **$1,200**"} />);
    expect(screen.getByText("$1,200").tagName).toBe("STRONG");
  });

  it("renders bullets as a list", () => {
    render(<AssistantMarkdown text={"- Mano de obra\n- Refacciones"} />);
    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("Mano de obra")).toBeInTheDocument();
    expect(screen.getByText("Refacciones")).toBeInTheDocument();
  });

  it("escapes raw HTML instead of rendering it", () => {
    render(<AssistantMarkdown text={"<b>no ejecuta</b>"} />);
    expect(document.querySelector("b")).not.toBeInTheDocument();
    expect(screen.getByText("<b>no ejecuta</b>")).toBeInTheDocument();
  });

  it("does not render single asterisks as bold", () => {
    render(<AssistantMarkdown text={"50 * 2 = 100"} />);
    expect(document.querySelector("strong")).not.toBeInTheDocument();
    expect(screen.getByText("50 * 2 = 100")).toBeInTheDocument();
  });
});