import { render, screen } from "@testing-library/react";
import { IntegrationsTab } from "../IntegrationsTab";

const mockUseApplicationIntegrations = vi.fn();
const mockUseSimocracyEvaluations = vi.fn();
const mockUseSimocracyProgramSummary = vi.fn();

vi.mock("@/hooks/useApplicationIntegrations", () => ({
  useApplicationIntegrations: (referenceNumber: string) =>
    mockUseApplicationIntegrations(referenceNumber),
  useSimocracyEvaluations: (referenceNumber: string) =>
    mockUseSimocracyEvaluations(referenceNumber),
  useSimocracyProgramSummary: (programId: string) => mockUseSimocracyProgramSummary(programId),
  useSimocracySimLinks: () => ({ data: [] }),
  useSimocracyFeedback: () => ({ data: [] }),
  useSubmitSimocracyFeedback: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ address: undefined }),
}));

function mockIndex(data: { key: string; enabled: boolean }[] | undefined, extra = {}) {
  mockUseApplicationIntegrations.mockReturnValue({
    data,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    ...extra,
  });
}

describe("IntegrationsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSimocracyEvaluations.mockReturnValue({
      data: { referenceNumber: "APP-1", programId: "simo-test-1", runId: null, evaluations: [] },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseSimocracyProgramSummary.mockReturnValue({ data: undefined });
  });

  describe("loading state", () => {
    it("renders the skeleton while the index loads", () => {
      mockIndex(undefined, { isLoading: true });

      render(<IntegrationsTab referenceNumber="APP-1" />);

      expect(screen.getByTestId("integrations-loading")).toBeInTheDocument();
    });
  });

  describe("error state", () => {
    it("renders the error with retry", () => {
      mockIndex(undefined, { isError: true, error: new Error("index failed") });

      render(<IntegrationsTab referenceNumber="APP-1" />);

      expect(screen.getByText("index failed")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("renders the no-integrations empty state for an empty index", () => {
      mockIndex([]);

      render(<IntegrationsTab referenceNumber="APP-1" />);

      expect(
        screen.getByRole("heading", { name: /no integrations configured/i })
      ).toBeInTheDocument();
    });
  });

  describe("disabled integration", () => {
    it("hides the Simocracy section when the integration is disabled", () => {
      mockIndex([{ key: "simocracy", enabled: false }]);

      render(<IntegrationsTab referenceNumber="APP-1" />);

      expect(screen.getByText(/no active integrations/i)).toBeInTheDocument();
      expect(screen.queryByText(/the round hasn't run yet/i)).not.toBeInTheDocument();
    });
  });

  describe("enabled integration", () => {
    it("renders the Simocracy section when the integration is enabled", () => {
      mockIndex([{ key: "simocracy", enabled: true }]);

      render(<IntegrationsTab referenceNumber="APP-1" />);

      expect(screen.getByText(/the round hasn't run yet/i)).toBeInTheDocument();
      expect(screen.queryByText(/no active integrations/i)).not.toBeInTheDocument();
    });
  });
});
