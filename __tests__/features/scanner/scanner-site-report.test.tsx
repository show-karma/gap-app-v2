import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ScannerSiteReport } from "@/src/features/scanner/components/scanner-site-report";
import { useScanByUrl } from "@/src/features/scanner/hooks/use-scan-by-url";
import type { DetailScorecardPayload } from "@/src/features/scanner/types";

// ScannerSiteReport is the website-addressable entry: it resolves the report by
// URL, then delegates to the existing tier components. These tests pin the state
// routing (loading / error / no-report / generating) and the tier split
// (anonymous -> public scorecard, authenticated -> members-only detail).
const mockAuthState = { ready: true, authenticated: false, login: vi.fn(), user: undefined };
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockAuthState,
  setPostLoginRedirect: vi.fn(),
}));
vi.mock("@/src/features/scanner/hooks/use-scan-by-url", () => ({ useScanByUrl: vi.fn() }));
// Delegated tier components re-resolve their own data; stub them to sentinels so
// this suite stays on ScannerSiteReport's own routing.
vi.mock("@/src/features/scanner/components/logged-in-detail", () => ({
  LoggedInDetail: ({ scanId }: { scanId: string }) => <div>detail-tier:{scanId}</div>,
}));
vi.mock("@/src/features/scanner/components/public-scorecard", () => ({
  PublicScorecard: ({ slug }: { slug: string }) => <div>public-tier:{slug}</div>,
}));
// NoReportForSite pulls in the submit mutation (react-query client); stub it so
// the empty-state branch renders without a provider.
vi.mock("@/src/features/scanner/hooks/use-submit-scan", () => ({
  useSubmitScan: () => ({ mutate: vi.fn(), isPending: false }),
}));

const mockHook = vi.mocked(useScanByUrl);

function hookState(overrides: Partial<ReturnType<typeof useScanByUrl>>) {
  return {
    data: undefined,
    isError: false,
    isPending: false,
    refetch: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useScanByUrl>;
}

function scan(overrides: Partial<DetailScorecardPayload>): DetailScorecardPayload {
  return {
    scanId: "scan-1",
    slug: "slug-1",
    targetUrl: "https://karmahq.xyz/",
    status: "complete",
    viewerIsOwner: false,
    url: "https://karmahq.xyz/",
    ...overrides,
  };
}

describe("ScannerSiteReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState.authenticated = false;
    mockAuthState.ready = true;
  });
  afterEach(() => vi.clearAllMocks());

  it("shows a generating state while the by-url lookup is pending", () => {
    mockHook.mockReturnValue(hookState({ isPending: true }));
    render(<ScannerSiteReport domain="karmahq.xyz" />);

    expect(screen.getByLabelText(/generating report/i)).toBeInTheDocument();
  });

  it("surfaces an error with retry when the lookup fails with no data", () => {
    mockHook.mockReturnValue(hookState({ isError: true, data: undefined }));
    render(<ScannerSiteReport domain="karmahq.xyz" />);

    expect(screen.getByText(/couldn'?t load this report/i)).toBeInTheDocument();
  });

  it("offers to scan when the site has no report yet (null data)", () => {
    mockHook.mockReturnValue(hookState({ data: null }));
    render(<ScannerSiteReport domain="karmahq.xyz" />);

    expect(screen.getByText(/no report yet for karmahq\.xyz/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /scan this site/i })).toBeInTheDocument();
  });

  it("offers to scan on a no-report domain even while Privy auth is still loading", () => {
    mockAuthState.ready = false;
    mockHook.mockReturnValue(hookState({ data: null }));
    render(<ScannerSiteReport domain="karmahq.xyz" />);

    expect(screen.getByRole("button", { name: /scan this site/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/generating report/i)).not.toBeInTheDocument();
  });

  it("keeps showing progress for a non-terminal scan", () => {
    mockHook.mockReturnValue(hookState({ data: scan({ status: "running_agent" }) }));
    render(<ScannerSiteReport domain="karmahq.xyz" />);

    expect(screen.getByLabelText(/generating report/i)).toBeInTheDocument();
  });

  it("renders the public tier for an anonymous viewer on a complete scan", () => {
    mockHook.mockReturnValue(hookState({ data: scan({ status: "complete" }) }));
    render(<ScannerSiteReport domain="karmahq.xyz" />);

    expect(screen.getByText(/public-tier:slug-1/)).toBeInTheDocument();
    expect(screen.queryByText(/detail-tier/)).not.toBeInTheDocument();
  });

  it("renders the members-only detail tier for an authenticated viewer", () => {
    mockAuthState.authenticated = true;
    mockHook.mockReturnValue(hookState({ data: scan({ status: "complete" }) }));
    render(<ScannerSiteReport domain="karmahq.xyz" />);

    expect(screen.getByText(/detail-tier:scan-1/)).toBeInTheDocument();
    expect(screen.queryByText(/public-tier/)).not.toBeInTheDocument();
  });

  it("rejects an unparseable domain param before resolving", () => {
    mockHook.mockReturnValue(hookState({ data: undefined }));
    render(<ScannerSiteReport domain="not a domain" />);

    expect(screen.getByText(/doesn'?t look like a valid website/i)).toBeInTheDocument();
  });
});
