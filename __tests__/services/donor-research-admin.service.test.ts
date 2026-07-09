import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ResearchReportDetail } from "@/types/donor-research";

const fetchDataMock = vi.fn();

vi.mock("@/utilities/fetchData", () => ({
  default: (...args: unknown[]) => fetchDataMock(...args),
}));

import { getAdminReport, listAdvisors } from "@/services/donor-research-admin.service";

describe("donor-research admin service", () => {
  beforeEach(() => {
    fetchDataMock.mockReset();
  });

  describe("listAdvisors", () => {
    it("hits the admin advisors endpoint with page + limit params", async () => {
      fetchDataMock.mockResolvedValue([{ items: [], total: 0, page: 2, limit: 20 }, null]);

      await listAdvisors({ page: 2, limit: 20 });

      const [url, method, , params] = fetchDataMock.mock.calls[0];
      expect(url).toBe("/v2/admin/donor-research/advisors");
      expect(method).toBe("GET");
      expect(params).toEqual({ page: 2, limit: 20 });
    });

    it("throws when the request fails", async () => {
      fetchDataMock.mockResolvedValue([null, "forbidden"]);

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
      fetchDataMock.mockResolvedValue([reportWithBareCandidate(), null]);

      await getAdminReport("r1");

      expect(fetchDataMock.mock.calls[0][0]).toBe("/v2/admin/donor-research/reports/r1");
    });

    it("returns the report untouched (no fabricated social metrics)", async () => {
      fetchDataMock.mockResolvedValue([reportWithBareCandidate(), null]);

      const report = await getAdminReport("r1");

      expect(report.candidates[0].socialMetrics).toBeNull();
    });

    it("throws when the report cannot be loaded", async () => {
      fetchDataMock.mockResolvedValue([null, "not found"]);

      await expect(getAdminReport("missing")).rejects.toThrow("not found");
    });
  });
});
