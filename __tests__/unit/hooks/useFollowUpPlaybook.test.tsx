import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { QUERY_KEYS } from "@/hooks/fundingPlatformQueryKeys";
import { useSaveFollowUpPlaybook } from "@/hooks/useFollowUpPlaybook";
import { saveFollowUpPlaybook } from "@/services/followUpAgent.service";

vi.mock("@/services/followUpAgent.service", () => ({
  fetchFollowUpPlaybook: vi.fn(),
  saveFollowUpPlaybook: vi.fn(),
}));
vi.mock("react-hot-toast", () => ({ default: { success: vi.fn(), error: vi.fn() } }));

const save = saveFollowUpPlaybook as unknown as ReturnType<typeof vi.fn>;
const previous = {
  playbook: {
    programId: "101105",
    version: 0,
    content: "old text here, long enough",
    createdBy: null,
    createdAt: null,
    isDefault: true,
  },
  versions: [],
};

describe("useSaveFollowUpPlaybook", () => {
  let queryClient: QueryClient;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(QUERY_KEYS.followUpPlaybook("101105"), previous);
  });

  afterEach(() => queryClient.clear());

  it("shows the new text optimistically", async () => {
    save.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useSaveFollowUpPlaybook("101105"), { wrapper });

    act(() => result.current.mutate("new text, long enough to save"));

    await waitFor(() =>
      expect(
        queryClient.getQueryData<typeof previous>(QUERY_KEYS.followUpPlaybook("101105"))?.playbook
          .content
      ).toBe("new text, long enough to save")
    );
  });

  it("rolls back when saving fails", async () => {
    save.mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useSaveFollowUpPlaybook("101105"), { wrapper });

    act(() => result.current.mutate("new text, long enough to save"));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(
      queryClient.getQueryData<typeof previous>(QUERY_KEYS.followUpPlaybook("101105"))?.playbook
        .content
    ).toBe("old text here, long enough");
  });
});
