import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type React from "react";

/**
 * Smoke tests for whitelabel application/program routes. These pages are
 * async server components that fetch from the indexer; we mock fetchData
 * to return a sentinel application/program and assert the page renders.
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

vi.mock("@/utilities/fetchData", () => ({
  __esModule: true,
  default: vi.fn().mockImplementation(async (url: string) => {
    if (url.includes("funding-applications/")) return [mockApplication, null];
    if (url.includes("funding-program-configs/")) return [mockProgram, null];
    return [null, null];
  }),
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

vi.mock("@/utilities/funding-programs", () => ({
  isProgramEnabled: () => true,
}));

vi.mock("@/utilities/community-flags", () => ({
  FINANCIALS_ENABLED_COMMUNITIES: ["c1"],
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
  "@/app/community/[communityId]/(whitelabel)/applications/[applicationId]/ApplicationPageClient",
  () => ({
    ApplicationPageClient: ({ communityId }: { communityId: string }) => (
      <div data-testid="application-page-client">{communityId}</div>
    ),
  })
);

vi.mock(
  "@/app/community/[communityId]/(whitelabel)/applications/[applicationId]/edit/ApplicationEditClient",
  () => ({
    ApplicationEditClient: () => <div data-testid="application-edit-client">EditClient</div>,
  })
);

vi.mock(
  "@/app/community/[communityId]/(whitelabel)/applications/[applicationId]/success/WhatHappensNext",
  () => ({
    WhatHappensNext: () => <div data-testid="what-happens-next">WhatHappensNext</div>,
    extractApplicantName: (d: Record<string, unknown> | undefined) =>
      (d?.name as string) ?? "Applicant",
  })
);

vi.mock(
  "@/app/community/[communityId]/(whitelabel)/applications/[applicationId]/success/WhatHappensNextSkeleton",
  () => ({
    WhatHappensNextSkeleton: () => <div data-testid="what-happens-next-skeleton">Loading</div>,
  })
);

vi.mock(
  "@/app/community/[communityId]/(whitelabel)/programs/[programId]/apply/ApplicationFormClient",
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

describe("Whitelabel application detail page", () => {
  it("/applications/[applicationId] renders ApplicationPageClient", async () => {
    const { default: Page } = await import(
      "@/app/community/[communityId]/(whitelabel)/applications/[applicationId]/page"
    );
    const result = await Page({
      params: Promise.resolve({ communityId: "c1", applicationId: "app-1" }),
    });
    render(result);
    expect(screen.getByTestId("application-page-client")).toBeInTheDocument();
  });

  it("/applications/[applicationId] renders not-available when fetch fails", async () => {
    const fetchData = (await import("@/utilities/fetchData")).default as unknown as ReturnType<
      typeof vi.fn
    >;
    fetchData.mockResolvedValueOnce([null, null]);
    const { default: Page } = await import(
      "@/app/community/[communityId]/(whitelabel)/applications/[applicationId]/page"
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
      "@/app/community/[communityId]/(whitelabel)/applications/[applicationId]/edit/page"
    );
    const result = await Page({
      params: Promise.resolve({ communityId: "c1", applicationId: "app-1" }),
    });
    render(result);
    expect(screen.getByTestId("application-edit-client")).toBeInTheDocument();
  });

  it("/applications/[applicationId]/edit renders not-available when fetch fails", async () => {
    const fetchData = (await import("@/utilities/fetchData")).default as unknown as ReturnType<
      typeof vi.fn
    >;
    fetchData.mockResolvedValueOnce([null, null]);
    const { default: Page } = await import(
      "@/app/community/[communityId]/(whitelabel)/applications/[applicationId]/edit/page"
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
      "@/app/community/[communityId]/(whitelabel)/applications/[applicationId]/success/page"
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
      "@/app/community/[communityId]/(whitelabel)/programs/[programId]/apply/page"
    );
    const result = await Page({
      params: Promise.resolve({ communityId: "c1", programId: "prog-1" }),
    });
    render(result);
    expect(screen.getByTestId("application-form-client")).toBeInTheDocument();
  });

  it("renders 'form not available' empty state when schema has no fields", async () => {
    const fetchData = (await import("@/utilities/fetchData")).default as unknown as ReturnType<
      typeof vi.fn
    >;
    fetchData.mockResolvedValueOnce([
      {
        ...mockProgram,
        applicationConfig: { ...mockProgram.applicationConfig, formSchema: { fields: [] } },
      },
      null,
    ]);
    const { default: Page } = await import(
      "@/app/community/[communityId]/(whitelabel)/programs/[programId]/apply/page"
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

describe("Whitelabel programs/[programId] client page", () => {
  it("/programs/[programId] renders loading state when useProgram is loading", async () => {
    vi.doMock("@/features/programs/hooks/use-program", () => ({
      useProgram: () => ({
        program: null,
        loading: true,
        error: null,
        refetch: vi.fn(),
      }),
    }));
    vi.doMock("next/navigation", () => ({
      useParams: () => ({ communityId: "c1", programId: "prog-1" }),
    }));
    vi.resetModules();
    const { default: Page } = await import(
      "@/app/community/[communityId]/(whitelabel)/programs/[programId]/page"
    );
    const { container } = renderInQueryClient(<Page />);
    expect(container.querySelector(".animate-pulse")).not.toBeNull();
    vi.doUnmock("@/features/programs/hooks/use-program");
    vi.doUnmock("next/navigation");
  });
});

describe("/(with-header)/financials page", () => {
  it("renders PublicControlCenter for enabled community", async () => {
    const { default: Page } = await import(
      "@/app/community/[communityId]/(with-header)/financials/page"
    );
    const result = await Page({ params: Promise.resolve({ communityId: "c1" }) });
    renderInQueryClient(result);
    expect(screen.getByTestId("public-control-center")).toBeInTheDocument();
  });
});
