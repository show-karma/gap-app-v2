import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";
import type { OutreachPreview } from "@/types/diligence";

const mockIntroMutate = vi.fn();
const mockEmailMutate = vi.fn();
const mockUseOutreachPreview = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: (...a: unknown[]) => toastSuccess(...a),
    error: (...a: unknown[]) => toastError(...a),
  },
}));

vi.mock("@/hooks/useDiligence", () => ({
  useOutreachPreview: (...args: unknown[]) => mockUseOutreachPreview(...args),
  useRequestIntro: () => ({ mutate: mockIntroMutate, isPending: false }),
  useUpdateAdvisorEmail: () => ({ mutate: mockEmailMutate, isPending: false }),
}));

import { ConnectDialog } from "../ConnectDialog";

const DEFAULT_BODY =
  "Hello,\n\nJane Advisor from Bright Giving would like to connect with Hope Shelter about your work.";

function buildPreview(overrides: Partial<OutreachPreview> = {}): OutreachPreview {
  return {
    action: "intro",
    subject: "Jane Advisor would like to connect with Hope Shelter",
    bodyText: DEFAULT_BODY,
    fixedFooter: null,
    editable: { subject: false, body: true },
    ...overrides,
  };
}

function mockPreviewLoaded(preview = buildPreview()) {
  mockUseOutreachPreview.mockReturnValue({
    data: preview,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });
}

function renderDialog({
  canConnect = true,
  onOpenChange = vi.fn(),
}: {
  canConnect?: boolean;
  onOpenChange?: (open: boolean) => void;
} = {}) {
  return render(
    <ConnectDialog
      reportId="report-1"
      candidateId="candidate-1"
      open
      onOpenChange={onOpenChange}
      canConnect={canConnect}
      candidateName="Hope Shelter"
    />
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("ConnectDialog", () => {
  it("shows the full intro email before sending (no fixed footer for intros)", () => {
    mockPreviewLoaded();

    renderDialog();

    expect(mockUseOutreachPreview).toHaveBeenCalledWith("report-1", "candidate-1", "intro");
    expect(screen.getByText("Hope Shelter")).toBeInTheDocument();
    expect(
      screen.getByText("Jane Advisor would like to connect with Hope Shelter")
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email body")).toHaveValue(DEFAULT_BODY);
    expect(screen.queryByText(/Answer securely/)).not.toBeInTheDocument();
  });

  it("sends a queued intro WITHOUT a body when untouched and closes on success", () => {
    mockPreviewLoaded();
    mockIntroMutate.mockImplementation((_vars, opts) =>
      opts.onSuccess?.({
        kind: "queued",
        data: { introRequestId: "i1", coarseStatus: "intro_sent" },
      })
    );
    const onOpenChange = vi.fn();

    renderDialog({ onOpenChange });

    fireEvent.click(screen.getByRole("button", { name: "Send intro" }));

    expect(mockIntroMutate).toHaveBeenCalledWith(
      { reportId: "report-1", candidateId: "candidate-1" },
      expect.any(Object)
    );
    expect(toastSuccess).toHaveBeenCalledWith("Intro sent");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows a couldn't-reach toast (not success) when the queued 202 reports blocked", () => {
    mockPreviewLoaded();
    mockIntroMutate.mockImplementation((_vars, opts) =>
      opts.onSuccess?.({
        kind: "queued",
        data: { introRequestId: "i1", coarseStatus: "blocked" },
      })
    );
    const onOpenChange = vi.fn();

    renderDialog({ onOpenChange });

    fireEvent.click(screen.getByRole("button", { name: "Send intro" }));

    expect(toastSuccess).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith(
      "We couldn't find a contact for this nonprofit, so nothing was sent."
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("sends the edited body when the advisor changed the text", () => {
    mockPreviewLoaded();
    mockIntroMutate.mockImplementation((_vars, opts) =>
      opts.onSuccess?.({
        kind: "queued",
        data: { introRequestId: "i1", coarseStatus: "intro_sent" },
      })
    );

    renderDialog();

    fireEvent.change(screen.getByLabelText("Email body"), {
      target: { value: "Hello,\n\nA personal note from Jane." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send intro" }));

    expect(mockIntroMutate).toHaveBeenCalledWith(
      {
        reportId: "report-1",
        candidateId: "candidate-1",
        body: "Hello,\n\nA personal note from Jane.",
      },
      expect.any(Object)
    );
  });

  it("disables the confirm button when canConnect is false", () => {
    mockPreviewLoaded();

    renderDialog({ canConnect: false });

    expect(screen.getByRole("button", { name: "Send intro" })).toBeDisabled();
  });

  it("disables sending and offers retry while the preview is failed", () => {
    const refetch = vi.fn();
    mockUseOutreachPreview.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    });

    renderDialog();

    expect(screen.getByText("Couldn't load the email preview.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send intro" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(refetch).toHaveBeenCalled();
  });

  it("captures email on email_required, then re-attempts with the edited body preserved", async () => {
    mockPreviewLoaded();
    let introCall = 0;
    mockIntroMutate.mockImplementation((_vars, opts) => {
      introCall += 1;
      if (introCall === 1) {
        opts.onSuccess?.({
          kind: "email_required",
          message: "Add your email so we can send a named intro.",
          requiredFields: ["email"],
        });
      } else {
        opts.onSuccess?.({
          kind: "queued",
          data: { introRequestId: "i1", coarseStatus: "intro_sent" },
        });
      }
    });
    mockEmailMutate.mockImplementation((_vars, opts) => opts.onSuccess?.());
    const onOpenChange = vi.fn();

    renderDialog({ onOpenChange });

    // The advisor edits the body BEFORE the email-capture detour.
    fireEvent.change(screen.getByLabelText("Email body"), {
      target: { value: "Hello,\n\nEdited before capture." },
    });

    // Step 1: confirm → backend says email required → switch to email step.
    fireEvent.click(screen.getByRole("button", { name: "Send intro" }));
    expect(screen.getByText("Add your email")).toBeInTheDocument();

    // Step 2: provide an email and submit.
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "advisor@example.org" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save and send intro" }));

    await waitFor(() => {
      expect(mockEmailMutate).toHaveBeenCalledWith(
        { email: "advisor@example.org" },
        expect.any(Object)
      );
    });

    // Both attempts carried the edited body through the capture flow.
    expect(mockIntroMutate).toHaveBeenCalledTimes(2);
    expect(mockIntroMutate).toHaveBeenNthCalledWith(
      1,
      {
        reportId: "report-1",
        candidateId: "candidate-1",
        body: "Hello,\n\nEdited before capture.",
      },
      expect.any(Object)
    );
    expect(mockIntroMutate).toHaveBeenNthCalledWith(
      2,
      {
        reportId: "report-1",
        candidateId: "candidate-1",
        body: "Hello,\n\nEdited before capture.",
      },
      expect.any(Object)
    );
    expect(toastSuccess).toHaveBeenCalledWith("Intro sent");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("rejects an invalid email without calling the email endpoint", async () => {
    mockPreviewLoaded();
    mockIntroMutate.mockImplementation((_vars, opts) =>
      opts.onSuccess?.({
        kind: "email_required",
        message: "Add your email so we can send a named intro.",
        requiredFields: ["email"],
      })
    );

    renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Send intro" }));
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "not-an-email" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save and send intro" }));

    await waitFor(() => {
      expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
    });
    expect(mockEmailMutate).not.toHaveBeenCalled();
  });
});
