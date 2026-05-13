/**
 * Tests for MilestoneStatusBadge.
 *
 * The badge resolves a single status string from the four-state
 * hierarchy:
 *   Verified > PendingVerification > Late > Pending
 *
 * Inputs come from the server-merged `milestoneStatuses[]` entry; the
 * tab consumes the same entry shape but a different render. These
 * tests pin the hierarchy and the canonical label set so a status
 * relabel in the helpers (`isMilestoneVerified`/etc.) trips here.
 */

import { render, screen } from "@testing-library/react";
import { MilestoneStatusBadge } from "@/src/features/applications/components/MilestoneStatusBadge";
import type { MilestoneStatusEntry } from "@/types/whitelabel-entities";

function makeEntry(overrides: Partial<MilestoneStatusEntry> = {}): MilestoneStatusEntry {
  return {
    source: "application",
    milestoneUID: "0xms-default",
    currentStatus: "pending",
    grantUID: "0xgrant",
    chainID: 10,
    title: "Default milestone",
    ...overrides,
  };
}

describe("MilestoneStatusBadge", () => {
  it("should_render_Verified_when_currentStatus_is_verified", () => {
    render(<MilestoneStatusBadge entry={makeEntry({ currentStatus: "verified" })} />);
    expect(screen.getByText("Verified")).toBeInTheDocument();
  });

  it("should_render_Verified_when_verified_payload_present_regardless_of_currentStatus", () => {
    // The currentStatus string can lag the on-chain attestation; a
    // present `verified` payload is the canonical source of truth.
    render(
      <MilestoneStatusBadge
        entry={makeEntry({
          currentStatus: "pending",
          verified: { uid: "v1", attester: "0xa", createdAt: "2026-01-01" },
        })}
      />
    );
    expect(screen.getByText("Verified")).toBeInTheDocument();
  });

  it("should_render_PendingVerification_when_completed_but_not_yet_verified", () => {
    // Canonical label for "done but unverified" — replaces the older
    // "Completed" wording which conflated the verified and unverified
    // post-completion states.
    render(
      <MilestoneStatusBadge
        entry={makeEntry({
          currentStatus: "completed",
          completed: { uid: "c1", createdAt: "2026-01-01" },
        })}
      />
    );
    expect(screen.getByText("Pending Verification")).toBeInTheDocument();
  });

  it("should_render_Late_when_dueDate_is_past_and_not_completed", () => {
    render(
      <MilestoneStatusBadge
        entry={makeEntry({
          currentStatus: "pending",
          dueDate: "2020-01-01",
        })}
      />
    );
    expect(screen.getByText("Late")).toBeInTheDocument();
  });

  it("should_not_render_Late_when_completed_even_if_dueDate_is_past", () => {
    // A completed milestone never reclassifies as Late — completion
    // wins over due-date arithmetic.
    render(
      <MilestoneStatusBadge
        entry={makeEntry({
          currentStatus: "completed",
          dueDate: "2020-01-01",
          completed: { uid: "c1", createdAt: "2020-02-01" },
        })}
      />
    );
    expect(screen.getByText("Pending Verification")).toBeInTheDocument();
    expect(screen.queryByText("Late")).not.toBeInTheDocument();
  });

  it("should_render_Pending_when_entry_is_undefined", () => {
    // Missing entry means the milestone hasn't been linked on-chain
    // yet — treat as Pending (the indexer's default).
    render(<MilestoneStatusBadge />);
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("should_render_Pending_for_a_fresh_entry_with_no_completion_or_verification", () => {
    render(<MilestoneStatusBadge entry={makeEntry({ dueDate: "2099-01-01" })} />);
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });
});
