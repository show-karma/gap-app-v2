import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import {
  panelKeys,
  useCreatePanelComment,
  useDeletePanelComment,
  usePanel,
  usePanels,
  usePublishPanel,
  useSharedPanel,
  useUpdatePanel,
} from "@/hooks/panels/usePanels";
import * as panelsService from "@/services/panels.service";
import type { Panel, PanelComment, PanelDetail } from "@/types/panels";

vi.mock("@/services/panels.service");

const mockList = vi.mocked(panelsService.listPanels);
const mockGet = vi.mocked(panelsService.getPanel);
const mockUpdate = vi.mocked(panelsService.updatePanel);
const mockPublish = vi.mocked(panelsService.publishPanel);
const mockShared = vi.mocked(panelsService.getSharedPanel);
const mockCreateComment = vi.mocked(panelsService.createPanelComment);
const mockDeleteComment = vi.mocked(panelsService.deletePanelComment);

const SLUG = "filecoin";
const PANEL_ID = "panel-1";

function makePanel(overrides: Partial<Panel> = {}): Panel {
  return {
    id: PANEL_ID,
    communityUid: "0xcommunity",
    title: "Untitled panel",
    createdBy: "0xabc",
    currentVersionId: "v-1",
    publishedVersionId: null,
    shareToken: null,
    publishedAt: null,
    versionCount: 1,
    createdAt: "2026-10-20T00:00:00.000Z",
    updatedAt: "2026-10-20T00:00:00.000Z",
    ...overrides,
  };
}

function makeComment(overrides: Partial<PanelComment> = {}): PanelComment {
  return {
    id: "c-1",
    panelId: PANEL_ID,
    versionId: "v-1",
    blockId: "a",
    blockLabel: "hi",
    body: "Make it bigger",
    status: "open",
    appliedInVersionId: null,
    createdBy: "0xabc",
    createdAt: "2026-10-20T00:00:30.000Z",
    updatedAt: "2026-10-20T00:00:30.000Z",
    ...overrides,
  };
}

function makeDetail(overrides: Partial<PanelDetail> = {}): PanelDetail {
  return {
    panel: makePanel(),
    currentVersion: null,
    versions: [],
    comments: [],
    turns: [],
    ...overrides,
  };
}

let queryClient: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

beforeEach(() => {
  vi.clearAllMocks();
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Number.POSITIVE_INFINITY },
      mutations: { retry: false },
    },
  });
});

afterEach(() => {
  queryClient.clear();
});

describe("usePanels", () => {
  it("is loading, then returns the list", async () => {
    mockList.mockResolvedValue([makePanel()]);
    const { result } = renderHook(() => usePanels(SLUG), { wrapper });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });

  it("returns an empty list", async () => {
    mockList.mockResolvedValue([]);
    const { result } = renderHook(() => usePanels(SLUG), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it("surfaces an error", async () => {
    mockList.mockRejectedValue(new Error("403"));
    const { result } = renderHook(() => usePanels(SLUG), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("does not fetch without a community", () => {
    renderHook(() => usePanels(""), { wrapper });
    expect(mockList).not.toHaveBeenCalled();
  });
});

describe("usePanel", () => {
  it("loads the detail", async () => {
    mockGet.mockResolvedValue(makeDetail());
    const { result } = renderHook(() => usePanel(SLUG, PANEL_ID), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.panel.id).toBe(PANEL_ID);
    expect(mockGet).toHaveBeenCalledWith(SLUG, PANEL_ID);
  });
});

describe("useUpdatePanel", () => {
  it("optimistically points at the reverted version and rolls back on error", async () => {
    const key = panelKeys.detail(SLUG, PANEL_ID);
    queryClient.setQueryData(key, makeDetail());
    let reject: (error: Error) => void = () => {};
    mockUpdate.mockReturnValue(
      new Promise<Panel>((_res, rej) => {
        reject = rej;
      })
    );

    const { result } = renderHook(() => useUpdatePanel(SLUG, PANEL_ID), { wrapper });
    act(() => {
      result.current.mutate({ currentVersionId: "v-0" });
    });
    await waitFor(() =>
      expect(queryClient.getQueryData<PanelDetail>(key)?.panel.currentVersionId).toBe("v-0")
    );

    await act(async () => {
      reject(new Error("500"));
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(queryClient.getQueryData<PanelDetail>(key)?.panel.currentVersionId).toBe("v-1");
  });
});

describe("useCreatePanelComment", () => {
  it("adds an optimistic comment and swaps in the server row", async () => {
    const key = panelKeys.detail(SLUG, PANEL_ID);
    queryClient.setQueryData(key, makeDetail());
    const saved = makeComment({ id: "c-server" });
    let resolve: (value: PanelComment) => void = () => {};
    mockCreateComment.mockReturnValue(
      new Promise<PanelComment>((res) => {
        resolve = res;
      })
    );

    const { result } = renderHook(() => useCreatePanelComment(SLUG, PANEL_ID), { wrapper });
    act(() => {
      result.current.mutate({ versionId: "v-1", blockId: "a", blockLabel: "hi", body: "Bigger" });
    });

    await waitFor(() => {
      const comments = queryClient.getQueryData<PanelDetail>(key)?.comments ?? [];
      expect(comments).toHaveLength(1);
      expect(comments[0].id).toMatch(/^optimistic-/);
    });

    await act(async () => {
      resolve(saved);
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const comments = queryClient.getQueryData<PanelDetail>(key)?.comments ?? [];
    expect(comments.map((comment) => comment.id)).toEqual(["c-server"]);
  });

  it("rolls the optimistic comment back on error", async () => {
    const key = panelKeys.detail(SLUG, PANEL_ID);
    queryClient.setQueryData(key, makeDetail());
    mockCreateComment.mockRejectedValue(new Error("422"));

    const { result } = renderHook(() => useCreatePanelComment(SLUG, PANEL_ID), { wrapper });
    act(() => {
      result.current.mutate({ versionId: "v-1", blockId: "a", blockLabel: "hi", body: "Bigger" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(queryClient.getQueryData<PanelDetail>(key)?.comments).toEqual([]);
  });
});

describe("useDeletePanelComment", () => {
  it("removes the comment immediately and restores it on error", async () => {
    const key = panelKeys.detail(SLUG, PANEL_ID);
    queryClient.setQueryData(key, makeDetail({ comments: [makeComment()] }));
    let reject: (error: Error) => void = () => {};
    mockDeleteComment.mockReturnValue(
      new Promise<void>((_res, rej) => {
        reject = rej;
      })
    );

    const { result } = renderHook(() => useDeletePanelComment(SLUG, PANEL_ID), { wrapper });
    act(() => {
      result.current.mutate("c-1");
    });
    await waitFor(() =>
      expect(queryClient.getQueryData<PanelDetail>(key)?.comments).toHaveLength(0)
    );

    await act(async () => {
      reject(new Error("500"));
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(queryClient.getQueryData<PanelDetail>(key)?.comments).toHaveLength(1);
  });
});

describe("usePublishPanel", () => {
  it("writes the published panel into the detail and list caches", async () => {
    const key = panelKeys.detail(SLUG, PANEL_ID);
    queryClient.setQueryData(key, makeDetail());
    queryClient.setQueryData(panelKeys.all(SLUG), [makePanel()]);
    const published = makePanel({ publishedVersionId: "v-1", shareToken: "tok" });
    mockPublish.mockResolvedValue(published);

    const { result } = renderHook(() => usePublishPanel(SLUG, PANEL_ID), { wrapper });
    act(() => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData<PanelDetail>(key)?.panel.shareToken).toBe("tok");
    expect(queryClient.getQueryData<Panel[]>(panelKeys.all(SLUG))?.[0].shareToken).toBe("tok");
  });
});

describe("useSharedPanel", () => {
  it("loads the frozen page for a token", async () => {
    mockShared.mockResolvedValue({
      title: "Q3",
      html: '<html><body><p data-pl-id="a">x</p></body></html>',
      versionNumber: 2,
      publishedAt: null,
    });

    const { result } = renderHook(() => useSharedPanel("tok"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockShared).toHaveBeenCalledWith("tok");
    expect(result.current.data?.title).toBe("Q3");
  });

  it("surfaces an error when the link is revoked", async () => {
    mockShared.mockRejectedValue(new Error("API error: 404"));

    const { result } = renderHook(() => useSharedPanel("gone"), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
