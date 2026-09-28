import { fireEvent, render, screen } from "@testing-library/react";
import { VerifyGrantMilestoneButton } from "@/components/Shared/MilestoneVerification/VerifyGrantMilestoneButton";

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

const renderButton = () =>
  render(
    <VerifyGrantMilestoneButton
      milestoneUID="0xms"
      chainId={10}
      programId="959_10"
      communityUID="comm-1"
    />
  );

describe("VerifyGrantMilestoneButton", () => {
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

    const { container } = renderButton();

    expect(container).toBeEmptyDOMElement();
    expect(mockUseProjectGrantMilestones).not.toHaveBeenCalled();
  });

  it("renders nothing when the milestone is already verified", () => {
    mockUseProjectGrantMilestones.mockReturnValue({
      data: {
        ...data,
        grantMilestones: [{ ...milestone, verificationDetails: { attestationUID: "0x1" } }],
      },
    });

    const { container } = renderButton();

    expect(container).toBeEmptyDOMElement();
  });

  it("scopes the permission check to the grant's community and program", () => {
    renderButton();

    expect(mockUseGrantMilestoneVerifyAccess).toHaveBeenCalledWith({
      communityUID: "comm-1",
      programId: "959_10",
      chainId: 10,
    });
  });

  it("submits the verification with the comment and reviewer flag", () => {
    renderButton();

    fireEvent.click(screen.getByRole("button", { name: /verify/i }));
    fireEvent.change(screen.getByLabelText(/verify milestone completion/i), {
      target: { value: "Looks good" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: /^verify$/i })[0]);

    expect(mockVerifyMilestone).toHaveBeenCalledWith(milestone, true, data, "Looks good");
  });

  it("cancel closes the comment form", () => {
    renderButton();

    fireEvent.click(screen.getByRole("button", { name: /verify/i }));
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(screen.queryByLabelText(/verify milestone completion/i)).not.toBeInTheDocument();
  });
});
