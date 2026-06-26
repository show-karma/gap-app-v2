/**
 * @file Tests for the identity-capture modal — open gating, zod
 * validation (display name + email), edit-name-only mode, submitting
 * copy on the action button.
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";

// Radix Dialog renders via a portal that the test env's `screen` query
// resolves to fine, but the Radix focus-trap layers interfere with
// label↔input id wiring. Mock the dialog primitives the same way the
// existing DeleteDialog test does — see __tests__/components/Dialogs/.
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-panel">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { IdentityCaptureDialog } from "@/src/features/donor-research/components/shared-view/IdentityCaptureDialog";

describe("IdentityCaptureDialog", () => {
  it("renders nothing when closed", () => {
    render(
      <IdentityCaptureDialog open={false} onOpenChange={() => {}} onSubmit={async () => {}} />
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders both fields by default", () => {
    render(<IdentityCaptureDialog open onOpenChange={() => {}} onSubmit={async () => {}} />);
    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it("hides the email field in nameOnly mode", () => {
    render(
      <IdentityCaptureDialog open nameOnly onOpenChange={() => {}} onSubmit={async () => {}} />
    );
    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
  });

  it("rejects empty display name with an inline error", async () => {
    const onSubmit = vi.fn();
    render(<IdentityCaptureDialog open onOpenChange={() => {}} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "donor@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(await screen.findByText(/enter your name/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects an invalid email with an inline error", async () => {
    const onSubmit = vi.fn();
    render(<IdentityCaptureDialog open onOpenChange={() => {}} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText(/display name/i), { target: { value: "Dana" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "not-an-email" } });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(await screen.findByText(/enter a valid email/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits valid values to the onSubmit callback", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<IdentityCaptureDialog open onOpenChange={() => {}} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText(/display name/i), { target: { value: "Dana" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "dana@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        displayName: "Dana",
        email: "dana@example.com",
      });
    });
  });

  it("submits with only the display name in nameOnly mode", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<IdentityCaptureDialog open nameOnly onOpenChange={() => {}} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText(/display name/i), { target: { value: "Dana 2" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit.mock.calls[0][0].displayName).toBe("Dana 2");
    });
  });

  it("shows 'Saving…' copy on the submit button while pending", () => {
    render(
      <IdentityCaptureDialog open isSubmitting onOpenChange={() => {}} onSubmit={async () => {}} />
    );
    const btn = screen.getByRole("button", { name: /saving/i });
    expect(btn).toBeDisabled();
  });

  it("caps display name at 80 chars via maxLength", () => {
    render(<IdentityCaptureDialog open onOpenChange={() => {}} onSubmit={async () => {}} />);
    expect(screen.getByLabelText(/display name/i)).toHaveAttribute("maxLength", "80");
  });

  it("caps email at 254 chars via maxLength", () => {
    render(<IdentityCaptureDialog open onOpenChange={() => {}} onSubmit={async () => {}} />);
    expect(screen.getByLabelText(/email/i)).toHaveAttribute("maxLength", "254");
  });
});
