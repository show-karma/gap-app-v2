import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FundingProgram } from "@/services/fundingPlatformService";
import { PAGES } from "@/utilities/pages";

const COMMUNITY_ID = "test-community";

// Shared router spy so we can assert the old state->URL sync effect is gone:
// mounting the programs list must dispatch zero App Router navigations.
const pushSpy = vi.fn();
const replaceSpy = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ communityId: COMMUNITY_ID }),
  useRouter: () => ({
    push: pushSpy,
    replace: replaceSpy,
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => `/community/${COMMUNITY_ID}/manage/funding-platform`,
  useSearchParams: () => new URLSearchParams(),
}));

// nuqs writes through history.replaceState, not the router. A simple stateful
// stub keeps the component rendering without touching `pushSpy`/`replaceSpy`.
vi.mock("nuqs", () => ({
  useQueryState: (_key: string, options?: { defaultValue?: unknown }) => {
    let value: unknown = options?.defaultValue ?? null;
    const setValue = (next: unknown) => {
      value = next;
    };
    return [value, setValue] as const;
  },
}));

const createMockProgram = (overrides: Partial<FundingProgram> = {}): FundingProgram =>
  ({
    programId: "program-1",
    chainID: 1,
    name: "Test Program",
    metadata: {
      title: "Test Program",
      description: "A funding program",
      shortDescription: "A funding program",
    },
    applicationConfig: { isEnabled: true },
    metrics: {
      totalApplications: 5,
      pendingApplications: 2,
      approvedApplications: 1,
      rejectedApplications: 1,
      revisionRequestedApplications: 0,
      underReviewApplications: 1,
    },
    ...overrides,
  }) as FundingProgram;

const mockPrograms: FundingProgram[] = [createMockProgram()];

vi.mock("@/hooks/useFundingPlatform", () => ({
  useFundingPrograms: () => ({
    programs: mockPrograms,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/hooks/usePermissions", () => ({
  useReviewerPrograms: () => ({ programs: [], isLoading: false }),
}));

vi.mock("@/utilities/whitelabel-context", () => ({
  useWhitelabel: () => ({ isWhitelabel: false }),
}));

vi.mock("@/src/core/rbac", () => ({
  FundingPlatformGuard: ({ children }: { children: ReactNode }) => <>{children}</>,
  AdminOnly: ({ children }: { children: ReactNode }) => <>{children}</>,
  useIsFundingPlatformAdmin: () => true,
}));

// Render Link as a plain anchor so we can read the resolved href directly.
vi.mock("@/src/components/navigation/Link", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/Utilities/MarkdownPreview", () => ({
  MarkdownPreview: ({ source }: { source?: string }) => <div>{source}</div>,
}));

vi.mock("@/components/FundingPlatform/CreateProgramModal", () => ({
  CreateProgramModal: () => null,
}));

import FundingPlatformPage from "../page";

describe("FundingPlatformPage — URL navigation regression (#1547)", () => {
  beforeEach(() => {
    pushSpy.mockClear();
    replaceSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("dispatches zero router.push navigations on mount", () => {
    render(<FundingPlatformPage />);

    expect(pushSpy).not.toHaveBeenCalled();
    expect(replaceSpy).not.toHaveBeenCalled();
  });

  it("renders the Applications link with the exact PAGES href", () => {
    render(<FundingPlatformPage />);

    const expectedHref = PAGES.MANAGE.FUNDING_PLATFORM.APPLICATIONS(COMMUNITY_ID, "program-1");
    const applicationsLink = screen.getByRole("link", { name: /Applications/i });

    expect(applicationsLink).toHaveAttribute("href", expectedHref);
  });
});
