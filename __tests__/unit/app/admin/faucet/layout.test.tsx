import { render, screen } from "@testing-library/react";
import FaucetAdminLayout from "@/app/admin/faucet/layout";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/hooks/useFaucetAdmin", () => ({
  useFaucetAdmin: vi.fn(),
}));

vi.mock("@/components/Utilities/Spinner", () => ({
  Spinner: () => <div data-testid="spinner" />,
}));

vi.mock("@/src/components/ui/AccessDenied", () => ({
  AccessDenied: ({ title, cta }: { title?: string; cta?: { label: string } }) => (
    <div data-testid="access-denied">
      <span>{title}</span>
      {cta ? <span data-testid="access-denied-cta">{cta.label}</span> : null}
    </div>
  ),
}));

import { useAuth } from "@/hooks/useAuth";
import { useFaucetAdmin } from "@/hooks/useFaucetAdmin";

const mockUseAuth = useAuth as unknown as vi.Mock;
const mockUseFaucetAdmin = useFaucetAdmin as unknown as vi.Mock;

function renderLayout() {
  return render(
    <FaucetAdminLayout>
      <div data-testid="faucet-children">Faucet admin content</div>
    </FaucetAdminLayout>
  );
}

describe("FaucetAdminLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("never redirects via router.push for any auth state", () => {
    mockUseAuth.mockReturnValue({ ready: true, authenticated: false });
    mockUseFaucetAdmin.mockReturnValue({ isAdmin: false, isLoading: false });
    renderLayout();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("shows a spinner while Privy is not ready", () => {
    mockUseAuth.mockReturnValue({ ready: false, authenticated: false });
    mockUseFaucetAdmin.mockReturnValue({ isAdmin: false, isLoading: true });
    renderLayout();
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
    expect(screen.queryByTestId("access-denied")).not.toBeInTheDocument();
  });

  it("shows AccessDenied with a sign-in CTA for unauthenticated visitors", () => {
    mockUseAuth.mockReturnValue({ ready: true, authenticated: false });
    mockUseFaucetAdmin.mockReturnValue({ isAdmin: false, isLoading: false });
    renderLayout();
    expect(screen.getByTestId("access-denied")).toBeInTheDocument();
    expect(screen.getByTestId("access-denied-cta")).toBeInTheDocument();
  });

  it("shows AccessDenied for an authenticated non-admin", () => {
    mockUseAuth.mockReturnValue({ ready: true, authenticated: true });
    mockUseFaucetAdmin.mockReturnValue({ isAdmin: false, isLoading: false });
    renderLayout();
    expect(screen.getByTestId("access-denied")).toBeInTheDocument();
    expect(screen.queryByTestId("faucet-children")).not.toBeInTheDocument();
  });

  it("renders children for an authenticated admin even while wagmi isConnected is false", () => {
    // Startup-race regression: gating must use Privy authenticated, not wagmi
    // isConnected, so an authenticated admin is never bounced to AccessDenied.
    mockUseAuth.mockReturnValue({ ready: true, authenticated: true, isConnected: false });
    mockUseFaucetAdmin.mockReturnValue({ isAdmin: true, isLoading: false });
    renderLayout();
    expect(screen.getByTestId("faucet-children")).toBeInTheDocument();
    expect(screen.queryByTestId("access-denied")).not.toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
