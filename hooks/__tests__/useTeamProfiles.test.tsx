import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTeamProfiles } from "@/hooks/useTeamProfiles";
import { communityAdminsService } from "@/services/community-admins.service";
import { getContributorProfiles } from "@/utilities/indexer/getContributorProfiles";

const mockSetTeamProfiles = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/utilities/indexer/getContributorProfiles", () => ({
  getContributorProfiles: vi.fn(),
}));

vi.mock("@/services/community-admins.service", () => ({
  communityAdminsService: {
    getUserProfiles: vi.fn(),
  },
}));

vi.mock("@/store", () => ({
  useProjectStore: vi.fn((selector?: (state: unknown) => unknown) => {
    const state = {
      setTeamProfiles: mockSetTeamProfiles,
    };

    if (typeof selector === "function") {
      return selector(state);
    }

    return state;
  }),
}));

const mockUseAuth = vi.mocked(useAuth);
const mockGetContributorProfiles = vi.mocked(getContributorProfiles);
const mockGetUserProfiles = vi.mocked(communityAdminsService.getUserProfiles);

describe("useTeamProfiles", () => {
  let queryClient: QueryClient;

  const project = {
    owner: "0x1111111111111111111111111111111111111111",
    members: [
      { address: "0x2222222222222222222222222222222222222222" },
      { address: "0x1111111111111111111111111111111111111111" },
    ],
  } as any;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("merges backend-authorized email onto team profiles when authenticated", async () => {
    mockUseAuth.mockReturnValue({ authenticated: true } as any);
    mockGetContributorProfiles.mockResolvedValue([
      {
        recipient: "0x1111111111111111111111111111111111111111",
        data: { name: "Owner Name" },
      },
      {
        recipient: "0x2222222222222222222222222222222222222222",
        data: { aboutMe: "Contributor" },
      },
    ] as any);
    mockGetUserProfiles.mockResolvedValue(
      new Map([
        [
          "0x1111111111111111111111111111111111111111",
          {
            publicAddress: "0x1111111111111111111111111111111111111111",
            name: "Owner Name",
            email: "owner@example.com",
          },
        ],
      ])
    );

    const { result } = renderHook(() => useTeamProfiles(project), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGetContributorProfiles).toHaveBeenCalledWith([
      "0x1111111111111111111111111111111111111111",
      "0x2222222222222222222222222222222222222222",
    ]);
    expect(mockGetUserProfiles).toHaveBeenCalledWith([
      "0x1111111111111111111111111111111111111111",
      "0x2222222222222222222222222222222222222222",
    ]);
    expect(result.current.teamProfiles?.[0].data.email).toBe("owner@example.com");
    expect(result.current.teamProfiles?.[1].data.email).toBeUndefined();
    expect(mockSetTeamProfiles).toHaveBeenCalledWith(result.current.teamProfiles);
  });

  it("creates a minimal team profile when email is only available from the authorized backend", async () => {
    mockUseAuth.mockReturnValue({ authenticated: true } as any);
    mockGetContributorProfiles.mockResolvedValue([] as any);
    mockGetUserProfiles.mockResolvedValue(
      new Map([
        [
          "0x1111111111111111111111111111111111111111",
          {
            publicAddress: "0x1111111111111111111111111111111111111111",
            name: "Owner Name",
            email: "owner@example.com",
          },
        ],
      ])
    );

    const { result } = renderHook(() => useTeamProfiles(project), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.teamProfiles).toEqual([
      {
        recipient: "0x1111111111111111111111111111111111111111",
        data: {
          name: "Owner Name",
          email: "owner@example.com",
        },
      },
    ]);
  });

  it("falls back to public profiles when the authorized backend lookup is unavailable", async () => {
    mockUseAuth.mockReturnValue({ authenticated: true } as any);
    mockGetContributorProfiles.mockResolvedValue([
      {
        recipient: "0x2222222222222222222222222222222222222222",
        data: { name: "Member Name" },
      },
    ] as any);
    mockGetUserProfiles.mockRejectedValue(new Error("Forbidden"));

    const { result } = renderHook(() => useTeamProfiles(project), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.teamProfiles).toEqual([
      {
        recipient: "0x2222222222222222222222222222222222222222",
        data: { name: "Member Name" },
      },
    ]);
  });

  it("does not request backend-authorized profiles for unauthenticated users", async () => {
    mockUseAuth.mockReturnValue({ authenticated: false } as any);
    mockGetContributorProfiles.mockResolvedValue([
      {
        recipient: "0x2222222222222222222222222222222222222222",
        data: { name: "Member Name" },
      },
    ] as any);

    const { result } = renderHook(() => useTeamProfiles(project), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGetUserProfiles).not.toHaveBeenCalled();
    expect(result.current.teamProfiles?.[0].data.email).toBeUndefined();
  });
});
