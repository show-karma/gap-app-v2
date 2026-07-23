import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the network layer so we can assert on the URLs the service builds.
const apiGetTypedMock = vi.fn();
const apiGetMock = vi.fn();

vi.mock("@/utilities/api/client", () => ({
  api: {
    get: (...args: unknown[]) => apiGetTypedMock(...args),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/utilities/auth/api-client", () => ({
  createAuthenticatedApiClient: () => ({
    get: (...args: unknown[]) => apiGetMock(...args),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  }),
}));

import { fundingPlatformService } from "@/services/fundingPlatformService";

describe("fundingPlatformService reviewer filtering", () => {
  beforeEach(() => {
    apiGetTypedMock.mockReset();
    apiGetMock.mockReset();
    apiGetMock.mockResolvedValue({ data: "", headers: {} });
  });

  describe("getApplicationStatistics", () => {
    it("should_not_append_reviewerAddresses_when_no_reviewer_filter", async () => {
      apiGetTypedMock.mockResolvedValue({ totalApplications: 0 });

      await fundingPlatformService.applications.getApplicationStatistics("123");

      const url = apiGetTypedMock.mock.calls[0][0] as string;
      expect(url).not.toContain("reviewerAddresses");
    });

    it("should_append_selected_reviewerAddresses", async () => {
      apiGetTypedMock.mockResolvedValue({ totalApplications: 0 });

      await fundingPlatformService.applications.getApplicationStatistics("123", {
        reviewerAddresses: ["0xaaa", "0xbbb"],
      });

      const url = apiGetTypedMock.mock.calls[0][0] as string;
      expect(url).toContain("reviewerAddresses=0xaaa%2C0xbbb");
    });

    it("should_merge_single_reviewerAddress_into_reviewerAddresses", async () => {
      apiGetTypedMock.mockResolvedValue({ totalApplications: 0 });

      await fundingPlatformService.applications.getApplicationStatistics("123", {
        reviewerAddress: "0xme",
      });

      const url = apiGetTypedMock.mock.calls[0][0] as string;
      expect(url).toContain("reviewerAddresses=0xme");
    });
  });

  describe("exportApplicationsAdmin", () => {
    it("should_append_reviewerAddresses_to_export_request", async () => {
      await fundingPlatformService.applications.exportApplicationsAdmin("123", "csv", {
        reviewerAddresses: ["0xaaa", "0xbbb"],
      });

      const url = apiGetMock.mock.calls[0][0] as string;
      expect(url).toContain("reviewerAddresses=0xaaa%2C0xbbb");
    });

    it("should_merge_single_reviewerAddress_for_export", async () => {
      await fundingPlatformService.applications.exportApplicationsAdmin("123", "csv", {
        reviewerAddress: "0xme",
      });

      const url = apiGetMock.mock.calls[0][0] as string;
      expect(url).toContain("reviewerAddresses=0xme");
    });
  });
});
