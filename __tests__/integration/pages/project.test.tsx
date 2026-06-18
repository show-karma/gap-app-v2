import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock next/dynamic to render loading state
vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: (_callback: () => Promise<any>, options: { loading: () => React.ReactNode }) => {
    return function DynamicComponent() {
      return options.loading();
    };
  },
}));

// Mock the UpdatesContent component
vi.mock("@/components/Pages/Project/v2/Content/UpdatesContent", () => ({
  UpdatesContent: function MockUpdatesContent() {
    return <div data-testid="mock-updates-content">Mocked Updates Content</div>;
  },
}));

// Mock the skeleton component
vi.mock("@/components/Pages/Project/v2/Skeletons", () => ({
  UpdatesContentSkeleton: () => <div data-testid="updates-content-skeleton">Loading...</div>,
}));

// The page is an async server component that server-fetches the feed; stub the
// data layer so the test stays focused on the dynamic-import loading behaviour.
vi.mock("@/utilities/queries/getProjectFeed.server", () => ({
  getProjectFeed: vi.fn().mockResolvedValue([]),
}));

// Import the actual page component after mocks
import UpdatesPage from "@/app/project/[projectId]/(profile)/page";

const params = Promise.resolve({ projectId: "test-project" });

describe("Project Updates Page", () => {
  it("renders the loading skeleton while the main component is loading", async () => {
    render(await UpdatesPage({ params }));

    expect(screen.getByTestId("updates-content-skeleton")).toBeInTheDocument();
  });

  it("displays loading text in skeleton", async () => {
    render(await UpdatesPage({ params }));

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });
});
