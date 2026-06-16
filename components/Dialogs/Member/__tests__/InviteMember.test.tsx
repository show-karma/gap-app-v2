import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { InviteMemberDialog } from "@/components/Dialogs/Member/InviteMember";

const mockAuth = vi.fn();
const mockInvite = vi.fn();
const mockCopy = vi.fn();

vi.mock("@/hooks/useProjectAuthorization", () => ({
  useProjectAuthorization: () => mockAuth(),
}));

vi.mock("@/hooks/useInviteLink", () => ({
  useInviteLink: () => mockInvite(),
  useInviteUrl: (_project: unknown, code: string | undefined) =>
    code ? `https://karmahq.xyz/project/proj?invite-code=${code}` : null,
}));

vi.mock("@/components/Utilities/Spinner", () => ({
  Spinner: () => <div data-testid="spinner" />,
}));

vi.mock("@/hooks/useCopyToClipboard", () => ({
  useCopyToClipboard: () => [null, mockCopy],
}));

vi.mock("@/store", () => ({
  useProjectStore: (selector: (state: unknown) => unknown) =>
    selector({ project: { uid: "0xproj", details: { slug: "proj" } } }),
}));

const baseInvite = {
  inviteCode: undefined,
  isLoading: false,
  isGenerating: false,
  generateCode: vi.fn(),
  revokeCode: vi.fn(),
  isSuccess: false,
  isError: false,
  isGenerateError: false,
};

const openDialog = () => {
  render(<InviteMemberDialog />);
  fireEvent.click(screen.getByRole("button", { name: /add team member/i }));
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("InviteMemberDialog", () => {
  describe("loading state", () => {
    it("should_show_a_loading_indicator_while_authorization_is_resolving", async () => {
      mockAuth.mockReturnValue({ isAuthorized: false, isLoading: true });
      mockInvite.mockReturnValue({ ...baseInvite });

      openDialog();

      expect(await screen.findByTestId("spinner")).toBeInTheDocument();
      expect(screen.queryByText(/permission/i)).not.toBeInTheDocument();
    });
  });

  describe("denial state", () => {
    it("should_render_a_terminal_denial_instead_of_an_infinite_spinner_when_unauthorized", async () => {
      mockAuth.mockReturnValue({ isAuthorized: false, isLoading: false });
      mockInvite.mockReturnValue({ ...baseInvite });

      openDialog();

      expect(await screen.findByText(/permission/i)).toBeInTheDocument();
      expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
    });
  });

  describe("error state", () => {
    it("should_render_an_error_with_retry_instead_of_an_infinite_spinner_when_generation_fails", async () => {
      const generateCode = vi.fn();
      mockAuth.mockReturnValue({ isAuthorized: true, isLoading: false });
      mockInvite.mockReturnValue({
        ...baseInvite,
        generateCode,
        isGenerateError: true,
      });

      openDialog();

      expect(await screen.findByText(/went wrong/i)).toBeInTheDocument();
      expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /try again/i }));
      expect(generateCode).toHaveBeenCalled();
    });
  });

  describe("generating state", () => {
    it("should_render_a_terminal_generating_message_while_a_code_is_being_created", async () => {
      mockAuth.mockReturnValue({ isAuthorized: true, isLoading: false });
      mockInvite.mockReturnValue({ ...baseInvite, isGenerating: true });

      openDialog();

      expect(await screen.findByText(/generating code/i)).toBeInTheDocument();
      expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
    });
  });

  describe("success state", () => {
    it("should_render_the_invite_url_when_a_code_exists", async () => {
      mockAuth.mockReturnValue({ isAuthorized: true, isLoading: false });
      mockInvite.mockReturnValue({
        ...baseInvite,
        inviteCode: { id: "1", hash: "0xabc" },
        isSuccess: true,
      });

      openDialog();

      expect(await screen.findByText(/invite-code=0xabc/)).toBeInTheDocument();
    });

    it("should_copy_the_invite_url_when_the_copy_control_is_clicked", async () => {
      mockAuth.mockReturnValue({ isAuthorized: true, isLoading: false });
      mockInvite.mockReturnValue({
        ...baseInvite,
        inviteCode: { id: "1", hash: "0xabc" },
        isSuccess: true,
      });

      openDialog();
      await screen.findByText(/invite-code=0xabc/);

      fireEvent.click(screen.getByRole("button", { name: /copy invite link/i }));

      expect(mockCopy).toHaveBeenCalledWith("https://karmahq.xyz/project/proj?invite-code=0xabc");
    });

    it("should_regenerate_the_code_with_the_invite_id_when_the_regenerate_control_is_clicked", async () => {
      const revokeCode = vi.fn();
      mockAuth.mockReturnValue({ isAuthorized: true, isLoading: false });
      mockInvite.mockReturnValue({
        ...baseInvite,
        inviteCode: { id: "invite-1", hash: "0xabc" },
        isSuccess: true,
        revokeCode,
      });

      openDialog();
      await screen.findByText(/invite-code=0xabc/);

      fireEvent.click(screen.getByRole("button", { name: /generate a new invite code/i }));

      expect(revokeCode).toHaveBeenCalledWith("invite-1");
    });
  });
});
