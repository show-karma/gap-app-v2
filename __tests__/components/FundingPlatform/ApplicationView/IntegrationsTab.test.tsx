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
const mockFetchSimocracyComments = vi.fn();
const mockFetchSimocracyFeedback = vi.fn();
const mockSubmitSimocracyFeedback = vi.fn();

vi.mock("@/services/fundingApplicationIntegrations.service", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/fundingApplicationIntegrations.service")>()),
  fetchApplicationIntegrations: (...args: unknown[]) => mockFetchIntegrations(...args),
  fetchSimocracyEvaluations: (...args: unknown[]) => mockFetchSimocracy(...args),
  fetchSimocracyComments: (...args: unknown[]) => mockFetchSimocracyComments(...args),
  fetchSimocracyFeedback: (...args: unknown[]) => mockFetchSimocracyFeedback(...args),
  submitSimocracyFeedback: (...args: unknown[]) => mockSubmitSimocracyFeedback(...args),
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
    style: null,
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

function renderTab(props: { feedbackAdmin?: boolean } = {}) {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return render(<IntegrationsTab referenceNumber="APP-SIMO-0001" {...props} />, { wrapper });
}

describe("IntegrationsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchSimocracyFeedback.mockResolvedValue([]);
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

      await waitFor(() =>
        expect(screen.getByText("The S-Process round hasn't run yet")).toBeInTheDocument()
      );
    });

    it("shows the synced-empty copy when a run exists but has no evaluations", async () => {
      mockFetchIntegrations.mockResolvedValue(simocracyEnabled);
      mockFetchSimocracy.mockResolvedValue(createSimocracyResponse({ evaluations: [] }));

      renderTab();

      await waitFor(() =>
        expect(
          screen.getByText("No S-Process evaluations for this application")
        ).toBeInTheDocument()
      );
    });

    it("still renders deliberation comments when the round hasn't run", async () => {
      mockFetchIntegrations.mockResolvedValue(simocracyEnabled);
      mockFetchSimocracy.mockResolvedValue(
        createSimocracyResponse({ runId: null, evaluations: [] })
      );
      mockFetchSimocracyComments.mockResolvedValue({
        referenceNumber: "APP-SIMO-0001",
        programId: "simo-test-1",
        forbidden: false,
        comments: [
          {
            commentUri: "at://did:plc:host/org.impactindexer.review.comment/1",
            authorDid: "did:plc:host",
            authorName: "S1",
            text: "Milestone 1 delivered as promised.",
            parentCommentUri: null,
            createdAt: "2026-09-20T10:00:00.000Z",
          },
        ],
      });

      renderTab();

      expect(await screen.findByText("The S-Process round hasn't run yet")).toBeInTheDocument();
      expect(await screen.findByText("Sim comments")).toBeInTheDocument();
      expect(screen.getByText("Round deliberation")).toBeInTheDocument();
      expect(screen.getByText("S1")).toBeInTheDocument();
    });

    it("groups milestone evaluations under their milestone and keeps deliberation apart", async () => {
      mockFetchIntegrations.mockResolvedValue(simocracyEnabled);
      mockFetchSimocracy.mockResolvedValue(createSimocracyResponse({ evaluations: [] }));
      const comment = (id: string, authorName: string, text: string) => ({
        commentUri: `at://did:plc:host/org.impactindexer.review.comment/${id}`,
        authorDid: "did:plc:host",
        authorName,
        text,
        parentCommentUri: null,
        createdAt: `2026-09-20T10:0${id}:00.000Z`,
      });
      mockFetchSimocracyComments.mockResolvedValue({
        referenceNumber: "APP-SIMO-0001",
        programId: "simo-test-1",
        forbidden: false,
        comments: [
          comment(
            "1",
            "S1",
            "Milestone: Dashboard MVP\n**Sim milestone evaluation — S1**\n\nDone."
          ),
          comment(
            "2",
            "S2",
            "Milestone: Dashboard MVP\n**Sim milestone evaluation — S2**\n\nDone."
          ),
          comment("3", "S1", "Milestone: Audit\n**Sim milestone evaluation — S1**\n\nPending."),
          comment("4", "S3", "I don't ballot from the proposal alone."),
        ],
      });

      renderTab();

      expect(
        await screen.findByRole("heading", { level: 4, name: "Milestone: Dashboard MVP" })
      ).toBeInTheDocument();
      expect(screen.getByText("2 comments")).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { level: 4, name: "Milestone: Audit" })
      ).toBeInTheDocument();
      expect(screen.getAllByText("1 comment")).toHaveLength(2);
      expect(
        screen.getByRole("heading", { level: 4, name: "Round deliberation" })
      ).toBeInTheDocument();
      // the "Milestone:" line is lifted into the heading, not repeated in the body
      expect(screen.queryAllByText("Milestone: Dashboard MVP")).toHaveLength(1);
    });

    it("offers feedback controls on sim-attributed verdicts for admins, one fetch for all", async () => {
      mockFetchIntegrations.mockResolvedValue(simocracyEnabled);
      mockFetchSimocracy.mockResolvedValue(
        createSimocracyResponse({ runId: null, evaluations: [] })
      );
      const attributedUri = "at://did:plc:host/org.impactindexer.review.comment/ms-1";
      mockFetchSimocracyComments.mockResolvedValue({
        referenceNumber: "APP-SIMO-0001",
        programId: "simo-test-1",
        forbidden: false,
        comments: [
          {
            commentUri: attributedUri,
            authorDid: "did:plc:host",
            authorSimUri: "at://did:plc:host/org.simocracy.sim/s1",
            authorName: "S1",
            text: "Milestone: Dashboard MVP\n**Sim milestone evaluation — S1**\n\nVerdict: Demonstrated",
            parentCommentUri: null,
            createdAt: "2026-09-20T10:01:00.000Z",
          },
          {
            commentUri: "at://did:plc:host/org.impactindexer.review.comment/h1",
            authorDid: "did:plc:human",
            authorSimUri: null,
            authorName: null,
            text: "Human remark.",
            parentCommentUri: null,
            createdAt: "2026-09-20T10:02:00.000Z",
          },
        ],
      });
      mockFetchSimocracyFeedback.mockResolvedValue([
        {
          referenceNumber: "APP-SIMO-0001",
          runId: null,
          commentUri: attributedUri,
          simUri: "at://did:plc:host/org.simocracy.sim/s1",
          authorAddress: "0xabc",
          authorName: "Reviewer A",
          verdict: "down",
          comment: "Too lenient",
          updatedAt: "2026-09-21T00:00:00.000Z",
        },
      ]);

      renderTab({ feedbackAdmin: true });

      // one control set: the attributed verdict, not the human remark
      expect(await screen.findAllByRole("button", { name: "Represented faithfully" })).toHaveLength(
        1
      );
      expect(await screen.findByText(/Too lenient/)).toBeInTheDocument();
      await waitFor(() =>
        expect(mockFetchSimocracyFeedback).toHaveBeenCalledWith("APP-SIMO-0001", undefined)
      );
      expect(mockFetchSimocracyFeedback).toHaveBeenCalledTimes(1);
    });

    it("hides feedback controls on verdicts outside the admin view", async () => {
      mockFetchIntegrations.mockResolvedValue(simocracyEnabled);
      mockFetchSimocracy.mockResolvedValue(
        createSimocracyResponse({ runId: null, evaluations: [] })
      );
      mockFetchSimocracyComments.mockResolvedValue({
        referenceNumber: "APP-SIMO-0001",
        programId: "simo-test-1",
        forbidden: false,
        comments: [
          {
            commentUri: "at://did:plc:host/org.impactindexer.review.comment/ms-1",
            authorDid: "did:plc:host",
            authorSimUri: "at://did:plc:host/org.simocracy.sim/s1",
            authorName: "S1",
            text: "Milestone: Dashboard MVP\n\nVerdict: Demonstrated",
            parentCommentUri: null,
            createdAt: "2026-09-20T10:01:00.000Z",
          },
        ],
      });

      renderTab();

      expect(
        await screen.findByRole("heading", { level: 4, name: "Milestone: Dashboard MVP" })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Represented faithfully" })
      ).not.toBeInTheDocument();
      expect(mockFetchSimocracyFeedback).not.toHaveBeenCalled();
    });
  });

  describe("populated state", () => {
    it("renders one card per evaluation with sim name, model, reasoning, and run id", async () => {
      mockFetchIntegrations.mockResolvedValue(simocracyEnabled);
      mockFetchSimocracy.mockResolvedValue(createSimocracyResponse());

      renderTab();

      await waitFor(() => expect(screen.getAllByText("S3").length).toBeGreaterThan(0));
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

    it("renders the shared council chart with total-value bars", async () => {
      mockFetchIntegrations.mockResolvedValue(simocracyEnabled);
      mockFetchSimocracy.mockResolvedValue(createSimocracyResponse());

      renderTab();

      await waitFor(() => expect(screen.getByText("Marginal value")).toBeInTheDocument());
      expect(screen.getByText("Where the council lands")).toBeInTheDocument();
      expect(screen.getByText("$197")).toBeInTheDocument();
      expect(screen.getByText("First dollar")).toBeInTheDocument();
      expect(screen.getByText("0.90")).toBeInTheDocument();
    });

    it("omits the Constitution section when the prompt is null", async () => {
      mockFetchIntegrations.mockResolvedValue(simocracyEnabled);
      mockFetchSimocracy.mockResolvedValue(
        createSimocracyResponse({ evaluations: [createEvaluation({ prompt: null })] })
      );

      renderTab();

      await waitFor(() => expect(screen.getAllByText("S3").length).toBeGreaterThan(0));
      expect(screen.queryByText("Constitution & style")).not.toBeInTheDocument();
    });

    it("shows nothing for a sim with no row (recused absence, never zeros)", async () => {
      mockFetchIntegrations.mockResolvedValue(simocracyEnabled);
      mockFetchSimocracy.mockResolvedValue(createSimocracyResponse());

      renderTab();

      await waitFor(() => expect(screen.getAllByText("S3").length).toBeGreaterThan(0));
      expect(screen.queryByText("S4")).not.toBeInTheDocument();
    });
  });
});
