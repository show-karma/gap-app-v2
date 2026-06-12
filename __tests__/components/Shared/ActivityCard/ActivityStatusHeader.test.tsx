import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";
import { ActivityStatusHeader } from "@/components/Shared/ActivityCard/ActivityStatusHeader";

// GrantAssociation pulls in the project store and grant hooks that are
// irrelevant to the due-date/status contract under test.
vi.mock("@/components/Shared/ActivityCard/GrantAssociation", () => ({
  GrantAssociation: () => <div data-testid="grant-association" />,
}));

vi.mock("next/image", () => ({
  default: (props: { alt?: string }) => <img alt={props.alt ?? ""} />,
}));

const SECONDS_PER_DAY = 86_400;
const nowSeconds = Math.floor(Date.now() / 1000);
const futureSeconds = nowSeconds + SECONDS_PER_DAY * 30;
const pastSeconds = nowSeconds - SECONDS_PER_DAY * 30;

describe("ActivityStatusHeader — single source of truth for due date + status", () => {
  describe("future seconds-denominated due date (UpdateCard regression)", () => {
    it("renders 'Pending' and never a spurious 'Past Due' pill", () => {
      render(
        <ActivityStatusHeader
          activityType="Milestone"
          dueDate={futureSeconds}
          showCompletionStatus
        />
      );

      expect(screen.getByText("Pending")).toBeInTheDocument();
      expect(screen.queryByText("Past Due")).not.toBeInTheDocument();
    });

    it("renders the formatted due date derived from the same value", () => {
      render(
        <ActivityStatusHeader
          activityType="Milestone"
          dueDate={futureSeconds}
          showCompletionStatus
        />
      );

      const expected = new Date(futureSeconds * 1000);
      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const label = `Due by ${monthNames[expected.getMonth()]} ${expected.getDate()}, ${expected.getFullYear()}`;
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  describe("past seconds-denominated due date", () => {
    it("renders 'Past Due'", () => {
      render(
        <ActivityStatusHeader activityType="Milestone" dueDate={pastSeconds} showCompletionStatus />
      );

      expect(screen.getByText("Past Due")).toBeInTheDocument();
      expect(screen.queryByText("Pending")).not.toBeInTheDocument();
    });
  });

  describe("missing / corrupted due date", () => {
    it("hides the due text for null", () => {
      render(<ActivityStatusHeader activityType="Milestone" dueDate={null} showCompletionStatus />);

      expect(screen.queryByText(/Due by/)).not.toBeInTheDocument();
      expect(screen.getByText("Pending")).toBeInTheDocument();
    });

    it("hides the due text and stays Pending for an ancient (pre-2000) timestamp", () => {
      const ancientSeconds = Math.floor(Date.UTC(1995, 0, 1) / 1000);
      render(
        <ActivityStatusHeader
          activityType="Milestone"
          dueDate={ancientSeconds}
          showCompletionStatus
        />
      );

      expect(screen.queryByText(/Due by/)).not.toBeInTheDocument();
      expect(screen.queryByText("Past Due")).not.toBeInTheDocument();
      expect(screen.getByText("Pending")).toBeInTheDocument();
    });
  });

  describe("completed milestones", () => {
    it("renders 'Completed' regardless of a past due date", () => {
      render(
        <ActivityStatusHeader
          activityType="Milestone"
          dueDate={pastSeconds}
          completed
          showCompletionStatus
        />
      );

      expect(screen.getByText("Completed")).toBeInTheDocument();
      expect(screen.queryByText("Past Due")).not.toBeInTheDocument();
    });
  });
});
