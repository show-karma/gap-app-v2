/**
 * Tests for ValidationErrors component
 *
 * Covers:
 * - Empty state (no errors) returns null
 * - Validation errors with different types (insufficient balance, missing balance info, invalid amount, unknown)
 * - Missing payout address errors
 * - Actionable steps display
 */

import { screen } from "@testing-library/react";
import { ValidationErrors } from "@/components/Donation/ValidationErrors";
import { renderWithProviders } from "../../utils/render";

const mockItems = [
  { uid: "project-1", title: "Test Project" },
  { uid: "project-2", title: "Another Project" },
];

describe("ValidationErrors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Empty state", () => {
    it("should return null when there are no validation errors and no missing payouts", () => {
      const { container } = renderWithProviders(
        <ValidationErrors validationErrors={[]} missingPayouts={[]} items={mockItems} />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe("Missing payout addresses", () => {
    it("should display missing payout error for a project", () => {
      renderWithProviders(
        <ValidationErrors validationErrors={[]} missingPayouts={["project-1"]} items={mockItems} />
      );

      expect(screen.getByText("Cannot process donation")).toBeInTheDocument();
      expect(screen.getByText("Test Project: Missing Payout Address")).toBeInTheDocument();
      expect(
        screen.getByText(
          "This project hasn't configured a payout address. Donation is blocked for security."
        )
      ).toBeInTheDocument();
    });

    it("should show actionable steps for missing payout", () => {
      renderWithProviders(
        <ValidationErrors validationErrors={[]} missingPayouts={["project-1"]} items={mockItems} />
      );

      expect(
        screen.getByText(/Contact the project owner to configure their payout address/)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Remove this project from your cart to proceed with other donations/)
      ).toBeInTheDocument();
    });

    it("should fall back to 'Project' when project title is not found", () => {
      renderWithProviders(
        <ValidationErrors validationErrors={[]} missingPayouts={["unknown-id"]} items={mockItems} />
      );

      expect(screen.getByText("Project: Missing Payout Address")).toBeInTheDocument();
    });
  });

  describe("Insufficient balance errors", () => {
    it("should display insufficient balance error with actionable steps", () => {
      renderWithProviders(
        <ValidationErrors
          validationErrors={["Insufficient USDC balance. Required: 100, Available: 50"]}
          missingPayouts={[]}
          items={mockItems}
        />
      );

      expect(screen.getByText("Insufficient Balance")).toBeInTheDocument();
      expect(
        screen.getByText("Insufficient USDC balance. Required: 100, Available: 50")
      ).toBeInTheDocument();
      expect(screen.getByText(/Add more USDC to your wallet/)).toBeInTheDocument();
      expect(screen.getByText(/Reduce the donation amount/)).toBeInTheDocument();
      expect(screen.getByText(/Select a different token/)).toBeInTheDocument();
    });
  });

  describe("Missing balance info errors", () => {
    it("should display missing balance info error", () => {
      renderWithProviders(
        <ValidationErrors
          validationErrors={["No balance information available for USDC on Optimism"]}
          missingPayouts={[]}
          items={mockItems}
        />
      );

      expect(screen.getByText("Balance Unavailable")).toBeInTheDocument();
      expect(screen.getByText(/Check your wallet directly for balance/)).toBeInTheDocument();
    });
  });

  describe("Invalid amount errors", () => {
    it("should display invalid amount error with actionable steps", () => {
      renderWithProviders(
        <ValidationErrors
          validationErrors={["Invalid amount for project-1"]}
          missingPayouts={[]}
          items={mockItems}
        />
      );

      expect(screen.getByText("Invalid Amount")).toBeInTheDocument();
      expect(screen.getByText(/Enter a valid positive number/)).toBeInTheDocument();
    });
  });

  describe("Unknown errors", () => {
    it("should display unknown error without actionable steps", () => {
      renderWithProviders(
        <ValidationErrors
          validationErrors={["Something unexpected happened"]}
          missingPayouts={[]}
          items={mockItems}
        />
      );

      expect(screen.getByText("Validation Error")).toBeInTheDocument();
      expect(screen.getByText("Something unexpected happened")).toBeInTheDocument();
    });
  });

  describe("Multiple errors", () => {
    it("should display both validation errors and missing payouts", () => {
      renderWithProviders(
        <ValidationErrors
          validationErrors={["Insufficient USDC balance. Required: 100, Available: 50"]}
          missingPayouts={["project-2"]}
          items={mockItems}
        />
      );

      expect(screen.getByText("Another Project: Missing Payout Address")).toBeInTheDocument();
      expect(screen.getByText("Insufficient Balance")).toBeInTheDocument();
    });
  });
});
