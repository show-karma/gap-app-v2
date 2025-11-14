/**
 * Infrastructure Verification Test
 * Ensures all test dependencies and setup are working correctly
 */

import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { renderWithProviders } from "../utils/test-helpers";

describe("Homepage Test Infrastructure", () => {
  it("should have testing library working", () => {
    const { container } = render(<div data-testid="test">Hello</div>);
    expect(container).toBeInTheDocument();
    expect(screen.getByTestId("test")).toHaveTextContent("Hello");
  });

  it("should have jest-dom matchers working", () => {
    render(<button disabled>Click me</button>);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toBeInTheDocument();
  });

  it("should have renderWithProviders working", () => {
    renderWithProviders(<div data-testid="provider-test">With Providers</div>);
    expect(screen.getByTestId("provider-test")).toBeInTheDocument();
  });

  it("should have window.matchMedia mocked", () => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    expect(mediaQuery).toBeDefined();
    expect(mediaQuery.matches).toBeDefined();
  });

  it("should have IntersectionObserver mocked", () => {
    const observer = new IntersectionObserver(() => {});
    expect(observer).toBeDefined();
    expect(typeof observer.observe).toBe("function");
  });

  it("should have ResizeObserver mocked", () => {
    const observer = new ResizeObserver(() => {});
    expect(observer).toBeDefined();
    expect(typeof observer.observe).toBe("function");
  });
});

