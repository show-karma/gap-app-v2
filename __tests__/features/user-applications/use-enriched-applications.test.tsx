import { waitFor } from "@testing-library/react";
import { renderHookWithProviders } from "@/__tests__/utils/render";
import type { Application } from "@/types/whitelabel-entities";
import { HttpError } from "@/utilities/api/errors";

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

vi.mock("@/utilities/chosenCommunities", () => ({
  chosenCommunities: () => [
    { slug: "arbitrum", name: "Arbitrum", uid: "0x1", imageURL: { light: "l", dark: "d" } },
  ],
}));

import { useEnrichedApplications } from "@/features/user-applications/hooks/use-enriched-applications";

const app = (over: Partial<Application>): Application =>
  ({
    id: "a1",
    programId: "p1",
    referenceNumber: "ref-1",
    status: "pending",
    ...over,
  }) as Application;

describe("useEnrichedApplications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns applications unchanged and fetches nothing when a community scope is given", () => {
    const apps = [app({})];
    const { result } = renderHookWithProviders(() => useEnrichedApplications(apps, "gitcoin"));

    expect(result.current).toBe(apps);
    expect(mockApiGet).not.toHaveBeenCalled();
  });

  it("resolves community name + slug from the program config when unscoped", async () => {
    mockApiGet.mockResolvedValue({ communitySlug: "arbitrum" });

    const apps = [app({ communitySlug: undefined, communityName: undefined })];
    const { result } = renderHookWithProviders(() => useEnrichedApplications(apps, undefined));

    await waitFor(() => expect(result.current[0].communityName).toBe("Arbitrum"));
    expect(result.current[0].communitySlug).toBe("arbitrum");
    expect(mockApiGet).toHaveBeenCalledTimes(1);
  });

  it("leaves an application untouched when its program config fails to load", async () => {
    mockApiGet.mockRejectedValue(
      new HttpError(500, { endpoint: "/v2/funding-programs/p1", method: "GET" })
    );

    const apps = [app({ communitySlug: undefined, communityName: undefined })];
    const { result } = renderHookWithProviders(() => useEnrichedApplications(apps, undefined));

    await waitFor(() => expect(mockApiGet).toHaveBeenCalled());
    expect(result.current[0].communityName).toBeUndefined();
    expect(result.current[0].communitySlug).toBeUndefined();
  });

  it("deduplicates the program-config fetch across applications sharing a program", async () => {
    mockApiGet.mockResolvedValue({ communitySlug: "arbitrum" });

    const apps = [app({ id: "a1", programId: "p1" }), app({ id: "a2", programId: "p1" })];
    const { result } = renderHookWithProviders(() => useEnrichedApplications(apps, undefined));

    await waitFor(() => expect(result.current[0].communityName).toBe("Arbitrum"));
    // One shared programId → one fetch, both rows enriched.
    expect(mockApiGet).toHaveBeenCalledTimes(1);
    expect(result.current[1].communityName).toBe("Arbitrum");
  });
});
