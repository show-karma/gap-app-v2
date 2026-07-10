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

import { listAdvisors } from "@/services/donor-research-admin.service";
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
});
