import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ResearchReportDetail } from "@/types/donor-research";

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

import { getAdminReport, listAdvisors } from "@/services/donor-research-admin.service";
import { HttpError } from "@/utilities/api/errors";

describe("donor-research admin service", () => {
  beforeEach(() => {
    mockApiGet.mockReset();
  });

  describe("listAdvisors", () => {
    it("hits the admin advisors endpoint with page + limit params", async () => {
      mockApiGet.mockResolvedValue({ items: [], total: 0, page: 2, limit: 20 });

      await listAdvisors({ page: 2, limit: 20 });

      const [url, opts] = mockApiGet.mock.calls[0];
      expect(url).toBe("/v2/admin/donor-research/advisors");
      expect(opts.params).toEqual({ page: 2, limit: 20 });
    });

    it("throws when the request fails", async () => {
      mockApiGet.mockRejectedValue(
        new HttpError(403, {
          endpoint: "/v2/admin/donor-research/advisors",
          method: "GET",
          body: { message: "forbidden" },
        })
      );

      await expect(listAdvisors()).rejects.toThrow("forbidden");
    });
  });

  describe("getAdminReport", () => {
    function reportWithBareCandidate(): ResearchReportDetail {
      return {
        id: "r1",
        candidates: [{ id: "c1", socialMetrics: null }],
      } as unknown as ResearchReportDetail;
    }

    it("hits the admin report endpoint by id", async () => {
      mockApiGet.mockResolvedValue(reportWithBareCandidate());

      await getAdminReport("r1");

      expect(mockApiGet.mock.calls[0][0]).toBe("/v2/admin/donor-research/reports/r1");
    });

    it("returns the report untouched (no fabricated social metrics)", async () => {
      mockApiGet.mockResolvedValue(reportWithBareCandidate());

      const report = await getAdminReport("r1");

      expect(report.candidates[0].socialMetrics).toBeNull();
    });

    it("throws when the report cannot be loaded", async () => {
      mockApiGet.mockRejectedValue(
        new HttpError(404, {
          endpoint: "/v2/admin/donor-research/reports/missing",
          method: "GET",
          body: { message: "not found" },
        })
      );

      await expect(getAdminReport("missing")).rejects.toThrow("not found");
    });
  });
});
