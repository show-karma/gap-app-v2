import { fireEvent, render, screen } from "@testing-library/react";
import { FollowUpActivity } from "@/components/FundingPlatform/FollowUp/FollowUpActivity";
import type { FollowUpCaseSummary } from "@/services/followUpAgent.service";

const queryState = new Map<string, string | null>();
const setters = new Map<string, ReturnType<typeof vi.fn>>();
vi.mock("nuqs", () => ({
  useQueryState: (key: string, options?: { defaultValue?: string }) => {
    const setter = setters.get(key) ?? vi.fn((value: string | null) => queryState.set(key, value));
    setters.set(key, setter);
    return [queryState.get(key) ?? options?.defaultValue ?? null, setter];
  },
}));

const casesResult = { current: undefined as unknown };
vi.mock("@/hooks/useFollowUpCases", () => ({
  useFollowUpCases: () => casesResult.current,
  useFollowUpCase: () => ({ data: null, isLoading: false, isError: false, refetch: vi.fn() }),
}));

function createCase(overrides: Partial<FollowUpCaseSummary> = {}): FollowUpCaseSummary {
  return {
    milestoneUid: `0x${"a".repeat(64)}`,
    milestoneTitle: "Basics",
    referenceNumber: "APP-1",
    stage: "awaiting_review",
    needsOperator: false,
    closedAt: null,
    updatedAt: "2026-11-18T21:00:00.000Z",
    lastEntry: { at: "2026-11-18T21:00:00.000Z", kind: "step", text: "Pinged Bruno." },
    entryCount: 3,
    ...overrides,
  };
}

function setCases(items: FollowUpCaseSummary[], extra: Record<string, unknown> = {}) {
  casesResult.current = {
    data: { items, total: items.length, page: 1, limit: 20, forbidden: false, ...extra },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  };
}

describe("FollowUpActivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryState.clear();
    setters.clear();
  });

  describe("loading", () => {
    it("shows a busy skeleton", () => {
      casesResult.current = { data: undefined, isLoading: true, isError: false, refetch: vi.fn() };

      const { container } = render(<FollowUpActivity programId="101105" />);

      expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    });
  });

  describe("error", () => {
    it("offers a retry", () => {
      const refetch = vi.fn();
      casesResult.current = { data: undefined, isLoading: false, isError: true, refetch };

      render(<FollowUpActivity programId="101105" />);
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));

      expect(refetch).toHaveBeenCalled();
    });
  });

  describe("empty", () => {
    it("explains when follow-ups appear", () => {
      setCases([]);

      render(<FollowUpActivity programId="101105" />);

      expect(screen.getByText("No follow-ups yet")).toBeInTheDocument();
    });

    it("shows the admin-only notice when access is denied", () => {
      setCases([], { forbidden: true });

      render(<FollowUpActivity programId="101105" />);

      expect(
        screen.getByText("Only program admins can see the follow-up activity.")
      ).toBeInTheDocument();
    });
  });

  describe("success", () => {
    it("lists cases with their stage", () => {
      setCases([createCase()]);

      render(<FollowUpActivity programId="101105" />);

      expect(screen.getByText("Basics")).toBeInTheDocument();
      expect(screen.getByText("Waiting on reviewer")).toBeInTheDocument();
    });

    it("counts milestones waiting on the admin with correct plurals", () => {
      setCases([createCase({ needsOperator: true, stage: "waiting_operator" })]);

      render(<FollowUpActivity programId="101105" />);

      expect(screen.getByText("Waiting on your answer: 1 milestone")).toBeInTheDocument();
    });

    it("hides the waiting banner when nothing needs the admin", () => {
      setCases([createCase()]);

      render(<FollowUpActivity programId="101105" />);

      expect(screen.queryByText(/Waiting on your answer/)).toBeNull();
    });

    it("filters to cases that need the admin", () => {
      queryState.set("view", "attention");
      setCases([
        createCase({
          milestoneUid: `0x${"b".repeat(64)}`,
          milestoneTitle: "Done one",
          closedAt: "2026-11-18T22:00:00.000Z",
        }),
        createCase({ milestoneTitle: "Asked you", needsOperator: true, stage: "waiting_operator" }),
      ]);

      render(<FollowUpActivity programId="101105" />);

      expect(screen.getByText("Asked you")).toBeInTheDocument();
      expect(screen.queryByText("Done one")).toBeNull();
    });

    it("selects a case into the URL", () => {
      setCases([createCase()]);

      render(<FollowUpActivity programId="101105" />);
      fireEvent.click(screen.getByText("Basics"));

      expect(setters.get("case")).toHaveBeenCalledWith(`0x${"a".repeat(64)}`);
    });
  });
});
