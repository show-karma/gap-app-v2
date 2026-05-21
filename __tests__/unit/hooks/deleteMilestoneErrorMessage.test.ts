import { AxiosError, AxiosHeaders } from "axios";
import {
  deleteMilestoneErrorMessage,
  MilestoneRevocationFailedError,
} from "@/hooks/useDeleteMilestone";

function axiosErrorWith(status: number, message?: string): AxiosError {
  const headers = new AxiosHeaders();
  const err = new AxiosError(
    `Request failed with status code ${status}`,
    String(status),
    { headers } as never,
    null,
    {
      status,
      statusText: "",
      headers,
      config: { headers } as never,
      data: message === undefined ? null : { message },
    }
  );
  return err;
}

const TITLE = "Audit Completion";

describe("deleteMilestoneErrorMessage", () => {
  it("maps 409 already-completed to admin copy", () => {
    expect(
      deleteMilestoneErrorMessage(
        axiosErrorWith(409, "Cannot delete milestone that is already completed: 0xabc"),
        TITLE
      )
    ).toBe(
      `"${TITLE}" already has a completion and can't be deleted. Reject the completion first.`
    );
  });

  it("maps 409 already-revoked to admin copy", () => {
    expect(
      deleteMilestoneErrorMessage(axiosErrorWith(409, "Milestone is already revoked: 0xabc"), TITLE)
    ).toBe(`"${TITLE}" is already deleted on-chain. Refresh the page to update the list.`);
  });

  it("maps 409 not-found to admin copy", () => {
    expect(
      deleteMilestoneErrorMessage(axiosErrorWith(409, "Milestone not found: 0xabc"), TITLE)
    ).toBe(
      `"${TITLE}" was not found on-chain. It may have been removed already — refresh the page.`
    );
  });

  it("returns raw backend message for unmapped 409 prefix", () => {
    expect(
      deleteMilestoneErrorMessage(
        axiosErrorWith(409, "Invalid milestone data: missing recipient"),
        TITLE
      )
    ).toBe("Invalid milestone data: missing recipient");
  });

  it("returns support-hint fallback when 409 has no backend message", () => {
    expect(deleteMilestoneErrorMessage(axiosErrorWith(409), TITLE)).toBe(
      `"${TITLE}" can't be deleted right now. If this looks wrong, contact support.`
    );
  });

  it("maps 403 to permission copy regardless of backend message", () => {
    expect(
      deleteMilestoneErrorMessage(
        axiosErrorWith(403, "User 0x… is not authorized to delete milestones"),
        TITLE
      )
    ).toBe("You don't have permission to delete this milestone.");
  });

  it("maps 503 to indexer-unavailable copy", () => {
    expect(
      deleteMilestoneErrorMessage(
        axiosErrorWith(503, "Failed to fetch milestone attestation 0xabc: timeout"),
        TITLE
      )
    ).toBe("The indexer couldn't read the milestone right now. Try again in a moment.");
  });

  it("maps 500 insufficient-funds to gas copy (case-insensitive match)", () => {
    expect(
      deleteMilestoneErrorMessage(
        axiosErrorWith(500, "Admin wallet has Insufficient Funds on chain 10"),
        TITLE
      )
    ).toBe("Karma admin wallet is out of gas on this chain. We've been alerted.");
  });

  it("returns raw backend message for unrelated 500", () => {
    expect(
      deleteMilestoneErrorMessage(
        axiosErrorWith(500, "Failed to revoke milestone 0xabc on chain 10: RPC down"),
        TITLE
      )
    ).toBe("Failed to revoke milestone 0xabc on chain 10: RPC down");
  });

  it("returns the typed-error's stable copy for MilestoneRevocationFailedError", () => {
    const err = new MilestoneRevocationFailedError(TITLE);
    expect(deleteMilestoneErrorMessage(err, TITLE)).toBe(
      "On-chain milestone revocation failed. Please retry; if it persists, contact support."
    );
  });

  it("falls back to Error.message for non-axios Error instances", () => {
    expect(deleteMilestoneErrorMessage(new Error("boom"), TITLE)).toBe("boom");
  });

  it("falls back to generic copy for unknown error shapes", () => {
    expect(deleteMilestoneErrorMessage(undefined, TITLE)).toBe("Failed to delete milestone.");
    expect(deleteMilestoneErrorMessage("string error", TITLE)).toBe("Failed to delete milestone.");
  });
});
