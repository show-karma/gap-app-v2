import { beforeEach, describe, expect, it, vi } from "vitest";

const mockApiGet = vi.fn();

vi.mock("@/utilities/api/client", () => ({
  api: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
    getPaginated: vi.fn(),
  },
}));

import {
  fetchApplicationIntegrations,
  fetchSimocracyEvaluations,
} from "@/services/fundingApplicationIntegrations.service";
import { HttpError } from "@/utilities/api/errors";

const simocracyResponse = {
  referenceNumber: "APP-SIMO-0001",
  programId: "simo-test-1",
  runId: "spg-008qx5b0-a6mnyn5tvpwr",
  evaluations: [
    {
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
    },
  ],
};

describe("fundingApplicationIntegrations service", () => {
  beforeEach(() => {
    mockApiGet.mockReset();
  });

  describe("fetchApplicationIntegrations", () => {
    it("calls the integrations index endpoint and returns the list", async () => {
      mockApiGet.mockResolvedValue({ integrations: [{ key: "simocracy", enabled: true }] });

      const result = await fetchApplicationIntegrations("APP-SIMO-0001");

      expect(mockApiGet.mock.calls[0][0]).toBe(
        "/v2/funding-applications/APP-SIMO-0001/integrations"
      );
      expect(result).toEqual([{ key: "simocracy", enabled: true }]);
    });

    it("returns an empty list when the response has no integrations field", async () => {
      mockApiGet.mockResolvedValue({});

      await expect(fetchApplicationIntegrations("APP-SIMO-0001")).resolves.toEqual([]);
    });

    it("surfaces the server error message on failure", async () => {
      mockApiGet.mockRejectedValue(
        new HttpError(500, {
          endpoint: "/v2/funding-applications/APP-SIMO-0001/integrations",
          method: "GET",
          body: { message: "boom from server" },
        })
      );

      await expect(fetchApplicationIntegrations("APP-SIMO-0001")).rejects.toThrow(
        "boom from server"
      );
    });
  });

  describe("fetchSimocracyEvaluations", () => {
    it("calls the simocracy endpoint and returns the payload as-is", async () => {
      mockApiGet.mockResolvedValue(simocracyResponse);

      const result = await fetchSimocracyEvaluations("APP-SIMO-0001");

      expect(mockApiGet.mock.calls[0][0]).toBe(
        "/v2/funding-applications/APP-SIMO-0001/integrations/simocracy"
      );
      expect(result.runId).toBe("spg-008qx5b0-a6mnyn5tvpwr");
      expect(result.evaluations).toHaveLength(1);
      expect(result.evaluations[0].sim.simName).toBe("S3");
    });

    it("normalizes missing evaluations to an empty array", async () => {
      mockApiGet.mockResolvedValue({
        referenceNumber: "APP-SIMO-0001",
        programId: "simo-test-1",
        runId: null,
      });

      const result = await fetchSimocracyEvaluations("APP-SIMO-0001");

      expect(result.runId).toBeNull();
      expect(result.evaluations).toEqual([]);
    });

    it("throws on an empty response body", async () => {
      mockApiGet.mockResolvedValue(null);

      await expect(fetchSimocracyEvaluations("APP-SIMO-0001")).rejects.toThrow(
        "Empty response from simocracy integration"
      );
    });

    it("surfaces the server error message on failure", async () => {
      mockApiGet.mockRejectedValue(
        new HttpError(404, {
          endpoint: "/v2/funding-applications/APP-SIMO-0001/integrations/simocracy",
          method: "GET",
          body: { message: "integration not enabled" },
        })
      );

      await expect(fetchSimocracyEvaluations("APP-SIMO-0001")).rejects.toThrow(
        "integration not enabled"
      );
    });
  });
});
