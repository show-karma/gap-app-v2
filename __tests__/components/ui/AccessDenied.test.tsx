import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

const mockPush = vi.fn();
const mockLogin = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: vi.fn(() => "/"),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

const mockUseAccessDeniedMessages = vi.fn();
vi.mock("@/hooks/useAccessDeniedMessages", () => ({
  useAccessDeniedMessages: (...args: unknown[]) => mockUseAccessDeniedMessages(...args),
}));

vi.mock("next/dynamic", () => ({
  // Replace dynamic-loaded MarkdownPreview with a synchronous stub that
  // surfaces the source so we can assert substitution + raw-token
  // pass-through without bundling Streamdown into the test runner.
  default: () =>
    function MockMarkdown({ source }: { source: string }) {
      return <div data-testid="markdown-mock">{source}</div>;
    },
}));

const mockUsePermissionContext = vi.fn(() => ({
  roles: { primaryRole: "GUEST", roles: ["GUEST"], reviewerTypes: [] },
  isLoading: false,
}));

vi.mock("@/src/core/rbac/context/permission-context", () => ({
  usePermissionContext: () => mockUsePermissionContext(),
}));

// lucide-react icons need to be mocked in jsdom
vi.mock("lucide-react", () => ({
  AlertTriangle: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="alert-icon" {...props} />
  ),
  LogIn: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="login-icon" {...props} />,
}));

import { useAuth } from "@/hooks/useAuth";
import { AccessDenied } from "@/src/components/ui/AccessDenied";

const mockUseAuth = useAuth as vi.MockedFunction<typeof useAuth>;

describe("AccessDenied", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no per-community overrides — preserves legacy
    // behavior for tests that don't pass `communitySlug`.
    mockUseAccessDeniedMessages.mockReturnValue({
      data: { unauthenticatedMessage: null, forbiddenMessage: null },
      isLoading: false,
    });
  });

  describe("when not authenticated", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        authenticated: false,
        login: mockLogin,
      } as ReturnType<typeof useAuth>);
    });

    it("renders the unauthenticated default copy", () => {
      render(<AccessDenied />);
      const md = screen.getByTestId("markdown-mock");
      expect(md.textContent).toBe(
        "**Sign in to continue**\n\nThis area is reserved for folks with the right access. Pop in and we'll take it from there."
      );
    });

    it("shows Sign In button when not authenticated", () => {
      render(<AccessDenied />);
      expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    });

    it("calls login() when Sign In button is clicked", async () => {
      const user = userEvent.setup();
      render(<AccessDenied />);
      await user.click(screen.getByRole("button", { name: /sign in/i }));
      expect(mockLogin).toHaveBeenCalledTimes(1);
    });

    it("does NOT use window.location.href for navigation", async () => {
      const user = userEvent.setup();
      const locationSpy = vi.spyOn(window, "location", "get");
      render(<AccessDenied />);
      await user.click(screen.getByRole("button", { name: /sign in/i }));
      // window.location.href should never be set
      expect(locationSpy).not.toHaveBeenCalled();
      locationSpy.mockRestore();
    });
  });

  describe("when authenticated", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        authenticated: true,
        login: mockLogin,
      } as ReturnType<typeof useAuth>);
    });

    it("shows Go to Home button when authenticated", () => {
      render(<AccessDenied />);
      expect(screen.getByRole("button", { name: /go to home/i })).toBeInTheDocument();
    });

    it("renders the forbidden default copy with the community name when provided", () => {
      render(<AccessDenied communityName="Filecoin" />);
      const md = screen.getByTestId("markdown-mock");
      expect(md.textContent).toBe(
        "**You're almost there**\n\nYou're signed in, but this page needs a role your account doesn't have yet. Reach out to a Filecoin admin and they can get you set up."
      );
    });

    it("falls back to a generic 'community admin' phrasing when communityName is missing", () => {
      render(<AccessDenied />);
      const md = screen.getByTestId("markdown-mock");
      expect(md.textContent).toBe(
        "**You're almost there**\n\nYou're signed in, but this page needs a role your account doesn't have yet. Reach out to a community admin and they can get you set up."
      );
    });

    it("navigates to default returnUrl ('/') when button clicked", async () => {
      const user = userEvent.setup();
      render(<AccessDenied />);
      await user.click(screen.getByRole("button", { name: /go to home/i }));
      expect(mockPush).toHaveBeenCalledWith("/");
    });

    it("uses custom returnUrl when provided", async () => {
      const user = userEvent.setup();
      render(<AccessDenied returnUrl="/dashboard" />);
      await user.click(screen.getByRole("button", { name: /go to home/i }));
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });

    it("does NOT use window.location.href for navigation", async () => {
      const user = userEvent.setup();
      const locationSpy = vi.spyOn(window, "location", "get");
      render(<AccessDenied returnUrl="/dashboard" />);
      await user.click(screen.getByRole("button", { name: /go to home/i }));
      expect(locationSpy).not.toHaveBeenCalled();
      locationSpy.mockRestore();
    });
  });

  describe("custom props", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        authenticated: false,
        login: mockLogin,
      } as ReturnType<typeof useAuth>);
    });

    it("renders custom title", () => {
      render(<AccessDenied title="Forbidden" />);
      expect(screen.getByText("Forbidden")).toBeInTheDocument();
    });

    it("renders custom message", () => {
      render(<AccessDenied message="You need admin privileges." />);
      expect(screen.getByText("You need admin privileges.")).toBeInTheDocument();
    });
  });

  describe("per-community custom messages", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        authenticated: false,
        login: mockLogin,
      } as ReturnType<typeof useAuth>);
    });

    it("renders the unauthenticated override with substituted tokens when not signed in", () => {
      mockUseAccessDeniedMessages.mockReturnValue({
        data: {
          unauthenticatedMessage: "Welcome to **{{communityName}}** — sign in!",
          forbiddenMessage: "should-not-show",
        },
        isLoading: false,
      });

      render(<AccessDenied communitySlug="octant" communityName="Octant" />);

      const md = screen.getByTestId("markdown-mock");
      expect(md.textContent).toBe("Welcome to **Octant** — sign in!");
      expect(screen.queryByText("You don't have permission to view this page.")).toBeNull();
    });

    it("falls back to the default body when the unauthenticated override is null", () => {
      mockUseAccessDeniedMessages.mockReturnValue({
        data: { unauthenticatedMessage: null, forbiddenMessage: "irrelevant" },
        isLoading: false,
      });

      render(<AccessDenied communitySlug="octant" communityName="Octant" />);

      const md = screen.getByTestId("markdown-mock");
      expect(md.textContent).toBe(
        "**Sign in to continue**\n\nThis area is reserved for folks with the right access. Pop in and we'll take it from there."
      );
    });

    it("uses the forbidden override and substitutes currentRoles when authenticated", () => {
      mockUseAuth.mockReturnValue({
        authenticated: true,
        login: mockLogin,
      } as ReturnType<typeof useAuth>);
      mockUsePermissionContext.mockReturnValue({
        roles: {
          primaryRole: "PROGRAM_REVIEWER",
          roles: ["PROGRAM_REVIEWER"],
          reviewerTypes: [],
        },
        isLoading: false,
      });
      mockUseAccessDeniedMessages.mockReturnValue({
        data: {
          unauthenticatedMessage: null,
          forbiddenMessage: "Need {{requiredRoles}}; you have {{currentRoles}}.",
        },
        isLoading: false,
      });

      render(
        <AccessDenied
          communitySlug="octant"
          communityName="Octant"
          requiredRoles={["COMMUNITY_ADMIN"] as unknown as string[]}
        />
      );

      const md = screen.getByTestId("markdown-mock");
      expect(md.textContent).toBe("Need Community Admin; you have Program Reviewer.");
    });

    it("renders the skeleton while the override is loading", () => {
      mockUseAccessDeniedMessages.mockReturnValue({
        data: undefined,
        isLoading: true,
      });

      const { container } = render(<AccessDenied communitySlug="octant" />);

      // Skeleton uses animate-pulse — no body copy or markdown stub.
      expect(container.querySelector(".animate-pulse")).not.toBeNull();
      expect(screen.queryByTestId("markdown-mock")).toBeNull();
    });
  });
});
