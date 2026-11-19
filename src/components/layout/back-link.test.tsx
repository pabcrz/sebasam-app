import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const back = vi.fn();
let pathname = "/admin/customers";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ back }),
}));

import { BackLink, useTrackPreviousPath } from "./back-link";

function Screen({ href }: { href: string }) {
  useTrackPreviousPath();
  return <BackLink href={href}>Regresar</BackLink>;
}

describe("BackLink", () => {
  beforeEach(() => back.mockClear());

  it("steps back in history when the previous screen is its target", () => {
    pathname = "/admin/customers";
    const { rerender } = render(<Screen href="/admin/customers" />);
    pathname = "/admin/customers/1";
    rerender(<Screen href="/admin/customers" />);

    fireEvent.click(screen.getByText("Regresar"));
    expect(back).toHaveBeenCalledTimes(1);
  });

  it("is a normal link when the user did not come from its target", () => {
    pathname = "/admin/customers/2";
    render(<Screen href="/admin/other" />);

    fireEvent.click(screen.getByText("Regresar"));
    expect(back).not.toHaveBeenCalled();
  });
});
