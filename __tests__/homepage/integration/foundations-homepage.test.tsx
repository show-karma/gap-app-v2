/**
 * The homepage is the former /foundations landing page. These render the real
 * page (no section mocks) and pin what a visitor lands on.
 */

import HomePage, { metadata } from "@/app/t/[tenant]/(chrome)/page";
import { NONPROFITS_ORIGIN } from "@/utilities/domains";
import { renderWithProviders, screen } from "../utils/test-helpers";
import "@testing-library/jest-dom";

describe("Homepage (foundations landing)", () => {
  it("leads with the foundations hero heading as the only h1", () => {
    renderWithProviders(<HomePage />);

    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent("AI-powered funding software that does the work for you");
  });

  it("opens the demo CTA in a new tab and anchors the secondary CTA to the platform section", () => {
    const { container } = renderWithProviders(<HomePage />);

    const demo = screen.getAllByRole("link", { name: /Schedule a demo/i })[0];
    expect(demo).toHaveAttribute("target", "_blank");
    expect(demo.getAttribute("rel")).toContain("noopener");

    expect(screen.getByRole("link", { name: /See the platform/i })).toHaveAttribute(
      "href",
      "#the-platform"
    );
    expect(container.querySelector("#the-platform")).not.toBeNull();
  });

  it("shows the manage dashboard as the hero screenshot", () => {
    renderWithProviders(<HomePage />);

    const images = screen.getAllByAltText(/Karma program manager dashboard/i);
    expect(images.map((img) => decodeURIComponent(img.getAttribute("src") ?? ""))).toEqual([
      expect.stringContaining("/images/homepage/manage-dashboard.png"),
      expect.stringContaining("/images/homepage/manage-dashboard-drk.png"),
    ]);
  });

  it("announces Karma Compass above the hero, linking to the Compass app", () => {
    renderWithProviders(<HomePage />);

    const banner = screen.getByRole("link", { name: /Introducing Karma Compass/i });
    expect(banner).toHaveAttribute("href", NONPROFITS_ORIGIN);

    const h1 = screen.getByRole("heading", { level: 1 });
    expect(banner.compareDocumentPosition(h1) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("carries the case-studies anchor the navbar links to", () => {
    const { container } = renderWithProviders(<HomePage />);

    expect(container.querySelector("#case-studies")).not.toBeNull();
  });

  it("self-canonicals at the root", () => {
    expect(metadata.alternates?.canonical).toBe("/");
  });
});
