/**
 * @file Tests for computeProgramView pure function.
 */

import { computeProgramView } from "@/components/Pages/Communities/Funding/EditorialProgramCard";
import type { FundingProgram } from "@/types/whitelabel-entities";

const FIXED_NOW = new Date("2026-05-07T12:00:00.000Z");

const daysFromNow = (days: number): string =>
  new Date(FIXED_NOW.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

const createProgram = (overrides: Partial<FundingProgram["metadata"]> = {}): FundingProgram => ({
  programId: "program-1",
  chainID: 1,
  name: "Test Program",
  applicationConfig: null,
  metadata: {
    title: "Test Program",
    ...overrides,
  },
});

describe("computeProgramView", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("status and urgency", () => {
    it("returns deadline-passed/closed when endsAt is in the past", () => {
      const view = computeProgramView(createProgram({ endsAt: daysFromNow(-1) }));
      expect(view.status).toBe("deadline-passed");
      expect(view.urgency).toBe("closed");
      expect(view.daysLeft).toBe(0);
    });

    it("returns coming-soon/upcoming when startsAt is in the future", () => {
      const view = computeProgramView(
        createProgram({ startsAt: daysFromNow(5), endsAt: daysFromNow(30) })
      );
      expect(view.status).toBe("coming-soon");
      expect(view.urgency).toBe("upcoming");
    });

    it("returns urgent when 3 or fewer days remain", () => {
      const view = computeProgramView(createProgram({ endsAt: daysFromNow(2) }));
      expect(view.urgency).toBe("urgent");
      expect(view.daysLeft).toBe(2);
    });

    it("returns closing when 4-7 days remain", () => {
      const view = computeProgramView(createProgram({ endsAt: daysFromNow(6) }));
      expect(view.urgency).toBe("closing");
      expect(view.daysLeft).toBe(6);
    });

    it("returns open when more than 7 days remain", () => {
      const view = computeProgramView(createProgram({ endsAt: daysFromNow(20) }));
      expect(view.urgency).toBe("open");
      expect(view.status).toBe("open");
    });

    it("returns closed when metadata.status is inactive", () => {
      const view = computeProgramView(
        createProgram({ status: "inactive", endsAt: daysFromNow(10) })
      );
      expect(view.status).toBe("closed");
      expect(view.urgency).toBe("closed");
    });

    it("returns null daysLeft when no endsAt is provided", () => {
      const view = computeProgramView(createProgram({}));
      expect(view.daysLeft).toBeNull();
      expect(view.urgency).toBe("open");
    });
  });

  describe("amount parsing", () => {
    it("parses numeric strings with formatting characters", () => {
      const view = computeProgramView(
        createProgram({ programBudget: "$1,250,000", maxGrantSize: "50000 USD" })
      );
      expect(view.pool).toBe(1250000);
      expect(view.maxGrant).toBe(50000);
    });

    it("returns 0 for missing or invalid amounts", () => {
      const view = computeProgramView(createProgram({ programBudget: "abc" }));
      expect(view.pool).toBe(0);
      expect(view.maxGrant).toBe(0);
    });
  });

  describe("applicants and category", () => {
    it("prefers metrics.totalApplications over metadata.applicantsNumber", () => {
      const view = computeProgramView({
        ...createProgram({ applicantsNumber: 5 }),
        metrics: {
          totalApplications: 42,
          approvedApplications: 10,
        },
      });
      expect(view.applicants).toBe(42);
    });

    it("falls back to metadata.applicantsNumber when metrics is missing", () => {
      const view = computeProgramView(createProgram({ applicantsNumber: 7 }));
      expect(view.applicants).toBe(7);
    });

    it("uses first category, falling back to metadata.type", () => {
      const withCategories = computeProgramView(
        createProgram({ categories: ["Infra", "Tooling"] })
      );
      expect(withCategories.category).toBe("Infra");

      const withType = computeProgramView(createProgram({ type: "RFP" }));
      expect(withType.category).toBe("RFP");

      const withNeither = computeProgramView(createProgram({}));
      expect(withNeither.category).toBeNull();
    });
  });

  it("uses the platform brand accent for all programs", () => {
    const a = computeProgramView({ ...createProgram(), programId: "alpha" });
    const b = computeProgramView({ ...createProgram(), programId: "beta-different" });
    expect(a.accentClass).toBe("bg-brand-500");
    expect(b.accentClass).toBe("bg-brand-500");
  });
});
