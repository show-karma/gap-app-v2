import { fireEvent, render, screen } from "@testing-library/react";
import { FollowUpPlaybookEditor } from "@/components/FundingPlatform/FollowUp/FollowUpPlaybookEditor";

const playbookResult = { current: undefined as unknown };
const mutate = vi.fn();
vi.mock("@/hooks/useFollowUpPlaybook", () => ({
  useFollowUpPlaybook: () => playbookResult.current,
  useSaveFollowUpPlaybook: () => ({ mutate, isPending: false }),
}));

const DEFAULT_TEXT = "## What to do per event\n1. milestone_completed: ping each reviewer.";

function setPlaybook(overrides: Record<string, unknown> = {}, versions: unknown[] = []) {
  playbookResult.current = {
    data: {
      playbook: {
        programId: "101105",
        version: 0,
        content: DEFAULT_TEXT,
        createdBy: null,
        createdAt: null,
        isDefault: true,
        ...overrides,
      },
      versions,
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  };
}

describe("FollowUpPlaybookEditor", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("loading", () => {
    it("shows a busy skeleton", () => {
      playbookResult.current = {
        data: undefined,
        isLoading: true,
        isError: false,
        refetch: vi.fn(),
      };

      const { container } = render(<FollowUpPlaybookEditor programId="101105" canEdit />);

      expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    });
  });

  describe("error", () => {
    it("offers a retry", () => {
      const refetch = vi.fn();
      playbookResult.current = { data: undefined, isLoading: false, isError: true, refetch };

      render(<FollowUpPlaybookEditor programId="101105" canEdit />);
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));

      expect(refetch).toHaveBeenCalled();
    });
  });

  describe("success", () => {
    it("labels the default template and shows the fixed rules", () => {
      setPlaybook();

      render(<FollowUpPlaybookEditor programId="101105" canEdit />);

      expect(screen.getByText(/Default template/)).toBeInTheDocument();
      expect(screen.getByText("Always applies")).toBeInTheDocument();
    });

    it("keeps save disabled until the text changes", () => {
      setPlaybook();

      render(<FollowUpPlaybookEditor programId="101105" canEdit />);

      expect(screen.getByRole("button", { name: "Save new version" })).toBeDisabled();
    });

    it("saves the edited text as a new version", () => {
      setPlaybook();
      render(<FollowUpPlaybookEditor programId="101105" canEdit />);

      fireEvent.change(screen.getByLabelText("Follow-up playbook"), {
        target: { value: `${DEFAULT_TEXT}\nNudge after 2 days.` },
      });
      fireEvent.click(screen.getByRole("button", { name: "Save new version" }));

      expect(mutate).toHaveBeenCalledWith(`${DEFAULT_TEXT}\nNudge after 2 days.`);
    });

    it("blocks saving text that is too short", () => {
      setPlaybook();
      render(<FollowUpPlaybookEditor programId="101105" canEdit />);

      fireEvent.change(screen.getByLabelText("Follow-up playbook"), {
        target: { value: "too short" },
      });

      expect(screen.getByRole("button", { name: "Save new version" })).toBeDisabled();
      expect(screen.getByText("Write at least 20 characters.")).toBeInTheDocument();
    });

    it("shows saved version metadata and history", () => {
      setPlaybook(
        {
          version: 2,
          isDefault: false,
          createdBy: "0x5a4830885f12438e00d8f4d98e9fe083e707698c",
          createdAt: "2026-11-19T12:00:00.000Z",
        },
        [
          {
            version: 2,
            createdBy: "0x5a4830885f12438e00d8f4d98e9fe083e707698c",
            createdAt: "2026-11-19T12:00:00.000Z",
          },
        ]
      );

      render(<FollowUpPlaybookEditor programId="101105" canEdit />);

      expect(screen.getByText(/Version 2 · saved by 0x5a48…698c/)).toBeInTheDocument();
      expect(screen.getByText("v2")).toBeInTheDocument();
    });

    it("is read-only for people who cannot edit", () => {
      setPlaybook();

      render(<FollowUpPlaybookEditor programId="101105" canEdit={false} />);

      expect(screen.getByLabelText("Follow-up playbook")).toHaveAttribute("readonly");
      expect(screen.queryByRole("button", { name: "Save new version" })).toBeNull();
    });
  });
});
