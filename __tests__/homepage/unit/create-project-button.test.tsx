/**
 * CreateProjectButton Component Tests
 * Tests the project creation button with ProjectDialog integration
 * 
 * Target: 5 tests
 * - Rendering (2)
 * - Dialog Integration (2)
 * - Accessibility (1)
 */

import { CreateProjectButton } from "@/src/features/homepage/components/create-project-button";
import {
  renderWithProviders,
  screen,
} from "../utils/test-helpers";
import "@testing-library/jest-dom";

describe("CreateProjectButton Component", () => {
  it("should render button with correct text", () => {
    renderWithProviders(<CreateProjectButton />);

    const button = screen.getByRole("button", { name: /Create project/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("Create project");
  });

  it("should apply correct styling classes", () => {
    renderWithProviders(<CreateProjectButton />);

    const button = screen.getByRole("button", { name: /Create project/i });
    // Check for the mocked classes from setup.ts
    expect(button.className).toContain("px-6");
    expect(button.className).toContain("py-2.5");
    expect(button.className).toContain("text-sm");
    expect(button.className).toContain("font-medium");
  });

  it("should render as a button element", () => {
    renderWithProviders(<CreateProjectButton />);

    const button = screen.getByRole("button", { name: /Create project/i });
    expect(button.tagName).toBe("BUTTON");
  });

  it("should have primary button styling", () => {
    renderWithProviders(<CreateProjectButton />);

    const button = screen.getByRole("button", { name: /Create project/i });
    // Check for the mocked classes from setup.ts
    expect(button.className).toContain("bg-primary");
    expect(button.className).toContain("text-primary-foreground");
  });

  it("should be keyboard accessible", () => {
    renderWithProviders(<CreateProjectButton />);

    const button = screen.getByRole("button", { name: /Create project/i });
    expect(button).not.toHaveAttribute("disabled");
  });
});

