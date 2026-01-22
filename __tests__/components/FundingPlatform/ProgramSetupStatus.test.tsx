/**
 * @file Tests for ProgramSetupStatus component
 * @description Tests the setup status badge displayed on program cards
 */

import { render, screen } from "@testing-library/react";
import {
  hasFormConfigured,
  ProgramSetupStatus,
} from "@/components/FundingPlatform/ProgramSetupStatus";
import "@testing-library/jest-dom";

// Mock next/link
jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

describe("ProgramSetupStatus", () => {
  const programId = "program-123";
  const communityId = "test-community";

  describe("Live status (complete)", () => {
    it("should render Live badge when program is enabled", () => {
      render(
        <ProgramSetupStatus
          programId={programId}
          communityId={communityId}
          hasFormFields={true}
          isEnabled={true}
        />
      );

      expect(screen.getByText("Live")).toBeInTheDocument();
    });

    it("should have green styling for Live status", () => {
      const { container } = render(
        <ProgramSetupStatus
          programId={programId}
          communityId={communityId}
          hasFormFields={true}
          isEnabled={true}
        />
      );

      const badge = container.querySelector(".bg-green-100");
      expect(badge).toBeInTheDocument();
    });

    it("should not be a link when program is live", () => {
      render(
        <ProgramSetupStatus
          programId={programId}
          communityId={communityId}
          hasFormFields={true}
          isEnabled={true}
        />
      );

      // Live status should not be wrapped in a link
      const link = screen.queryByRole("link");
      expect(link).not.toBeInTheDocument();
    });
  });

  describe("Ready to Enable status", () => {
    it("should render Ready to Enable badge when form is configured but not enabled", () => {
      render(
        <ProgramSetupStatus
          programId={programId}
          communityId={communityId}
          hasFormFields={true}
          isEnabled={false}
        />
      );

      expect(screen.getByText("Ready to Enable")).toBeInTheDocument();
    });

    it("should have blue styling for Ready to Enable status", () => {
      const { container } = render(
        <ProgramSetupStatus
          programId={programId}
          communityId={communityId}
          hasFormFields={true}
          isEnabled={false}
        />
      );

      const badge = container.querySelector(".bg-blue-100");
      expect(badge).toBeInTheDocument();
    });

    it("should link to setup wizard when Ready to Enable", () => {
      render(
        <ProgramSetupStatus
          programId={programId}
          communityId={communityId}
          hasFormFields={true}
          isEnabled={false}
        />
      );

      const link = screen.getByRole("link");
      expect(link).toHaveAttribute(
        "href",
        `/community/${communityId}/admin/funding-platform/${programId}/setup`
      );
    });
  });

  describe("Setup Required status", () => {
    it("should render Setup Required badge when no form is configured", () => {
      render(
        <ProgramSetupStatus
          programId={programId}
          communityId={communityId}
          hasFormFields={false}
          isEnabled={false}
        />
      );

      expect(screen.getByText("Setup Required")).toBeInTheDocument();
    });

    it("should have amber styling for Setup Required status", () => {
      const { container } = render(
        <ProgramSetupStatus
          programId={programId}
          communityId={communityId}
          hasFormFields={false}
          isEnabled={false}
        />
      );

      const badge = container.querySelector(".bg-amber-100");
      expect(badge).toBeInTheDocument();
    });

    it("should link to setup wizard when Setup Required", () => {
      render(
        <ProgramSetupStatus
          programId={programId}
          communityId={communityId}
          hasFormFields={false}
          isEnabled={false}
        />
      );

      const link = screen.getByRole("link");
      expect(link).toHaveAttribute(
        "href",
        `/community/${communityId}/admin/funding-platform/${programId}/setup`
      );
    });
  });

  describe("className prop", () => {
    it("should apply custom className", () => {
      const { container } = render(
        <ProgramSetupStatus
          programId={programId}
          communityId={communityId}
          hasFormFields={true}
          isEnabled={true}
          className="custom-class"
        />
      );

      const badge = container.querySelector(".custom-class");
      expect(badge).toBeInTheDocument();
    });
  });
});

describe("hasFormConfigured", () => {
  it("should return true when form has fields", () => {
    const config = {
      formSchema: {
        fields: [{ id: "field-1", type: "text", label: "Name" }],
      },
    };

    expect(hasFormConfigured(config)).toBe(true);
  });

  it("should return false when form has no fields", () => {
    const config = {
      formSchema: {
        fields: [],
      },
    };

    expect(hasFormConfigured(config)).toBe(false);
  });

  it("should return false when formSchema is undefined", () => {
    const config = {};

    expect(hasFormConfigured(config)).toBe(false);
  });

  it("should return false when config is null", () => {
    expect(hasFormConfigured(null)).toBe(false);
  });

  it("should return false when config is undefined", () => {
    expect(hasFormConfigured(undefined)).toBe(false);
  });

  it("should return false when fields is undefined", () => {
    const config = {
      formSchema: {},
    };

    expect(hasFormConfigured(config)).toBe(false);
  });
});
