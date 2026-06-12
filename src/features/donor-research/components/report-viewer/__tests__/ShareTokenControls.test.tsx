import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockCopy = vi.fn(() => Promise.resolve(true));
const mockGenerateMutateAsync = vi.fn(() => Promise.resolve({ shareToken: "rotated-token" }));
const mockRevokeMutateAsync = vi.fn(() => Promise.resolve());

vi.mock("@/hooks/useCopyToClipboard", () => ({
  useCopyToClipboard: () => [null, mockCopy] as const,
}));

vi.mock("@/hooks/useShareToken", () => ({
  useGenerateShareToken: () => ({
    mutateAsync: mockGenerateMutateAsync,
    isPending: false,
  }),
  useRevokeShareToken: () => ({
    mutateAsync: mockRevokeMutateAsync,
    isPending: false,
  }),
}));

import { ShareTokenControls } from "../ShareTokenControls";

describe("ShareTokenControls", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("enables Copy share link when an existing shareToken prop is present (no prior generate)", async () => {
    render(
      <ShareTokenControls
        reportId="report-1"
        hasShareToken
        shareToken="existing-token"
        shareTokenExpiresAt={null}
      />
    );

    const copyButton = screen.getByRole("button", { name: "Copy share link" });
    expect(copyButton).not.toBeDisabled();

    fireEvent.click(copyButton);

    expect(mockCopy).toHaveBeenCalledTimes(1);
    expect(mockCopy).toHaveBeenCalledWith(
      expect.stringContaining("/nonprofit-research/shared/existing-token")
    );
    // Copying must never rotate the token.
    expect(mockGenerateMutateAsync).not.toHaveBeenCalled();
  });

  it("disables Copy share link when there is no token at all", () => {
    render(
      <ShareTokenControls
        reportId="report-1"
        hasShareToken
        shareToken={null}
        shareTokenExpiresAt={null}
      />
    );

    expect(screen.getByRole("button", { name: "Copy share link" })).toBeDisabled();
  });

  it("opens a confirmation dialog on Regenerate instead of rotating immediately", () => {
    render(
      <ShareTokenControls
        reportId="report-1"
        hasShareToken
        shareToken="existing-token"
        shareTokenExpiresAt={null}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Regenerate" }));

    // Confirmation surfaced, token NOT rotated yet.
    expect(screen.getByText("Regenerate share link?")).toBeInTheDocument();
    expect(mockGenerateMutateAsync).not.toHaveBeenCalled();
  });

  it("rotates the token only after confirming the Regenerate dialog", () => {
    render(
      <ShareTokenControls
        reportId="report-1"
        hasShareToken
        shareToken="existing-token"
        shareTokenExpiresAt={null}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Regenerate" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(mockGenerateMutateAsync).toHaveBeenCalledTimes(1);
    expect(mockGenerateMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ reportId: "report-1" })
    );
  });
});
