/**
 * @file Tests for useUpdateMission and useUpdateBrand optimistic updates.
 *
 * Covers optimistic set, rollback on error, and brainKeys.all invalidation
 * on success/settled.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type React from "react";
import { useUpdateBrand, useUpdateMission } from "@/hooks/useOrgBrain";
import {
  type BrandData,
  hermesClient,
  type MissionData,
  type OrgBrainResponse,
} from "@/lib/hermes-client";

vi.mock("@/lib/hermes-client", () => ({
  hermesClient: {
    getOrgBrain: vi.fn(),
    putOrgBrain: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
}));

const mockClient = hermesClient as {
  [K in keyof typeof hermesClient]: ReturnType<typeof vi.fn>;
};

function wrap(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

const MISSION_KEY = ["org-brain", "acme", "mission"];
const BRAIN_ALL_KEY = ["org-brain"];

const existingMission: OrgBrainResponse<MissionData> = {
  topic: "mission",
  exists: true,
  data: {
    legalName: "Old Nonprofit",
    missionStatement: "Old mission",
  },
};

const existingBrand: OrgBrainResponse<BrandData> = {
  topic: "brand",
  exists: true,
  data: { voice: "warm" },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useUpdateMission", () => {
  it("applies optimistic update to cache immediately", async () => {
    mockClient.putOrgBrain.mockResolvedValue(undefined);

    const qc = makeClient();
    qc.setQueryData<OrgBrainResponse<MissionData>>(MISSION_KEY, existingMission);

    const { result } = renderHook(() => useUpdateMission("acme"), {
      wrapper: wrap(qc),
    });

    const newMission: MissionData = { legalName: "New Nonprofit", missionStatement: "New mission" };
    result.current.mutate(newMission);

    await waitFor(() => {
      const cached = qc.getQueryData<OrgBrainResponse<MissionData>>(MISSION_KEY);
      expect(cached?.data.legalName).toBe("New Nonprofit");
    });
  });

  it("rolls back to previous mission data on error", async () => {
    mockClient.putOrgBrain.mockRejectedValue(new Error("save failed"));

    const qc = makeClient();
    qc.setQueryData<OrgBrainResponse<MissionData>>(MISSION_KEY, existingMission);

    const { result } = renderHook(() => useUpdateMission("acme"), {
      wrapper: wrap(qc),
    });

    result.current.mutate({ legalName: "Broken", missionStatement: "broken" });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const cached = qc.getQueryData<OrgBrainResponse<MissionData>>(MISSION_KEY);
    expect(cached?.data.legalName).toBe("Old Nonprofit");
  });

  it("invalidates brainKeys.all on settled (success)", async () => {
    mockClient.putOrgBrain.mockResolvedValue(undefined);

    const qc = makeClient();
    qc.setQueryData<OrgBrainResponse<MissionData>>(MISSION_KEY, existingMission);
    const spy = vi.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useUpdateMission("acme"), {
      wrapper: wrap(qc),
    });

    result.current.mutate({ legalName: "Valid" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: BRAIN_ALL_KEY }));
  });
});

describe("useUpdateBrand", () => {
  const BRAND_KEY = ["org-brain", "acme", "brand"];

  it("applies optimistic update to brand cache", async () => {
    mockClient.putOrgBrain.mockResolvedValue(undefined);

    const qc = makeClient();
    qc.setQueryData<OrgBrainResponse<BrandData>>(BRAND_KEY, existingBrand);

    const { result } = renderHook(() => useUpdateBrand("acme"), {
      wrapper: wrap(qc),
    });

    result.current.mutate({ voice: "bold" });

    await waitFor(() => {
      const cached = qc.getQueryData<OrgBrainResponse<BrandData>>(BRAND_KEY);
      expect(cached?.data.voice).toBe("bold");
    });
  });

  it("rolls back brand data on error", async () => {
    mockClient.putOrgBrain.mockRejectedValue(new Error("brand save failed"));

    const qc = makeClient();
    qc.setQueryData<OrgBrainResponse<BrandData>>(BRAND_KEY, existingBrand);

    const { result } = renderHook(() => useUpdateBrand("acme"), {
      wrapper: wrap(qc),
    });

    result.current.mutate({ voice: "aggressive" });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const cached = qc.getQueryData<OrgBrainResponse<BrandData>>(BRAND_KEY);
    expect(cached?.data.voice).toBe("warm");
  });

  it("invalidates brainKeys.all on settled (error)", async () => {
    mockClient.putOrgBrain.mockRejectedValue(new Error("nope"));

    const qc = makeClient();
    qc.setQueryData<OrgBrainResponse<BrandData>>(BRAND_KEY, existingBrand);
    const spy = vi.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useUpdateBrand("acme"), {
      wrapper: wrap(qc),
    });

    result.current.mutate({ voice: "cold" });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: BRAIN_ALL_KEY }));
  });
});
