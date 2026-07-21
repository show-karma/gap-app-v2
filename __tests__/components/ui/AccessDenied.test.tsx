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

// The shared Link wrapper pulls in whitelabel + url-builder context; stub it to
// a plain anchor so the secondaryAction tests don't need those providers.
vi.mock("@/src/components/navigation/Link", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
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

  describe("secondaryAction (complementary CTA)", () => {
    const action = {
      label: "View your application",
      href: "/community/octant/applications/REF-1",
      message: "Looking for **your application**?",
    };

    it("renders the complementary message + link when authenticated", () => {
      mockUseAuth.mockReturnValue({
        authenticated: true,
        login: mockLogin,
      } as ReturnType<typeof useAuth>);

      render(<AccessDenied secondaryAction={action} />);

      // Denial CTA still present (not replaced)...
      expect(screen.getByRole("button", { name: /go to home/i })).toBeInTheDocument();
      // ...plus the complementary link + its Markdown message.
      const link = screen.getByRole("link", { name: /view your application/i });
      expect(link).toHaveAttribute("href", "/community/octant/applications/REF-1");
      expect(screen.getByText("Looking for **your application**?")).toBeInTheDocument();
    });

    it("renders an absolute URL as a plain anchor", () => {
      mockUseAuth.mockReturnValue({
        authenticated: true,
        login: mockLogin,
      } as ReturnType<typeof useAuth>);

      render(
        <AccessDenied
          secondaryAction={{ ...action, href: "https://grants.optimism.io/applications/REF-9" }}
        />
      );

      expect(screen.getByRole("link", { name: /view your application/i })).toHaveAttribute(
        "href",
        "https://grants.optimism.io/applications/REF-9"
      );
    });

    it("hides the complementary action for an unauthenticated visitor", () => {
      mockUseAuth.mockReturnValue({
        authenticated: false,
        login: mockLogin,
      } as ReturnType<typeof useAuth>);

      render(<AccessDenied secondaryAction={action} />);

      expect(screen.queryByRole("link", { name: /view your application/i })).toBeNull();
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

  // Regression for #1213 / #1443: AccessDenied is rendered on pages that are
  // NOT wrapped in a `PermissionProvider` (e.g. /admin, /admin/faucet). There,
  // `usePermissionContext()` returns the default context whose `isLoading` is
  // permanently `true`. The denial must still resolve — gating the skeleton on
  // that flag strands these pages on a forever-spinner.
  describe("RBAC loading outside a PermissionProvider", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        authenticated: false,
        login: mockLogin,
      } as ReturnType<typeof useAuth>);
      // Simulate being rendered with no provider: default context is loading.
      mockUsePermissionContext.mockReturnValue({
        roles: { primaryRole: "GUEST", roles: ["GUEST"], reviewerTypes: [] },
        isLoading: true,
      });
    });

    it("renders the denial (not the skeleton) when there is no communitySlug", () => {
      const { container } = render(
        <AccessDenied title="Admin access required" requiredRoles={["SUPER_ADMIN"]} />
      );

      // Resolved denial shows the alert icon + title; not the pulse skeleton.
      expect(screen.getByText("Admin access required")).toBeInTheDocument();
      expect(screen.getByTestId("alert-icon")).toBeInTheDocument();
      expect(container.querySelector(".animate-pulse")).toBeNull();
    });

    it("still waits on the skeleton for community-scoped denials while RBAC/custom messages load", () => {
      mockUseAccessDeniedMessages.mockReturnValue({
        data: undefined,
        isLoading: true,
      });

      const { container } = render(<AccessDenied communitySlug="octant" />);

      expect(container.querySelector(".animate-pulse")).not.toBeNull();
      expect(screen.queryByTestId("alert-icon")).toBeNull();
    });
  });
});
