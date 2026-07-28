import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { type KycStatusResponse, KycVerificationStatus, KycVerificationType } from "@/types/kyc";
import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";
import { KycStatusBadgeWithActions } from "../KycStatusBadgeWithActions";

// Mock the typed api client so the real mutation hook runs against it
vi.mock("@/utilities/api/client", () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

// Role gate — controlled per test. Fail-closed: the real hook returns false
// while permissions are still resolving, which is the same read-only path.
const mockUseHasRoleOrHigher = vi.fn();
vi.mock("@/src/core/rbac/context/permission-context", () => ({
  useHasRoleOrHigher: (role: string) => mockUseHasRoleOrHigher(role),
}));

// Radix dropdown is not jsdom-friendly — mock the ui wrappers (established
// pattern, see ProjectOptionsMenu.test.tsx). Content renders inline so menu
// items are directly assertable/clickable.
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div role="menu">{children}</div>,
  DropdownMenuItem: ({ children, onSelect }: { children: ReactNode; onSelect?: () => void }) => (
    <button type="button" role="menuitem" onClick={() => onSelect?.()}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: () => null,
}));

const mockApi = api as unknown as {
  get: vi.Mock;
  post: vi.Mock;
  put: vi.Mock;
};

const APP_REF = "APP-123";

const createMockStatus = (overrides: Partial<KycStatusResponse> = {}): KycStatusResponse => ({
  projectUID: "project-123",
  communityUID: "community-456",
  status: KycVerificationStatus.NOT_STARTED,
  verificationType: KycVerificationType.KYC,
  isExpired: false,
  ...overrides,
});

describe("KycStatusBadgeWithActions", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const renderBadge = (status: KycStatusResponse | null) =>
    render(<KycStatusBadgeWithActions status={status} applicationReference={APP_REF} />, {
      wrapper,
    });

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    vi.clearAllMocks();
    mockUseHasRoleOrHigher.mockReturnValue(false);
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("community admin viewer", () => {
    beforeEach(() => {
      mockUseHasRoleOrHigher.mockReturnValue(true);
    });

    it("gates on the COMMUNITY_ADMIN role", () => {
      renderBadge(createMockStatus());

      expect(mockUseHasRoleOrHigher).toHaveBeenCalledWith("COMMUNITY_ADMIN");
    });

    it("renders an interactive badge with menu affordances for NOT_STARTED", () => {
      renderBadge(createMockStatus());

      const trigger = screen.getByRole("button", { name: "Change Not Started status" });
      expect(trigger).toHaveAttribute("aria-haspopup", "menu");
      expect(trigger).toHaveAttribute("type", "button");
      expect(screen.getByRole("menuitem", { name: /Mark as Not applicable/ })).toBeInTheDocument();
    });

    it("renders the interactive badge when status is null (absent row reads as NOT_STARTED)", () => {
      renderBadge(null);

      expect(screen.getByRole("button", { name: "Change Not Started status" })).toBeInTheDocument();
    });

    it("fires the mutation with the correct body when marking Not applicable", async () => {
      const user = userEvent.setup();
      mockApi.put.mockResolvedValue(
        createMockStatus({ status: KycVerificationStatus.NOT_APPLICABLE })
      );

      renderBadge(createMockStatus());

      await user.click(screen.getByRole("menuitem", { name: /Mark as Not applicable/ }));

      await waitFor(() => {
        expect(mockApi.put).toHaveBeenCalledWith(INDEXER.KYC.SET_APPLICABILITY, {
          applicationReference: APP_REF,
          verificationType: KycVerificationType.KYC,
          status: KycVerificationStatus.NOT_APPLICABLE,
        });
      });
    });

    it("offers only the reset action for NOT_APPLICABLE and fires the undo mutation", async () => {
      const user = userEvent.setup();
      mockApi.put.mockResolvedValue(createMockStatus());

      renderBadge(
        createMockStatus({
          status: KycVerificationStatus.NOT_APPLICABLE,
          verificationType: KycVerificationType.KYB,
        })
      );

      expect(
        screen.getByRole("button", { name: "Change Not applicable status" })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("menuitem", { name: /Mark as Not applicable/ })
      ).not.toBeInTheDocument();

      await user.click(screen.getByRole("menuitem", { name: "Reset to Not started" }));

      await waitFor(() => {
        expect(mockApi.put).toHaveBeenCalledWith(INDEXER.KYC.SET_APPLICABILITY, {
          applicationReference: APP_REF,
          // Existing row's type is forwarded (server preserves it regardless)
          verificationType: KycVerificationType.KYB,
          status: KycVerificationStatus.NOT_STARTED,
        });
      });
    });

    it.each([
      KycVerificationStatus.PENDING,
      KycVerificationStatus.OUTREACH,
      KycVerificationStatus.VERIFIED,
      KycVerificationStatus.REJECTED,
    ])("renders the plain read-only badge for %s (outside the toggle pair)", (status) => {
      renderBadge(createMockStatus({ status }));

      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("renders the plain read-only badge for EXPIRED (computed from isExpired)", () => {
      renderBadge(
        createMockStatus({
          status: KycVerificationStatus.VERIFIED,
          verifiedAt: "2024-01-01T00:00:00Z",
          expiresAt: "2025-01-01T00:00:00Z",
          isExpired: true,
        })
      );

      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      expect(screen.getByText("KYC expired")).toBeInTheDocument();
    });
  });

  describe("non-admin viewer", () => {
    it("renders the plain read-only badge with no menu affordances", () => {
      mockUseHasRoleOrHigher.mockReturnValue(false);

      renderBadge(createMockStatus());

      expect(screen.getByText("Not Started")).toBeInTheDocument();
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
      expect(document.querySelector("[aria-haspopup]")).not.toBeInTheDocument();
    });
  });

  describe("permissions resolving (fail-closed)", () => {
    it("renders the plain read-only badge while the role gate has not resolved to true", () => {
      // useHasRoleOrHigher returns false while isLoading — same read-only path,
      // so no clickable control ever flashes for a viewer who turns out denied
      mockUseHasRoleOrHigher.mockReturnValue(false);

      renderBadge(createMockStatus({ status: KycVerificationStatus.NOT_APPLICABLE }));

      expect(screen.getByText("Not applicable")).toBeInTheDocument();
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
  });
});
