import { beforeEach, describe, expect, it, vi } from "vitest";

const getToken = vi.fn();
const errorManager = vi.fn();

vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: { getToken: () => getToken() },
}));
vi.mock("@/components/Utilities/errorManager", () => ({
  errorManager: (...args: unknown[]) => errorManager(...args),
}));
vi.mock("@/utilities/enviromentVars", () => ({
  envVars: { NEXT_PUBLIC_GAP_INDEXER_URL: "https://indexer.test" },
}));

import { downloadCommunityReport } from "@/utilities/downloadReports";

describe("downloadCommunityReport", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    URL.createObjectURL = vi.fn(() => "blob:report");
    URL.revokeObjectURL = vi.fn();
    fetchMock.mockResolvedValue({ ok: true, blob: async () => new Blob(["a,b"]) });
  });

  it("sends the caller's token so the export can include admin-only columns", async () => {
    getToken.mockResolvedValue("token-123");

    await downloadCommunityReport({ communityId: "community-a" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("https://indexer.test");
    expect(url).toContain("download=true");
    expect(init.headers).toEqual({ Authorization: "Bearer token-123" });
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:report");
  });

  it("still downloads without credentials when the user is signed out", async () => {
    getToken.mockResolvedValue(null);

    await downloadCommunityReport({ communityId: "community-a" });

    expect(fetchMock.mock.calls[0][1].headers).toBeUndefined();
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  });

  it("reports the failure and downloads nothing when the request is rejected", async () => {
    getToken.mockResolvedValue("token-123");
    fetchMock.mockResolvedValue({ ok: false, status: 401 });

    await downloadCommunityReport({ communityId: "community-a" });

    expect(errorManager).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});
