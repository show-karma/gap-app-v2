/**
 * NewFeatureBanner Component Tests
 * Verifies the home page announcement banner renders its content and links
 * to the nonprofit funder search page.
 */

import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { NewFeatureBanner } from "@/components/Pages/Home/NewFeatureBanner";
import { NON_PROFITS_PAGES } from "@/utilities/pages";

describe("NewFeatureBanner", () => {
  it("renders the announcement headline", () => {
    render(<NewFeatureBanner />);
    expect(screen.getByText("We just launched funder search for nonprofits")).toBeInTheDocument();
  });

  it("renders the New badge and the Try it now call to action", () => {
    render(<NewFeatureBanner />);
    expect(screen.getByText("New")).toBeInTheDocument();
    expect(screen.getByText("Try it now")).toBeInTheDocument();
  });

  it("links to the nonprofit funder search page", () => {
    render(<NewFeatureBanner />);
    expect(screen.getByRole("link")).toHaveAttribute("href", NON_PROFITS_PAGES.HOME);
  });

  it("hides the decorative pulse layer from assistive technology", () => {
    const { container } = render(<NewFeatureBanner />);
    const decorative = container.querySelector('[aria-hidden="true"]');
    expect(decorative).not.toBeNull();
  });
});
