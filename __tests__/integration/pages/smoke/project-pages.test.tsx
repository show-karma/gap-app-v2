import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";

/**
 * Smoke tests for /project/[projectId] routes. Most routes are thin wrappers
 * around colocated `*PageClient` components — we mock those clients with
 * sentinels and assert the page renders them. The async /updates route is
 * exercised end-to-end with mocked data layers.
 */

// next/dynamic — render the loading fallback (or, when no fallback, render
// the dynamic module via its default export). We can't easily run the dynamic
// importer synchronously, so always render a stub that proves dynamic() was
// called with a real component.
vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: (_loader: () => Promise<unknown>, options?: { loading?: () => React.ReactNode }) => {
    return function DynamicComponent() {
      return options?.loading ? options.loading() : <div data-testid="dynamic-stub" />;
    };
  },
}));

// Server-side data layer used by the /updates route
vi.mock("@/utilities/queries/getProjectCachedData", () => ({
  getProjectCachedData: vi.fn().mockResolvedValue({
    uid: "0xproj",
    details: { title: "Test Project", slug: "test-project" },
  }),
}));

vi.mock("@/services/project-updates.service", () => ({
  getProjectUpdates: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/utilities/queries/defaultOptions", () => ({
  defaultQueryOptions: {},
}));

vi.mock("@/utilities/queryKeys", () => ({
  QUERY_KEYS: {
    PROJECT: {
      UPDATES: (id: string) => ["project", id, "updates"],
    },
  },
}));

// Inner client mocks — colocated PageClient files
vi.mock("@/app/project/[projectId]/(profile)/about/AboutPageClient", () => ({
  AboutPageClient: () => <div data-testid="about-page-client">About</div>,
}));

vi.mock("@/app/project/[projectId]/(profile)/contact-info/ContactInfoPageClient", () => ({
  ContactInfoPageClient: () => <div data-testid="contact-info-page-client">ContactInfo</div>,
}));

vi.mock("@/app/project/[projectId]/(profile)/team/TeamPageClient", () => ({
  TeamPageClient: () => <div data-testid="team-page-client">Team</div>,
}));

vi.mock("@/app/project/[projectId]/(profile)/impact/ImpactPageClient", () => ({
  ImpactPageClient: () => <div data-testid="impact-page-client">Impact</div>,
}));

vi.mock("@/app/project/[projectId]/(profile)/funding/new/NewGrantPageClient", () => ({
  NewGrantPageClient: () => <div data-testid="new-grant-page-client">NewGrant</div>,
}));

vi.mock("@/app/project/[projectId]/(profile)/funding/[grantUid]/edit/EditGrantPageClient", () => ({
  EditGrantPageClient: () => <div data-testid="edit-grant-page-client">EditGrant</div>,
}));

vi.mock(
  "@/app/project/[projectId]/(profile)/funding/[grantUid]/complete-grant/CompleteGrantPageClient",
  () => ({
    CompleteGrantPageClient: () => (
      <div data-testid="complete-grant-page-client">CompleteGrant</div>
    ),
  })
);

// Project Roadmap (server-rendered for /updates)
vi.mock("@/components/Pages/Project/Roadmap", () => ({
  ProjectRoadmap: ({ project }: { project: { uid: string } | null }) => (
    <div data-testid="project-roadmap">{project ? project.uid : "no-project"}</div>
  ),
}));

// UpdatesContent (the /(profile)/page.tsx default route renders this dynamically)
vi.mock("@/components/Pages/Project/v2/Content/UpdatesContent", () => ({
  UpdatesContent: () => <div data-testid="updates-content">UpdatesContent</div>,
}));
vi.mock("@/components/Pages/Project/v2/Skeletons", () => ({
  UpdatesContentSkeleton: () => <div data-testid="updates-content-skeleton">Loading</div>,
}));

const renderPageElement = async (importer: () => Promise<{ default: React.ComponentType }>) => {
  const { default: Page } = await importer();
  return render(<Page />);
};

const renderAsyncPage = async (
  importer: () => Promise<{ default: (props: unknown) => Promise<React.ReactElement | null> }>,
  props: unknown
) => {
  const { default: Page } = await importer();
  const result = await Page(props);
  if (result === null) return null;
  return render(result);
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Project profile pages", () => {
  it("/project/[projectId]/(profile)/about renders AboutPageClient", async () => {
    await renderPageElement(() => import("@/app/project/[projectId]/(profile)/about/page"));
    expect(screen.getByTestId("about-page-client")).toBeInTheDocument();
  });

  it("/project/[projectId]/(profile)/contact-info renders ContactInfoPageClient", async () => {
    await renderPageElement(() => import("@/app/project/[projectId]/(profile)/contact-info/page"));
    expect(screen.getByTestId("contact-info-page-client")).toBeInTheDocument();
  });

  it("/project/[projectId]/(profile)/team renders TeamPageClient", async () => {
    await renderPageElement(() => import("@/app/project/[projectId]/(profile)/team/page"));
    expect(screen.getByTestId("team-page-client")).toBeInTheDocument();
  });

  it("/project/[projectId]/(profile)/impact renders ImpactPageClient", async () => {
    await renderPageElement(() => import("@/app/project/[projectId]/(profile)/impact/page"));
    expect(screen.getByTestId("impact-page-client")).toBeInTheDocument();
  });

  it("/project/[projectId]/(profile)/funding/new renders NewGrantPageClient", async () => {
    await renderPageElement(() => import("@/app/project/[projectId]/(profile)/funding/new/page"));
    expect(screen.getByTestId("new-grant-page-client")).toBeInTheDocument();
  });

  it("/project/[projectId]/(profile)/funding/[grantUid]/edit renders EditGrantPageClient", async () => {
    await renderPageElement(
      () => import("@/app/project/[projectId]/(profile)/funding/[grantUid]/edit/page")
    );
    expect(screen.getByTestId("edit-grant-page-client")).toBeInTheDocument();
  });

  it("/project/[projectId]/(profile)/funding/[grantUid]/complete-grant renders CompleteGrantPageClient", async () => {
    await renderPageElement(
      () => import("@/app/project/[projectId]/(profile)/funding/[grantUid]/complete-grant/page")
    );
    expect(screen.getByTestId("complete-grant-page-client")).toBeInTheDocument();
  });
});

describe("Project profile pages — dynamic imports", () => {
  it("/project/[projectId]/(profile)/funding renders dynamic stub", async () => {
    await renderPageElement(() => import("@/app/project/[projectId]/(profile)/funding/page"));
    // dynamic() returns a stub — proves dynamic was invoked with real loader
    expect(screen.getByTestId("dynamic-stub")).toBeInTheDocument();
  });

  it("/project/[projectId]/(profile)/funding/[grantUid] renders dynamic stub", async () => {
    await renderPageElement(
      () => import("@/app/project/[projectId]/(profile)/funding/[grantUid]/page")
    );
    expect(screen.getByTestId("dynamic-stub")).toBeInTheDocument();
  });

  it("/project/[projectId]/(profile)/funding/[grantUid]/impact-criteria renders dynamic stub", async () => {
    await renderPageElement(
      () => import("@/app/project/[projectId]/(profile)/funding/[grantUid]/impact-criteria/page")
    );
    expect(screen.getByTestId("dynamic-stub")).toBeInTheDocument();
  });

  it("/project/[projectId]/(profile)/funding/[grantUid]/milestones-and-updates renders dynamic stub", async () => {
    await renderPageElement(
      () =>
        import("@/app/project/[projectId]/(profile)/funding/[grantUid]/milestones-and-updates/page")
    );
    expect(screen.getByTestId("dynamic-stub")).toBeInTheDocument();
  });

  it("/project/[projectId]/(profile) (updates index) renders the loading skeleton", async () => {
    await renderPageElement(() => import("@/app/project/[projectId]/(profile)/page"));
    expect(screen.getByTestId("updates-content-skeleton")).toBeInTheDocument();
  });
});

describe("Project /updates async page", () => {
  it("renders ProjectRoadmap when project data loads", async () => {
    const { default: Page } = await import("@/app/project/[projectId]/updates/page");
    const result = await Page({ params: Promise.resolve({ projectId: "p1" }) });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}>{result}</QueryClientProvider>);
    expect(screen.getByTestId("project-roadmap")).toBeInTheDocument();
  });

  it("returns null when project data missing", async () => {
    const cached = await import("@/utilities/queries/getProjectCachedData");
    vi.mocked(cached.getProjectCachedData).mockResolvedValueOnce(null);
    const result = await renderAsyncPage(() => import("@/app/project/[projectId]/updates/page"), {
      params: Promise.resolve({ projectId: "p1" }),
    });
    expect(result).toBeNull();
  });
});
