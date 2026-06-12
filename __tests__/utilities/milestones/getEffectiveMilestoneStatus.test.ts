import { describe, expect, it } from "vitest";
import { MilestoneLifecycleStatus } from "@/src/features/payout-disbursement";
import {
  getEffectiveMilestoneStatus,
  MILESTONE_STATUS_LABEL,
} from "@/utilities/milestones/getEffectiveMilestoneStatus";

const NOW = new Date("2026-06-01T00:00:00Z").getTime();
const PAST_ISO = "2026-01-01T00:00:00Z";
const FUTURE_ISO = "2027-01-01T00:00:00Z";

describe("getEffectiveMilestoneStatus", () => {
  it("returns PENDING when no status and no due date", () => {
    expect(getEffectiveMilestoneStatus(null, null, NOW)).toBe(MilestoneLifecycleStatus.PENDING);
  });

  it("returns PAST_DUE when status is pending and due date is in the past", () => {
    expect(getEffectiveMilestoneStatus("pending", PAST_ISO, NOW)).toBe(
      MilestoneLifecycleStatus.PAST_DUE
    );
  });

  it("stays PENDING when due date is in the future", () => {
    expect(getEffectiveMilestoneStatus("pending", FUTURE_ISO, NOW)).toBe(
      MilestoneLifecycleStatus.PENDING
    );
  });

  it("preserves COMPLETED regardless of due date", () => {
    expect(getEffectiveMilestoneStatus("completed", PAST_ISO, NOW)).toBe(
      MilestoneLifecycleStatus.COMPLETED
    );
  });

  it("preserves VERIFIED regardless of due date", () => {
    expect(getEffectiveMilestoneStatus(MilestoneLifecycleStatus.VERIFIED, PAST_ISO, NOW)).toBe(
      MilestoneLifecycleStatus.VERIFIED
    );
  });

  it("accepts epoch milliseconds for due date", () => {
    const pastMs = new Date(PAST_ISO).getTime();
    expect(getEffectiveMilestoneStatus("pending", pastMs, NOW)).toBe(
      MilestoneLifecycleStatus.PAST_DUE
    );
  });

  it("accepts Date instance for due date", () => {
    expect(getEffectiveMilestoneStatus("pending", new Date(PAST_ISO), NOW)).toBe(
      MilestoneLifecycleStatus.PAST_DUE
    );
  });

  it("falls back to PENDING on unparseable due date strings", () => {
    expect(getEffectiveMilestoneStatus("pending", "not-a-date", NOW)).toBe(
      MilestoneLifecycleStatus.PENDING
    );
  });

  it("exposes user-facing labels for every status", () => {
    expect(MILESTONE_STATUS_LABEL[MilestoneLifecycleStatus.PENDING]).toBe("Pending");
    expect(MILESTONE_STATUS_LABEL[MilestoneLifecycleStatus.COMPLETED]).toBe("Completed");
    expect(MILESTONE_STATUS_LABEL[MilestoneLifecycleStatus.VERIFIED]).toBe("Verified");
    expect(MILESTONE_STATUS_LABEL[MilestoneLifecycleStatus.PAST_DUE]).toBe("Past Due");
  });

  // Highest-blast-radius change: numeric due dates went from ms-only to
  // digit-count-disambiguated via the canonical normalizer. These cases pin
  // that behavior — both denominations — and prove the UpdateCard fix.
  describe("numeric due dates (seconds vs milliseconds)", () => {
    const PAST_SECONDS = Math.floor(new Date(PAST_ISO).getTime() / 1000);
    const FUTURE_SECONDS = Math.floor(new Date(FUTURE_ISO).getTime() / 1000);

    it("treats a past seconds-denominated due date as PAST_DUE", () => {
      // ~1.7e9 seconds in the past — previously misread as ~Jan 1970 ms.
      expect(getEffectiveMilestoneStatus("pending", PAST_SECONDS, NOW)).toBe(
        MilestoneLifecycleStatus.PAST_DUE
      );
    });

    it("keeps a future seconds-denominated due date PENDING (UpdateCard regression)", () => {
      // The defect: a future endsAt in seconds resolved to ~1970 ms < now,
      // rendering a spurious red "Past Due" pill on update cards.
      expect(getEffectiveMilestoneStatus("pending", FUTURE_SECONDS, NOW)).toBe(
        MilestoneLifecycleStatus.PENDING
      );
    });

    it("treats a 13-digit past milliseconds value as PAST_DUE (back-compat)", () => {
      const pastMs = new Date(PAST_ISO).getTime();
      expect(getEffectiveMilestoneStatus("pending", pastMs, NOW)).toBe(
        MilestoneLifecycleStatus.PAST_DUE
      );
    });

    it("degrades an ancient/corrupt timestamp to PENDING rather than PAST_DUE", () => {
      // Pre-2000 seconds value — corrupted attestation data.
      const ancientSeconds = Math.floor(Date.UTC(1995, 0, 1) / 1000);
      expect(getEffectiveMilestoneStatus("pending", ancientSeconds, NOW)).toBe(
        MilestoneLifecycleStatus.PENDING
      );
    });

    it("ignores a zero due date", () => {
      expect(getEffectiveMilestoneStatus("pending", 0, NOW)).toBe(MilestoneLifecycleStatus.PENDING);
    });
  });
});
