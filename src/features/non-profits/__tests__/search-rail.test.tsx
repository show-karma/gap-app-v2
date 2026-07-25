import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SearchRail } from "../components/search-rail";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

describe("SearchRail", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  afterEach(() => {
    window.sessionStorage.clear();
  });

  it("puts the connector CTA above the deep-research promo", () => {
    render(<SearchRail />);

    const links = screen.getAllByRole("link").map((link) => link.getAttribute("href"));

    expect(links).toEqual([
      "/nonprofits/find-funders/connect/claude",
      "/nonprofits/find-funders/connect/chatgpt",
      "/nonprofits/find-funders-deep-research",
    ]);
  });

  it("keeps the rail connector visible even after the inline banner was dismissed", () => {
    // The inline banner is a per-session dismissal; the rail is the permanent
    // home for the CTA and must not inherit it.
    window.sessionStorage.setItem("np-connector-nudge-dismissed", "1");

    render(<SearchRail />);

    expect(screen.getByText(/Do this in Claude or ChatGPT/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Dismiss/i })).not.toBeInTheDocument();
  });

  it("opens both connector guides in a new tab", () => {
    render(<SearchRail />);

    for (const name of [/Add to Claude/i, /Add to ChatGPT/i]) {
      const link = screen.getByRole("link", { name });
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    }
  });
});
