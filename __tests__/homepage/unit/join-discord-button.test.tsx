/**
 * JoinDiscordButton Component Tests
 * Tests the Discord join button with external link
 *
 * Target: 5 tests
 * - Rendering (2)
 * - External Link (2)
 * - Accessibility (1)
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, test } from "bun:test";
import { JoinDiscordButton } from "@/src/features/homepage/components/join-discord-button";
import { renderWithProviders, screen } from "../utils/test-helpers";
import "@testing-library/jest-dom";

// Mock SOCIALS utility
jest.mock("@/utilities/socials", () => ({
  SOCIALS: {
    DISCORD: "https://discord.gg/karmahq",
  },
}));

describe("JoinDiscordButton Component", () => {
  it("should render button with correct text", () => {
    renderWithProviders(<JoinDiscordButton />);

    const button = screen.getByRole("button", { name: /Join Discord/i });
    expect(button).toBeInTheDocument();
  });

  it("should apply correct styling classes", () => {
    renderWithProviders(<JoinDiscordButton />);

    const button = screen.getByRole("button", { name: /Join Discord/i });
    expect(button).toHaveClass("px-6");
    expect(button).toHaveClass("py-2.5");
    expect(button).toHaveClass("text-sm");
    expect(button).toHaveClass("font-medium");
  });

  it("should render as an external link", () => {
    renderWithProviders(<JoinDiscordButton />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "https://discord.gg/karmahq");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("should open Discord link in new tab", () => {
    renderWithProviders(<JoinDiscordButton />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("should have proper security attributes for external link", () => {
    renderWithProviders(<JoinDiscordButton />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
