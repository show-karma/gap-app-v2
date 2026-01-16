/**
 * JoinCommunity Component Tests
 * Tests the community engagement section
 *
 * Target: 7 tests
 * - Rendering (3)
 * - Button Display (2)
 * - Responsive Layout (1)
 * - Accessibility (1)
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, test } from "bun:test";
import { JoinCommunity } from "@/src/features/homepage/components/join-community";
import { renderWithProviders, screen } from "../utils/test-helpers";
import "@testing-library/jest-dom";

// Mock child components
jest.mock("@/src/features/homepage/components/create-profile-button", () => ({
  CreateProfileButton: () => <button data-testid="create-profile-button">Create Profile</button>,
}));

jest.mock("@/src/features/homepage/components/join-discord-button", () => ({
  JoinDiscordButton: () => (
    <a data-testid="join-discord-button" href="#">
      <button>Join Discord</button>
    </a>
  ),
}));

describe("JoinCommunity Component", () => {
  it("should render section heading", () => {
    renderWithProviders(<JoinCommunity />);

    const heading = screen.getByText(/Join our community/i);
    expect(heading).toBeInTheDocument();
  });

  it("should render section description", () => {
    renderWithProviders(<JoinCommunity />);

    const description = screen.getByText(
      /Celebrate your milestones and wins with the Karma community/i
    );
    expect(description).toBeInTheDocument();
  });

  it("should render JoinDiscordButton", () => {
    renderWithProviders(<JoinCommunity />);

    const discordButton = screen.getByTestId("join-discord-button");
    expect(discordButton).toBeInTheDocument();
  });

  it("should render CreateProfileButton", () => {
    renderWithProviders(<JoinCommunity />);

    const profileButton = screen.getByTestId("create-profile-button");
    expect(profileButton).toBeInTheDocument();
  });

  it("should display buttons in correct order", () => {
    renderWithProviders(<JoinCommunity />);

    const buttons = screen.getByTestId("join-discord-button").parentElement;
    const allButtons = buttons?.querySelectorAll("[data-testid]");

    // Discord button should appear first in the DOM
    expect(allButtons?.[0]).toHaveAttribute("data-testid", "join-discord-button");
  });

  it("should center content", () => {
    const { container } = renderWithProviders(<JoinCommunity />);

    const section = container.querySelector("section");
    // SectionContainer is the first div, the inner div with items-center is nested inside
    const innerDiv = section?.querySelector("div.items-center");

    expect(innerDiv).toHaveClass("items-center");
  });

  it("should use semantic HTML structure", () => {
    const { container } = renderWithProviders(<JoinCommunity />);

    const section = container.querySelector("section");
    expect(section).toBeInTheDocument();

    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent(/Join our community/i);
  });
});
