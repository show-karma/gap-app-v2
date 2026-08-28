import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IntegrationsTab } from "@/components/FundingPlatform/ApplicationView/IntegrationsTab";
import type {
  IntegrationSummary,
  SimocracyEvaluationRow,
  SimocracyEvaluationsResponse,
} from "@/services/fundingApplicationIntegrations.service";

const mockFetchIntegrations = vi.fn();
const mockFetchSimocracy = vi.fn();

vi.mock("@/services/fundingApplicationIntegrations.service", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/fundingApplicationIntegrations.service")>()),
  fetchApplicationIntegrations: (...args: unknown[]) => mockFetchIntegrations(...args),
  fetchSimocracyEvaluations: (...args: unknown[]) => mockFetchSimocracy(...args),
  fetchSimocracyProgramSummary: () => new Promise(() => {}),
}));

function createEvaluation(overrides: Partial<SimocracyEvaluationRow> = {}): SimocracyEvaluationRow {
  return {
    sim: { simUri: "at://did:plc:abc/org.simocracy.sim/1", simName: "S3", avatar: null },
    model: "deepseek/deepseek-v4-flash-0731",
    prompt: "I evaluate funding proposals strictly on verifiable impact.",
    proposalUri: "at://did:plc:def/org.hypercerts.claim.activity/1",
    proposalTitle: "Open Retrieval Metrics Dashboard",
    reasoning: "Curve anchors at ~$197.",
    mvf: [
      { dollars: 0, marginalValueMilli: 900 },
      { dollars: 197, marginalValueMilli: 0 },
    ],
    ...overrides,
  };
}

function createSimocracyResponse(
  overrides: Partial<SimocracyEvaluationsResponse> = {}
): SimocracyEvaluationsResponse {
  return {
    referenceNumber: "APP-SIMO-0001",
    programId: "simo-test-1",
    runId: "spg-008qx5b0-a6mnyn5tvpwr",
    evaluations: [createEvaluation()],
    ...overrides,
  };
}

const simocracyEnabled: IntegrationSummary[] = [{ key: "simocracy", enabled: true }];

let queryClient: QueryClient;

function renderTab() {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return render(<IntegrationsTab referenceNumber="APP-SIMO-0001" />, { wrapper });
}

describe("IntegrationsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("loading state", () => {
    it("renders a skeleton while the integrations index loads", () => {
      mockFetchIntegrations.mockReturnValue(new Promise(() => {}));

      renderTab();

      expect(screen.getByTestId("integrations-loading")).toBeInTheDocument();
    });
  });

  describe("error state", () => {
    it("renders the error with a retry button when the index fails", async () => {
      mockFetchIntegrations.mockRejectedValue(new Error("boom from server"));

      renderTab();

      await waitFor(() => expect(screen.getByText("boom from server")).toBeInTheDocument());
      expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    });

    it("renders the error with a retry button when the simocracy fetch fails", async () => {
      mockFetchIntegrations.mockResolvedValue(simocracyEnabled);
      mockFetchSimocracy.mockRejectedValue(new Error("integration not enabled"));

      renderTab();

      await waitFor(() => expect(screen.getByText("integration not enabled")).toBeInTheDocument());
      expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    });
  });

  describe("empty states", () => {
    it("explains when no integrations are configured", async () => {
      mockFetchIntegrations.mockResolvedValue([]);

      renderTab();

      await waitFor(() =>
        expect(screen.getByText("No integrations configured")).toBeInTheDocument()
      );
      expect(mockFetchSimocracy).not.toHaveBeenCalled();
    });

    it("says the round hasn't run when runId is null", async () => {
      mockFetchIntegrations.mockResolvedValue(simocracyEnabled);
      mockFetchSimocracy.mockResolvedValue(
        createSimocracyResponse({ runId: null, evaluations: [] })
      );

      renderTab();

      await waitFor(() => expect(screen.getByText("The round hasn't run yet")).toBeInTheDocument());
    });

    it("shows the synced-empty copy when a run exists but has no evaluations", async () => {
      mockFetchIntegrations.mockResolvedValue(simocracyEnabled);
      mockFetchSimocracy.mockResolvedValue(createSimocracyResponse({ evaluations: [] }));

      renderTab();

      await waitFor(() =>
        expect(screen.getByText("No sim evaluations synced yet")).toBeInTheDocument()
      );
    });
  });

  describe("populated state", () => {
    it("renders one card per evaluation with sim name, model, reasoning, and run id", async () => {
      mockFetchIntegrations.mockResolvedValue(simocracyEnabled);
      mockFetchSimocracy.mockResolvedValue(createSimocracyResponse());

      renderTab();

      await waitFor(() => expect(screen.getByText("S3")).toBeInTheDocument());
      expect(screen.getByText("deepseek/deepseek-v4-flash-0731")).toBeInTheDocument();
      expect(screen.getByText("Curve anchors at ~$197.")).toBeInTheDocument();
      expect(screen.getByTitle("Mechanism run spg-008qx5b0-a6mnyn5tvpwr")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Sim evaluations" })).toBeInTheDocument();
      expect(screen.getByText("1 sim")).toBeInTheDocument();
    });

    it("pluralizes the evaluation count", async () => {
      mockFetchIntegrations.mockResolvedValue(simocracyEnabled);
      mockFetchSimocracy.mockResolvedValue(
        createSimocracyResponse({
          evaluations: [
            createEvaluation(),
            createEvaluation({
              sim: { simUri: "at://did:plc:xyz/org.simocracy.sim/2", simName: "S4", avatar: null },
            }),
          ],
        })
      );

      renderTab();

      await waitFor(() => expect(screen.getByText("2 sims")).toBeInTheDocument());
    });

    it("renders the marginal-value curve with one dot per anchor", async () => {
      mockFetchIntegrations.mockResolvedValue(simocracyEnabled);
      mockFetchSimocracy.mockResolvedValue(createSimocracyResponse());

      renderTab();

      await waitFor(() => expect(screen.getByText("Marginal value")).toBeInTheDocument());
      const tooltips = screen.getAllByRole("tooltip");
      expect(tooltips).toHaveLength(2);
      expect(tooltips[0]).toHaveTextContent("0.90 at $0");
      expect(tooltips[1]).toHaveTextContent("0.00 at $197");
    });

    it("omits the Constitution section when the prompt is null", async () => {
      mockFetchIntegrations.mockResolvedValue(simocracyEnabled);
      mockFetchSimocracy.mockResolvedValue(
        createSimocracyResponse({ evaluations: [createEvaluation({ prompt: null })] })
      );

      renderTab();

      await waitFor(() => expect(screen.getByText("S3")).toBeInTheDocument());
      expect(screen.queryByText("Constitution")).not.toBeInTheDocument();
    });

    it("shows nothing for a sim with no row (recused absence, never zeros)", async () => {
      mockFetchIntegrations.mockResolvedValue(simocracyEnabled);
      mockFetchSimocracy.mockResolvedValue(createSimocracyResponse());

      renderTab();

      await waitFor(() => expect(screen.getByText("S3")).toBeInTheDocument());
      expect(screen.queryByText("S4")).not.toBeInTheDocument();
      expect(screen.getAllByRole("tooltip")).toHaveLength(2);
    });
  });
});
