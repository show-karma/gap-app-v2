import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchDataMock = vi.fn();

vi.mock("@/utilities/fetchData", () => ({
  default: (...args: unknown[]) => fetchDataMock(...args),
}));

import { listAdvisors } from "@/services/donor-research-admin.service";

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
});
