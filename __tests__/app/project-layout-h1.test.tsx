/**
 * @jest-environment jsdom
 */
import { render } from "@testing-library/react";

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

// The JSON-LD components render inert <script> tags; stub them so this test
// focuses on the single <h1> heading signal.
vi.mock("@/components/Seo/ProjectJsonLd", () => ({ ProjectJsonLd: () => null }));
vi.mock("@/components/Seo/BreadcrumbJsonLd", () => ({ BreadcrumbJsonLd: () => null }));

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
  unstable_rethrow: vi.fn(),
  redirect: vi.fn(),
  usePathname: vi.fn(() => "/"),
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn() })),
  useSearchParams: vi.fn(() => ({ get: vi.fn() })),
  useParams: vi.fn(() => ({})),
}));

import type { Project } from "@/types/v2/project";
import { getProjectCachedData } from "@/utilities/queries/getProjectCachedData";

const mockGetProjectCachedData = getProjectCachedData as vi.MockedFunction<
  typeof getProjectCachedData
>;

function createMockProject(overrides: Partial<Project["details"]> = {}): Project {
  return {
    uid: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as `0x${string}`,
    chainID: 10,
    owner: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd" as `0x${string}`,
    details: {
      title: "Test Project Title",
      slug: "test-project",
      ...overrides,
    },
    members: [],
    pointers: [],
    createdAt: "2024-01-01",
  } as Project;
}

describe("Project Layout - server-rendered single h1", () => {
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

  it("renders exactly one sr-only h1 with the project title", async () => {
    mockGetProjectCachedData.mockResolvedValue(createMockProject());
    const { container } = await renderLayout();

    const h1s = container.querySelectorAll("h1");
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent("Test Project Title");
    expect(h1s[0]).toHaveClass("sr-only");
  });

  it("omits the h1 when the project has no title", async () => {
    mockGetProjectCachedData.mockResolvedValue(createMockProject({ title: "" }));
    const { container } = await renderLayout();

    expect(container.querySelectorAll("h1")).toHaveLength(0);
  });

  it("omits the h1 when project data fails to load", async () => {
    mockGetProjectCachedData.mockRejectedValue(new Error("Not found"));
    const { container } = await renderLayout();

    expect(container.querySelectorAll("h1")).toHaveLength(0);
  });
});
