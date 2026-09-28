import { fireEvent, render, screen } from "@testing-library/react";
import {
  VerifyGrantMilestonePanel,
  VerifyGrantMilestoneTrigger,
} from "@/components/Shared/MilestoneVerification/VerifyGrantMilestone";

const mockUseGrantMilestoneVerifyAccess = vi.fn();
const mockUseProjectGrantMilestones = vi.fn();
const mockVerifyMilestone = vi.fn();
const mockInvalidateQueries = vi.fn();

vi.mock("@/src/core/rbac/hooks/use-resource-access", () => ({
  useGrantMilestoneVerifyAccess: (...args: unknown[]) => mockUseGrantMilestoneVerifyAccess(...args),
}));

vi.mock("@/hooks/useProjectGrantMilestones", () => ({
  useProjectGrantMilestones: (...args: unknown[]) => mockUseProjectGrantMilestones(...args),
}));

vi.mock("@/hooks/useMilestoneCompletionVerification", () => ({
  useMilestoneCompletionVerification: () => ({
    verifyMilestone: mockVerifyMilestone,
    isVerifying: false,
  }),
}));

vi.mock("@/store", () => ({
  useProjectStore: (selector: (state: { project: { uid: string } }) => unknown) =>
    selector({ project: { uid: "0xproject" } }),
}));

vi.mock("@/utilities/query-client", () => ({
  queryClient: { invalidateQueries: (...args: unknown[]) => mockInvalidateQueries(...args) },
}));

const milestone = { uid: "0xMS", chainId: 10, verificationDetails: null };
const data = { project: { uid: "0xproject" }, grantMilestones: [milestone] };
const params = { milestoneUID: "0xms", chainId: 10, programId: "959_10", communityUID: "comm-1" };

describe("VerifyGrantMilestoneTrigger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGrantMilestoneVerifyAccess.mockReturnValue({
      canVerify: true,
      isMilestoneReviewer: true,
    });
    mockUseProjectGrantMilestones.mockReturnValue({ data });
  });

  it("renders nothing without verify access and never fetches milestones", () => {
    mockUseGrantMilestoneVerifyAccess.mockReturnValue({
      canVerify: false,
      isMilestoneReviewer: false,
    });

    const { container } = render(<VerifyGrantMilestoneTrigger {...params} onOpen={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
    expect(mockUseProjectGrantMilestones).toHaveBeenCalledWith("", "959_10");
  });

  it("renders nothing when the milestone is already verified", () => {
    mockUseProjectGrantMilestones.mockReturnValue({
      data: {
        ...data,
        grantMilestones: [{ ...milestone, verificationDetails: { attestationUID: "0x1" } }],
      },
    });

    const { container } = render(<VerifyGrantMilestoneTrigger {...params} onOpen={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("scopes the permission check to the grant's community and program", () => {
    render(<VerifyGrantMilestoneTrigger {...params} onOpen={vi.fn()} />);

    expect(mockUseGrantMilestoneVerifyAccess).toHaveBeenCalledWith({
      communityUID: "comm-1",
      programId: "959_10",
      chainId: 10,
    });
  });

  it("opens on click", () => {
    const onOpen = vi.fn();
    render(<VerifyGrantMilestoneTrigger {...params} onOpen={onOpen} />);

    fireEvent.click(screen.getByRole("button", { name: /verify milestone/i }));

    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});

describe("VerifyGrantMilestonePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGrantMilestoneVerifyAccess.mockReturnValue({
      canVerify: true,
      isMilestoneReviewer: true,
    });
    mockUseProjectGrantMilestones.mockReturnValue({ data });
  });

  it("submits the verification with the comment and reviewer flag", () => {
    render(<VerifyGrantMilestonePanel {...params} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/verify this milestone/i), {
      target: { value: "Looks good" },
    });
    fireEvent.click(screen.getByRole("button", { name: /verify milestone/i }));

    expect(mockVerifyMilestone).toHaveBeenCalledWith(milestone, true, data, "Looks good");
  });

  it("cancel and Escape both close the panel", () => {
    const onClose = vi.fn();
    render(<VerifyGrantMilestonePanel {...params} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    fireEvent.keyDown(screen.getByLabelText(/verify this milestone/i), { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
