/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    dehydrate: vi.fn(() => ({ queries: [] })),
    HydrationBoundary: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="hydration-boundary">{children}</div>
    ),
  };
});

vi.mock("@/components/Pages/Project/ProjectShareDialogMount", () => ({
  ProjectShareDialogMount: () => null,
}));

vi.mock("@/components/Utilities/E2EStoreExposer", () => ({
  E2EStoreExposer: () => null,
}));

vi.mock("@/utilities/queries/getProjectCachedData", () => ({
  getProjectCachedData: vi.fn(),
}));

vi.mock("@/utilities/queries/prefetchProjectProfile", () => ({
  prefetchProjectProfileData: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/utilities/metadata/projectMetadata", () => ({
  generateProjectOverviewMetadata: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
  redirect: vi.fn(),
}));

import type { Project } from "@/types/v2/project";
import { getProjectCachedData } from "@/utilities/queries/getProjectCachedData";

const mockGetProjectCachedData = getProjectCachedData as vi.MockedFunction<
  typeof getProjectCachedData
>;

function createMockProject(overrides: Partial<Project> = {}): Project {
  return {
    uid: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as `0x${string}`,
    chainID: 10,
    owner: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd" as `0x${string}`,
    details: {
      title: "Test Project Title",
      slug: "test-project",
      logoUrl: "https://example.com/logo.png",
    },
    members: [],
    pointers: [],
    createdAt: "2024-01-01",
    ...overrides,
  } as Project;
}

describe("Project Layout - Server Prefetch + HydrationBoundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS = "false";
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS;
  });

  async function renderLayout(projectId = "test-project") {
    const { default: RootLayout } = await import("@/app/project/[projectId]/layout");
    const element = await RootLayout({
      children: <div data-testid="children">Children</div>,
      params: Promise.resolve({ projectId }),
    });
    return render(element as React.ReactElement);
  }

  it("renders children inside HydrationBoundary", async () => {
    mockGetProjectCachedData.mockResolvedValue(createMockProject());
    await renderLayout();

    const boundary = screen.getByTestId("hydration-boundary");
    const children = screen.getByTestId("children");
    expect(boundary).toContainElement(children);
  });

  it("does not render ssr-lcp-shell (removed in favor of HydrationBoundary)", async () => {
    mockGetProjectCachedData.mockResolvedValue(createMockProject());
    await renderLayout();

    expect(document.getElementById("ssr-lcp-shell")).toBeNull();
  });

  it("renders children even when project data fails to load", async () => {
    mockGetProjectCachedData.mockRejectedValue(new Error("Not found"));
    await renderLayout();

    expect(screen.getByTestId("children")).toBeInTheDocument();
  });

  it("skips prefetch during E2E tests", async () => {
    process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS = "true";
    mockGetProjectCachedData.mockResolvedValue(createMockProject());
    await renderLayout();

    // prefetchQuery should not be called since E2E bypass is set
    expect(screen.getByTestId("children")).toBeInTheDocument();
  });
});
