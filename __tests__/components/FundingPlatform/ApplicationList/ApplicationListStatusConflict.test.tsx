/**
 * Status-conflict handling on the applications table (Sentry GAP-INDEXER-Y5).
 * The row actions can be stale, so the list pre-checks the transition against a
 * fresh fetch and closes the modal on a 409 instead of inviting another retry.
 */

import "@testing-library/jest-dom/vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { renderWithProviders } from "@/__tests__/utils/render";
import type { IFundingApplication } from "@/types/funding-platform";
import { STATUS_CONFLICT_MESSAGE } from "@/utilities/application-status";

const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();

vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}));

// Stand-ins for the heavy table + modal: they only need to expose the two
// interactions under test (click a row action, confirm the modal).
vi.mock("@/components/FundingPlatform/ApplicationList/ApplicationTable", () => ({
  ApplicationTable: ({
    applications,
    onStatusChange,
  }: {
    applications: IFundingApplication[];
    onStatusChange: (applicationId: string, status: string, e: React.MouseEvent) => void;
  }) =>
    React.createElement(
      "div",
      null,
      applications.map((application) =>
        React.createElement(
          "button",
          {
            key: application.referenceNumber,
            type: "button",
            onClick: (e: React.MouseEvent) =>
              onStatusChange(application.referenceNumber, "approved", e),
          },
          `Approve ${application.referenceNumber}`
        )
      )
    ),
}));

vi.mock("@/components/FundingPlatform/ApplicationView/StatusChangeModal", () => ({
  __esModule: true,
  default: ({ isOpen, onConfirm }: { isOpen: boolean; onConfirm: () => Promise<void> }) =>
    isOpen
      ? React.createElement(
          "div",
          { "data-testid": "status-modal" },
          React.createElement("button", { type: "button", onClick: () => onConfirm() }, "Confirm")
        )
      : null,
}));

import { ApplicationList } from "@/components/FundingPlatform/ApplicationList/ApplicationList";

const createMockApplication = (overrides: Partial<IFundingApplication> = {}): IFundingApplication =>
  ({
    id: "app-1",
    referenceNumber: "APP-001",
    programId: "prog-1",
    chainID: 42161,
    status: "under_review",
    applicantEmail: "applicant@example.com",
    applicationData: {},
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  }) as IFundingApplication;

const renderList = (
  props: Partial<React.ComponentProps<typeof ApplicationList>> = {},
  applications: IFundingApplication[] = [createMockApplication()]
) =>
  renderWithProviders(
    <ApplicationList
      programId="prog-1"
      applications={applications}
      showStatusActions
      addProgramReviewer={vi.fn()}
      addMilestoneReviewer={vi.fn()}
      {...props}
    />
  );

const conflictError = () => ({ response: { status: 409, data: { message: "conflict" } } });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ApplicationList status conflict", () => {
  it("should_close_the_modal_without_a_second_toast_when_the_update_returns_409", async () => {
    const user = userEvent.setup();
    const onStatusChange = vi.fn().mockRejectedValue(conflictError());

    renderList({ onStatusChange });

    await user.click(screen.getByText("Approve APP-001"));
    await user.click(await screen.findByText("Confirm"));

    await waitFor(() => expect(screen.queryByTestId("status-modal")).not.toBeInTheDocument());
    // The mutation hook owns the failure toast — the list must not add a second one.
    expect(mockToastError).not.toHaveBeenCalled();
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  it("should_keep_the_modal_open_when_the_failure_is_not_a_conflict", async () => {
    const user = userEvent.setup();
    const onStatusChange = vi.fn().mockRejectedValue({ response: { status: 500 } });

    renderList({ onStatusChange });

    await user.click(screen.getByText("Approve APP-001"));
    await user.click(await screen.findByText("Confirm"));

    await waitFor(() => expect(onStatusChange).toHaveBeenCalled());
    expect(screen.getByTestId("status-modal")).toBeInTheDocument();
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it("should_not_send_the_update_when_the_refetched_status_no_longer_allows_it", async () => {
    const user = userEvent.setup();
    const onStatusChange = vi.fn();
    const onRefreshApplications = vi
      .fn()
      .mockResolvedValue([createMockApplication({ status: "approved" })]);

    renderList({ onStatusChange, onRefreshApplications });

    await user.click(screen.getByText("Approve APP-001"));

    await waitFor(() => expect(mockToastError).toHaveBeenCalledTimes(1));
    expect(mockToastError).toHaveBeenCalledWith(STATUS_CONFLICT_MESSAGE);
    expect(onStatusChange).not.toHaveBeenCalled();
    expect(screen.queryByTestId("status-modal")).not.toBeInTheDocument();
  });

  it("should_open_the_modal_when_the_refetched_status_still_allows_the_transition", async () => {
    const user = userEvent.setup();
    const onRefreshApplications = vi.fn().mockResolvedValue([createMockApplication()]);

    renderList({ onStatusChange: vi.fn(), onRefreshApplications });

    await user.click(screen.getByText("Approve APP-001"));

    expect(await screen.findByTestId("status-modal")).toBeInTheDocument();
    expect(mockToastError).not.toHaveBeenCalled();
  });
});
