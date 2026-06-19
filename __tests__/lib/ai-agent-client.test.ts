/**
 * Tests for lib/ai-agent-client.ts getMyOrgs().
 *
 * A missing list resource for the current user (404) is an empty collection,
 * not a user-facing failure, so getMyOrgs resolves to []. All other statuses
 * still reject so the UI can surface them.
 */

import { AxiosError } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGet = vi.fn();

vi.mock("@/utilities/auth/api-client", () => ({
  createAuthenticatedApiClient: () => ({ get: mockGet }),
}));

// Avoid pulling real env/token wiring through the client module's imports.
vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: { getAuthHeader: vi.fn() },
}));

function axiosErrorWithStatus(status: number): AxiosError {
  const error = new AxiosError("request failed");
  // biome-ignore lint/suspicious/noExplicitAny: minimal AxiosResponse stub
  error.response = { status } as any;
  return error;
}

describe("aiAgentClient.getMyOrgs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("returns the orgs array on a 200 response", async () => {
    const orgs = [{ id: "1", slug: "acme", status: "active", role: "owner", joinedAt: "2024" }];
    mockGet.mockResolvedValueOnce({ data: { orgs } });

    const { aiAgentClient } = await import("@/lib/ai-agent-client");
    await expect(aiAgentClient.getMyOrgs()).resolves.toEqual(orgs);
  });

  it("resolves to an empty list when the endpoint returns 404", async () => {
    mockGet.mockRejectedValueOnce(axiosErrorWithStatus(404));

    const { aiAgentClient } = await import("@/lib/ai-agent-client");
    await expect(aiAgentClient.getMyOrgs()).resolves.toEqual([]);
  });

  it("rethrows non-404 errors so the UI surfaces them", async () => {
    mockGet.mockRejectedValueOnce(axiosErrorWithStatus(500));

    const { aiAgentClient } = await import("@/lib/ai-agent-client");
    await expect(aiAgentClient.getMyOrgs()).rejects.toMatchObject({
      response: { status: 500 },
    });
  });
});
