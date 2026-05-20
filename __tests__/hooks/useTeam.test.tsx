import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import {
  useProvisionOrg,
  useTeamMemberAbout,
  useTeamOrg,
  useUpdateTeamMemberAbout,
} from "@/hooks/useTeam";
import { aiAgentClient } from "@/lib/ai-agent-client";

vi.mock("@/lib/ai-agent-client", async () => {
  const mod =
    await vi.importActual<typeof import("@/lib/ai-agent-client")>("@/lib/ai-agent-client");
  return {
    ...mod,
    aiAgentClient: {
      getOrg: vi.fn(),
      listProfiles: vi.fn(),
      getAbout: vi.fn(),
      updateAbout: vi.fn(),
      provision: vi.fn(),
    },
  };
});

vi.mock("react-hot-toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

const mockClient = aiAgentClient as unknown as Record<
  keyof typeof aiAgentClient,
  ReturnType<typeof vi.fn>
>;

describe("useTeamOrg", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns org when slug is provided", async () => {
    mockClient.getOrg.mockResolvedValue({
      id: "1",
      slug: "acme",
      communityId: null,
      status: "active",
      statusReason: null,
      provisionedAt: null,
      createdAt: "",
      updatedAt: "",
    });

    const { result } = renderHook(() => useTeamOrg("acme"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.slug).toBe("acme");
    expect(mockClient.getOrg).toHaveBeenCalledWith("acme");
  });

  it("is disabled when slug is undefined", () => {
    const { result } = renderHook(() => useTeamOrg(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockClient.getOrg).not.toHaveBeenCalled();
  });
});

describe("useTeamMemberAbout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads About content for a known role", async () => {
    mockClient.getAbout.mockResolvedValue("You are warm.");

    const { result } = renderHook(() => useTeamMemberAbout("acme", "fundraiser"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe("You are warm.");
    expect(mockClient.getAbout).toHaveBeenCalledWith("acme", "fundraiser");
  });
});

describe("useUpdateTeamMemberAbout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("optimistically swaps cached content on mutate", async () => {
    mockClient.updateAbout.mockResolvedValue(undefined);

    const wrapper = createWrapper();
    const { result: aboutResult } = renderHook(() => useTeamMemberAbout("acme", "fundraiser"), {
      wrapper,
    });

    mockClient.getAbout.mockResolvedValue("old");
    await waitFor(() => expect(aboutResult.current.isSuccess).toBe(true));

    const { result } = renderHook(() => useUpdateTeamMemberAbout("acme"), {
      wrapper,
    });

    result.current.mutate({ role: "fundraiser", content: "new" });

    await waitFor(() =>
      expect(mockClient.updateAbout).toHaveBeenCalledWith({
        slug: "acme",
        role: "fundraiser",
        content: "new",
      })
    );
  });

  it("rolls back cached content on error", async () => {
    mockClient.updateAbout.mockRejectedValue(new Error("bad"));

    const { result } = renderHook(() => useUpdateTeamMemberAbout("acme"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ role: "fundraiser", content: "new" });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useProvisionOrg", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls the client provision endpoint", async () => {
    mockClient.provision.mockResolvedValue({
      id: "1",
      slug: "acme",
      communityId: null,
      status: "active",
      statusReason: null,
      provisionedAt: null,
      createdAt: "",
      updatedAt: "",
    });

    const { result } = renderHook(() => useProvisionOrg(), {
      wrapper: createWrapper(),
    });

    await new Promise<void>((resolve) => {
      result.current.mutate(
        {
          slug: "acme",
          containerUrl: "https://hermes-acme.karma.xyz",
          sessionToken: "tok_aaaaaaaaaaaaaaaaaa",
          communityId: null,
        },
        { onSettled: () => resolve() }
      );
    });

    expect(mockClient.provision).toHaveBeenCalledWith(expect.objectContaining({ slug: "acme" }));
  });
});
