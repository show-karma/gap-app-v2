import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock next/dynamic to render loading state
jest.mock("next/dynamic", () => ({
  __esModule: true,
  default: (_callback: () => Promise<any>, options: { loading: () => React.ReactNode }) => {
    return function DynamicComponent() {
      return options.loading();
    };
  },
}));

// Mock the UpdatesContent component
jest.mock("@/components/Pages/Project/v2/Content/UpdatesContent", () => ({
  UpdatesContent: function MockUpdatesContent() {
    return <div data-testid="mock-updates-content">Mocked Updates Content</div>;
  },
}));

// Mock the skeleton component
jest.mock("@/components/Pages/Project/v2/Skeletons", () => ({
  UpdatesContentSkeleton: () => <div data-testid="updates-content-skeleton">Loading...</div>,
}));

// Import the actual page component after mocks
import UpdatesPage from "@/app/project/[projectId]/(profile)/page";

describe("Project Updates Page", () => {
  it("renders the loading skeleton while the main component is loading", () => {
    render(<UpdatesPage />);

    expect(screen.getByTestId("updates-content-skeleton")).toBeInTheDocument();
  });

  it("displays loading text in skeleton", () => {
    render(<UpdatesPage />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });
});
