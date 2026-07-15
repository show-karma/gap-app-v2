import { render, screen } from "@testing-library/react";
import { ManageDeniedView } from "@/components/Manage/ManageDeniedView";
import { useAuth } from "@/hooks/useAuth";
import { usePermissionContext } from "@/src/core/rbac/context/permission-context";
import { useGranteeApplicationAccess } from "@/src/core/rbac/hooks/use-grantee-application-access";

// DEV-496: the manage layout gate shadows the page-level FundingPlatformGuard
// redirect, so ManageDeniedView sends an *authenticated* non-privileged visitor
// on a funding-platform review link to the canonical public page; a logged-out
// visitor keeps the access-denied wall.

const replace = vi.fn();
let params: Record<string, string | undefined> = {};
let pathname = "/";

vi.mock("next/navigation", () => ({
  useParams: () => params,
  usePathname: () => pathname,
  useRouter: () => ({ replace }),
}));

vi.mock("@/hooks/useAuth");
vi.mock("@/src/core/rbac/context/permission-context");
vi.mock("@/src/core/rbac/hooks/use-grantee-application-access");
vi.mock("@/utilities/whitelabel-context", () => ({
  useWhitelabel: () => ({ isWhitelabel: false }),
}));
vi.mock("@/hooks/useAccessDeniedMessages", () => ({
  useAccessDeniedMessages: () => ({ data: undefined }),
}));
vi.mock("@/components/Utilities/Spinner", () => ({
  Spinner: () => <div data-testid="spinner" />,
}));
vi.mock("@/src/components/ui/AccessDenied", () => ({
  AccessDenied: () => <div data-testid="access-denied" />,
}));

const mockUseAuth = vi.mocked(useAuth);
const mockPermission = vi.mocked(usePermissionContext);
const mockGrantee = vi.mocked(useGranteeApplicationAccess);

const DETAIL_PATH = "/community/c1/manage/funding-platform/prog-1/applications/REF-9";

function setup(overrides?: { params?: typeof params; pathname?: string }) {
  params = overrides?.params ?? { programId: "prog-1", applicationId: "REF-9" };
  pathname = overrides?.pathname ?? DETAIL_PATH;
  return render(<ManageDeniedView communityId="c1" communityName="Community One" />);
}

describe("ManageDeniedView (DEV-496 non-privileged redirect)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ ready: true, authenticated: false } as any);
    mockPermission.mockReturnValue({ isGuestDueToError: false } as any);
    mockGrantee.mockReturnValue({
      isGrantee: false,
      isError: false,
      redirect: { kind: "dashboard", url: "/dashboard" },
    } as any);
  });

  it("redirects an authenticated visitor to the public application page", () => {
    mockUseAuth.mockReturnValue({ ready: true, authenticated: true } as any);

    setup();

    expect(replace).toHaveBeenCalledWith("/community/c1/applications/REF-9");
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
    expect(screen.queryByTestId("access-denied")).not.toBeInTheDocument();
  });

  it("shows the access-denied wall (no redirect) to a logged-out visitor", () => {
    mockUseAuth.mockReturnValue({ ready: true, authenticated: false } as any);

    setup();

    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByTestId("access-denied")).toBeInTheDocument();
  });

  it("waits on a spinner (no denial flash) while auth is not yet ready", () => {
    mockUseAuth.mockReturnValue({ ready: false, authenticated: false } as any);

    setup();

    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
    expect(screen.queryByTestId("access-denied")).not.toBeInTheDocument();
  });

  it("does not redirect on an undetermined denial (isGuestDueToError)", () => {
    mockUseAuth.mockReturnValue({ ready: true, authenticated: true } as any);
    mockPermission.mockReturnValue({ isGuestDueToError: true } as any);

    setup();

    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByTestId("access-denied")).toBeInTheDocument();
  });

  it("shows the access-denied wall on a non-redirect route (e.g. milestones)", () => {
    mockUseAuth.mockReturnValue({ ready: true, authenticated: true } as any);

    setup({
      params: { programId: "prog-1" },
      pathname: "/community/c1/manage/funding-platform/prog-1/milestones/project-1",
    });

    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByTestId("access-denied")).toBeInTheDocument();
  });
});
