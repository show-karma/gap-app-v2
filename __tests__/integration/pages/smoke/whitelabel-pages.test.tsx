import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type React from "react";

/**
 * Smoke tests for whitelabel application/program routes. These pages are
 * async server components that fetch from the indexer; we mock the api
 * client to return a sentinel application/program and assert the page renders.
 */

const mockApplication = {
  uid: "app-1",
  programId: "prog-1",
  referenceNumber: "APP-001",
  status: "submitted",
  applicantEmail: "test@example.com",
  applicationData: { name: "Alice" },
  createdAt: "2025-01-15T00:00:00Z",
};

const mockProgram = {
  programId: "prog-1",
  name: "Test Program",
  metadata: { title: "Test Program" },
  applicationConfig: {
    isEnabled: true,
    formSchema: {
      title: "App Form",
      fields: [{ id: "f1", label: "Name", type: "text", required: true }],
    },
  },
};

// The application detail/edit/success pages and the programs/apply page were
// migrated off fetchData onto the unified api client (#1775 Phase 3). Mirror
// the same sentinel shapes for api.get so those pages still render.
vi.mock("@/utilities/api/client", () => ({
  api: {
    get: vi.fn().mockImplementation(async (path: string) => {
      if (path.includes("funding-applications/")) return mockApplication;
      if (path.includes("funding-program-configs/")) return mockProgram;
      return null;
    }),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
    getPaginated: vi.fn(),
  },
}));

vi.mock("@/utilities/queries/v2/community", () => ({
  getCommunityDetails: vi.fn().mockResolvedValue({
    uid: "c1",
    details: { name: "Test Community", slug: "test-community" },
  }),
}));

vi.mock("@/utilities/queries/v2/getCommunityData", () => ({
  getCommunityDetails: vi.fn().mockResolvedValue({
    uid: "c1",
    details: { name: "Test Community", slug: "test-community" },
  }),
}));

// `getWhitelabelContext` reads request headers, which have no request scope
// in this environment. The non-whitelabel default mirrors the main domain.
vi.mock("@/utilities/whitelabel-server", () => ({
  getWhitelabelContext: async () => ({ isWhitelabel: false, config: null }),
}));

vi.mock("@/utilities/funding-programs", () => ({
  isProgramEnabled: () => true,
  getProgramStatusInfo: () => ({
    status: "open",
    label: "Open for Applications",
    color: "success",
    dotColor: "bg-green-600",
    endsSoon: false,
  }),
}));

vi.mock("@/utilities/community-flags", () => ({
  FINANCIALS_ENABLED_COMMUNITIES: ["c1"],
  EXPLORER_NAV_OVERRIDES: {},
}));

vi.mock("@/src/features/payout-disbursement/services/payout-disbursement.service", () => ({
  getCommunityPayoutsPublic: vi.fn().mockResolvedValue({ data: [], pagination: {} }),
}));

vi.mock("@/utilities/indexer", () => ({
  INDEXER: {
    COMMUNITY: {
      PROGRAMS: (id: string) => `/communities/${id}/programs`,
    },
    KYC: {
      GET_CONFIG: (id: string) => `/communities/${id}/kyc/config`,
    },
    V2: {
      FUNDING_PROGRAMS: {
        GET: (programId: string) => `/v2/funding-program-configs/${programId}`,
      },
    },
  },
}));

vi.mock("@/src/features/applications/lib/form-utils", () => ({
  transformFormSchemaToQuestions: () => [],
}));

vi.mock("@/src/core/rbac/context/permission-context", () => ({
  PermissionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  usePermissionContext: () => ({ isLoading: false, can: () => true }),
}));

vi.mock("@/components/Utilities/MarkdownPreview", () => ({
  MarkdownPreview: ({ source }: { source?: string }) => (
    <div data-testid="markdown-preview">{source ?? ""}</div>
  ),
}));

vi.mock("@/src/components/ui/ApplicationStatusChip", () => ({
  ApplicationStatusChip: ({ status }: { status: string }) => (
    <span data-testid="application-status-chip">{status}</span>
  ),
}));

vi.mock("@/src/components/navigation/Link", () => ({
  Link: ({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>) => (
    // biome-ignore lint/a11y/useValidAnchor: stub
    <a {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>{children}</a>
  ),
}));

vi.mock(
  "@/app/t/[tenant]/community/[communityId]/(whitelabel)/applications/[applicationId]/ApplicationPageClient",
  () => ({
    ApplicationPageClient: ({ communityId }: { communityId: string }) => (
      <div data-testid="application-page-client">{communityId}</div>
    ),
  })
);

vi.mock(
  "@/app/t/[tenant]/community/[communityId]/(whitelabel)/applications/[applicationId]/edit/ApplicationEditClient",
  () => ({
    ApplicationEditClient: () => <div data-testid="application-edit-client">EditClient</div>,
  })
);

vi.mock(
  "@/app/t/[tenant]/community/[communityId]/(whitelabel)/applications/[applicationId]/success/WhatHappensNext",
  () => ({
    WhatHappensNext: () => <div data-testid="what-happens-next">WhatHappensNext</div>,
    extractApplicantName: (d: Record<string, unknown> | undefined) =>
      (d?.name as string) ?? "Applicant",
  })
);

vi.mock(
  "@/app/t/[tenant]/community/[communityId]/(whitelabel)/applications/[applicationId]/success/WhatHappensNextSkeleton",
  () => ({
    WhatHappensNextSkeleton: () => <div data-testid="what-happens-next-skeleton">Loading</div>,
  })
);

vi.mock(
  "@/app/t/[tenant]/community/[communityId]/(whitelabel)/programs/[programId]/apply/ApplicationFormClient",
  () => ({
    ApplicationFormClient: () => <div data-testid="application-form-client">ApplicationForm</div>,
  })
);

vi.mock("@/components/Pages/Communities/Financials/PublicControlCenter", () => ({
  PublicControlCenter: () => <div data-testid="public-control-center">PublicControlCenter</div>,
}));

vi.mock("@/utilities/queries/defaultOptions", () => ({
  defaultQueryOptions: {},
}));

const renderInQueryClient = (element: React.ReactElement) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{element}</QueryClientProvider>);
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Whitelabel application detail page", () => {
  it("/applications/[applicationId] renders ApplicationPageClient", async () => {
    const { default: Page } = await import(
      "@/app/t/[tenant]/community/[communityId]/(whitelabel)/applications/[applicationId]/page"
    );
    const result = await Page({
      params: Promise.resolve({ communityId: "c1", applicationId: "app-1" }),
    });
    render(result);
    expect(screen.getByTestId("application-page-client")).toBeInTheDocument();
  });

  it("/applications/[applicationId] renders not-available when fetch fails", async () => {
    const { api } = await import("@/utilities/api/client");
    vi.mocked(api.get).mockResolvedValueOnce(null);
    const { default: Page } = await import(
      "@/app/t/[tenant]/community/[communityId]/(whitelabel)/applications/[applicationId]/page"
    );
    const result = await Page({
      params: Promise.resolve({ communityId: "c1", applicationId: "missing" }),
    });
    render(result);
    expect(screen.getByRole("heading", { name: /application not available/i })).toBeInTheDocument();
  });
});

describe("Whitelabel application edit page", () => {
  it("/applications/[applicationId]/edit renders ApplicationEditClient", async () => {
    const { default: Page } = await import(
      "@/app/t/[tenant]/community/[communityId]/(whitelabel)/applications/[applicationId]/edit/page"
    );
    const result = await Page({
      params: Promise.resolve({ communityId: "c1", applicationId: "app-1" }),
    });
    render(result);
    expect(screen.getByTestId("application-edit-client")).toBeInTheDocument();
  });

  it("/applications/[applicationId]/edit renders not-available when fetch fails", async () => {
    const { api } = await import("@/utilities/api/client");
    vi.mocked(api.get).mockResolvedValueOnce(null);
    const { default: Page } = await import(
      "@/app/t/[tenant]/community/[communityId]/(whitelabel)/applications/[applicationId]/edit/page"
    );
    const result = await Page({
      params: Promise.resolve({ communityId: "c1", applicationId: "missing" }),
    });
    render(result);
    expect(screen.getByRole("heading", { name: /application not available/i })).toBeInTheDocument();
  });
});

describe("Whitelabel application success page", () => {
  it("/applications/[applicationId]/success renders thanks message and reference", async () => {
    const { default: Page } = await import(
      "@/app/t/[tenant]/community/[communityId]/(whitelabel)/applications/[applicationId]/success/page"
    );
    const result = await Page({
      params: Promise.resolve({ communityId: "c1", applicationId: "app-1" }),
    });
    render(result);
    expect(screen.getByRole("heading", { name: /thanks for submitting/i })).toBeInTheDocument();
    expect(screen.getByText(/APP-001/)).toBeInTheDocument();
    expect(screen.getByTestId("application-status-chip")).toBeInTheDocument();
  });
});

describe("Whitelabel programs/[programId]/apply page", () => {
  it("renders ApplicationFormClient with full schema", async () => {
    const { default: Page } = await import(
      "@/app/t/[tenant]/community/[communityId]/(whitelabel)/programs/[programId]/apply/page"
    );
    const result = await Page({
      params: Promise.resolve({ communityId: "c1", programId: "prog-1" }),
    });
    render(result);
    expect(screen.getByTestId("application-form-client")).toBeInTheDocument();
  });

  it("renders 'form not available' empty state when schema has no fields", async () => {
    const { api } = await import("@/utilities/api/client");
    vi.mocked(api.get).mockResolvedValueOnce({
      ...mockProgram,
      applicationConfig: { ...mockProgram.applicationConfig, formSchema: { fields: [] } },
    });
    const { default: Page } = await import(
      "@/app/t/[tenant]/community/[communityId]/(whitelabel)/programs/[programId]/apply/page"
    );
    const result = await Page({
      params: Promise.resolve({ communityId: "c1", programId: "prog-1" }),
    });
    render(result);
    expect(
      screen.getByRole("heading", { name: /application form not available yet/i })
    ).toBeInTheDocument();
  });
});

describe("Whitelabel programs/[programId] page", () => {
  // The page is an async server component that prefetches the program and
  // hands it to the client tree as a hydrated React Query entry, so it is
  // driven the same way as the other server components in this file.
  const importProgramPage = async () => {
    vi.doMock("next/navigation", () => ({
      useParams: () => ({ communityId: "c1", programId: "prog-1" }),
    }));
    vi.resetModules();
    return import(
      "@/app/t/[tenant]/community/[communityId]/(whitelabel)/programs/[programId]/page"
    );
  };

  afterEach(() => {
    vi.doUnmock("@/features/programs/hooks/use-program");
    vi.doUnmock("next/navigation");
  });

  it("/programs/[programId] renders the prefetched program instead of a skeleton", async () => {
    const { default: Page } = await importProgramPage();
    const result = await Page({
      params: Promise.resolve({ communityId: "c1", programId: "prog-1" }),
    });
    const { container } = renderInQueryClient(result);
    expect(screen.getByRole("heading", { name: "Test Program" })).toBeInTheDocument();
    expect(container.querySelector(".animate-pulse")).toBeNull();
  });

  it("/programs/[programId] still renders the loading skeleton while the client fetches", async () => {
    vi.doMock("@/features/programs/hooks/use-program", () => ({
      PROGRAM_DETAIL_STALE_TIME: 5 * 60 * 1000,
      useProgram: () => ({
        program: null,
        loading: true,
        error: null,
        refetch: vi.fn(),
      }),
    }));
    const { default: Page } = await importProgramPage();
    const result = await Page({
      params: Promise.resolve({ communityId: "c1", programId: "prog-1" }),
    });
    const { container } = renderInQueryClient(result);
    expect(container.querySelector(".animate-pulse")).not.toBeNull();
  });
});

describe("/(cover)/financials page", () => {
  it("renders PublicControlCenter for enabled community", async () => {
    const { default: Page } = await import(
      "@/app/t/[tenant]/community/[communityId]/(cover)/financials/page"
    );
    const result = await Page({ params: Promise.resolve({ communityId: "c1" }) });
    renderInQueryClient(result);
    expect(screen.getByTestId("public-control-center")).toBeInTheDocument();
  });
});
