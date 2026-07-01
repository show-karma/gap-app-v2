import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";

const mockIntroMutate = vi.fn();
const mockEmailMutate = vi.fn();
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
  useRequestIntro: () => ({ mutate: mockIntroMutate, isPending: false }),
  useUpdateAdvisorEmail: () => ({ mutate: mockEmailMutate, isPending: false }),
}));

import { ConnectDialog } from "../ConnectDialog";

afterEach(() => {
  vi.clearAllMocks();
});

describe("ConnectDialog", () => {
  it("sends a queued intro and closes on success", () => {
    mockIntroMutate.mockImplementation((_vars, opts) =>
      opts.onSuccess?.({
        kind: "queued",
        data: { introRequestId: "i1", coarseStatus: "intro_sent" },
      })
    );
    const onOpenChange = vi.fn();

    render(
      <ConnectDialog
        reportId="report-1"
        candidateId="candidate-1"
        open
        onOpenChange={onOpenChange}
        canConnect
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Send intro" }));

    expect(mockIntroMutate).toHaveBeenCalledWith(
      { reportId: "report-1", candidateId: "candidate-1" },
      expect.any(Object)
    );
    expect(toastSuccess).toHaveBeenCalledWith("Intro sent");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("disables the confirm button when canConnect is false", () => {
    render(
      <ConnectDialog
        reportId="report-1"
        candidateId="candidate-1"
        open
        onOpenChange={vi.fn()}
        canConnect={false}
      />
    );

    expect(screen.getByRole("button", { name: "Send intro" })).toBeDisabled();
  });

  it("captures email on email_required, then re-attempts the intro", async () => {
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

    render(
      <ConnectDialog
        reportId="report-1"
        candidateId="candidate-1"
        open
        onOpenChange={onOpenChange}
        canConnect
      />
    );

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

    // The original intro is re-attempted and now queues successfully.
    expect(mockIntroMutate).toHaveBeenCalledTimes(2);
    expect(toastSuccess).toHaveBeenCalledWith("Intro sent");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("rejects an invalid email without calling the email endpoint", async () => {
    mockIntroMutate.mockImplementation((_vars, opts) =>
      opts.onSuccess?.({
        kind: "email_required",
        message: "Add your email so we can send a named intro.",
        requiredFields: ["email"],
      })
    );
    const onOpenChange = vi.fn();

    render(
      <ConnectDialog
        reportId="report-1"
        candidateId="candidate-1"
        open
        onOpenChange={onOpenChange}
        canConnect
      />
    );

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
