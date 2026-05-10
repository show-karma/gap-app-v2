import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type React from "react";

vi.mock("@/utilities/fetchData", () => ({
  __esModule: true,
  default: vi.fn(),
}));

import { useProgram } from "@/src/features/programs/hooks/use-program";
import fetchData from "@/utilities/fetchData";

const buildClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
    },
  });

const wrapper =
  (queryClient: QueryClient) =>
  ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

describe("useProgram", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = buildClient();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("fetches public program details without requiring auth", async () => {
    const mockProgram = {
      id: "program-12",
      name: "Public Program",
    };

    (fetchData as vi.Mock).mockResolvedValueOnce([mockProgram, null, null, 200]);

    const { result } = renderHook(() => useProgram("program-12"), {
      wrapper: wrapper(queryClient),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.program).toEqual(mockProgram);
    expect(fetchData).toHaveBeenCalledWith(
      "/v2/funding-program-configs/program-12",
      "GET",
      {},
      {},
      {},
      false
    );
  });
});
