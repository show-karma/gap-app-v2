import { beforeEach, describe, expect, it, vi } from "vitest";

const mockApiGet = vi.fn();
const mockApiPost = vi.fn();
const mockApiDelete = vi.fn();

vi.mock("@/utilities/api/client", () => ({
  api: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: (...args: unknown[]) => mockApiPost(...args),
    put: vi.fn(),
    patch: vi.fn(),
    delete: (...args: unknown[]) => mockApiDelete(...args),
    request: vi.fn(),
    getPaginated: vi.fn(),
  },
}));

import {
  addSimocracySimLink,
  deleteSimocracySimLink,
  fetchApplicationIntegrations,
  fetchSimocracyEvaluations,
  fetchSimocracySimLinks,
  hasEnabledIntegration,
  isIntegrationEnabled,
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
    mockApiPost.mockReset();
    mockApiDelete.mockReset();
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

  describe("integration enablement helpers", () => {
    it("hasEnabledIntegration is true only when at least one integration is enabled", () => {
      expect(hasEnabledIntegration(undefined)).toBe(false);
      expect(hasEnabledIntegration([])).toBe(false);
      expect(hasEnabledIntegration([{ key: "simocracy", enabled: false }])).toBe(false);
      expect(
        hasEnabledIntegration([
          { key: "simocracy", enabled: false },
          { key: "other", enabled: true },
        ])
      ).toBe(true);
    });

    it("isIntegrationEnabled matches key AND enabled flag", () => {
      expect(isIntegrationEnabled([{ key: "simocracy", enabled: true }], "simocracy")).toBe(true);
      expect(isIntegrationEnabled([{ key: "simocracy", enabled: false }], "simocracy")).toBe(false);
      expect(isIntegrationEnabled([{ key: "other", enabled: true }], "simocracy")).toBe(false);
      expect(isIntegrationEnabled(undefined, "simocracy")).toBe(false);
    });
  });

  describe("fetchSimocracySimLinks", () => {
    it("calls the sim-links endpoint and returns the links", async () => {
      const links = [{ simUri: "at://did:plc:abc/org.simocracy.sim/1", publicAddress: "0xaa" }];
      mockApiGet.mockResolvedValue({ links });

      const result = await fetchSimocracySimLinks("simo-test-1");

      expect(mockApiGet.mock.calls[0][0]).toBe(
        "/v2/funding-programs/simo-test-1/integrations/simocracy/sim-links"
      );
      expect(result).toEqual(links);
    });

    it("returns an empty list when the response has no links field", async () => {
      mockApiGet.mockResolvedValue({});

      await expect(fetchSimocracySimLinks("simo-test-1")).resolves.toEqual([]);
    });

    it("surfaces the server error message on failure", async () => {
      mockApiGet.mockRejectedValue(
        new HttpError(403, {
          endpoint: "/v2/funding-programs/simo-test-1/integrations/simocracy/sim-links",
          method: "GET",
          body: { message: "forbidden" },
        })
      );

      await expect(fetchSimocracySimLinks("simo-test-1")).rejects.toThrow("forbidden");
    });
  });

  describe("addSimocracySimLink", () => {
    it("POSTs the link wrapped in a links array and returns the upserted links", async () => {
      const link = {
        simUri: "at://did:plc:abc/org.simocracy.sim/1",
        publicAddress: "0xAAaaAAaaAAaaAAaaAAaaAAaaAAaaAAaaAAaaAAaa",
      };
      mockApiPost.mockResolvedValue({ links: [link] });

      const result = await addSimocracySimLink("simo-test-1", link);

      expect(mockApiPost.mock.calls[0][0]).toBe(
        "/v2/funding-programs/simo-test-1/integrations/simocracy/sim-links"
      );
      expect(mockApiPost.mock.calls[0][1]).toEqual({ links: [link] });
      expect(result).toEqual([link]);
    });

    it("surfaces the server error message on failure", async () => {
      mockApiPost.mockRejectedValue(
        new HttpError(400, {
          endpoint: "/v2/funding-programs/simo-test-1/integrations/simocracy/sim-links",
          method: "POST",
          body: { message: "Invalid sim AT-URI" },
        })
      );

      await expect(
        addSimocracySimLink("simo-test-1", { simUri: "bad", publicAddress: "0xaa" })
      ).rejects.toThrow("Invalid sim AT-URI");
    });
  });

  describe("deleteSimocracySimLink", () => {
    it("DELETEs with the simUri as a query param", async () => {
      mockApiDelete.mockResolvedValue(undefined);

      await deleteSimocracySimLink("simo-test-1", "at://did:plc:abc/org.simocracy.sim/1");

      expect(mockApiDelete.mock.calls[0][0]).toBe(
        "/v2/funding-programs/simo-test-1/integrations/simocracy/sim-links"
      );
      expect(mockApiDelete.mock.calls[0][1]).toEqual({
        params: { simUri: "at://did:plc:abc/org.simocracy.sim/1" },
      });
    });

    it("surfaces the server error message on failure", async () => {
      mockApiDelete.mockRejectedValue(
        new HttpError(404, {
          endpoint: "/v2/funding-programs/simo-test-1/integrations/simocracy/sim-links",
          method: "DELETE",
          body: { message: "link not found" },
        })
      );

      await expect(
        deleteSimocracySimLink("simo-test-1", "at://did:plc:abc/org.simocracy.sim/1")
      ).rejects.toThrow("link not found");
    });
  });
});
