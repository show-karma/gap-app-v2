const mockClient = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/utilities/auth/api-client", () => ({
  createAuthenticatedApiClient: vi.fn(() => mockClient),
}));

vi.mock("@/utilities/enviromentVars", () => ({
  envVars: { NEXT_PUBLIC_GAP_INDEXER_URL: "https://api.test" },
}));

import {
  createPanel,
  createPanelComment,
  deletePanel,
  deletePanelComment,
  getPanel,
  getPanelVersion,
  listPanels,
  panelTurnsUrl,
  updatePanel,
  updatePanelComment,
} from "@/services/panels.service";

const BASE = "/v2/communities/filecoin/panels";

describe("panels.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists panels for a community", async () => {
    mockClient.get.mockResolvedValue({ data: [{ id: "p1" }] });
    await expect(listPanels("filecoin")).resolves.toEqual([{ id: "p1" }]);
    expect(mockClient.get).toHaveBeenCalledWith(BASE);
  });

  it("creates a panel with the given title", async () => {
    mockClient.post.mockResolvedValue({ data: { id: "p1" } });
    await createPanel("filecoin", { title: "Q3" });
    expect(mockClient.post).toHaveBeenCalledWith(BASE, { title: "Q3" });
  });

  it("reads, patches and deletes one panel", async () => {
    mockClient.get.mockResolvedValue({ data: { panel: { id: "p1" } } });
    mockClient.patch.mockResolvedValue({ data: { id: "p1" } });
    mockClient.delete.mockResolvedValue({});

    await getPanel("filecoin", "p1");
    await updatePanel("filecoin", "p1", { currentVersionId: "v1" });
    await deletePanel("filecoin", "p1");

    expect(mockClient.get).toHaveBeenCalledWith(`${BASE}/p1`);
    expect(mockClient.patch).toHaveBeenCalledWith(`${BASE}/p1`, { currentVersionId: "v1" });
    expect(mockClient.delete).toHaveBeenCalledWith(`${BASE}/p1`);
  });

  it("reads a version", async () => {
    mockClient.get.mockResolvedValue({ data: { id: "v1", html: "<html/>" } });
    await getPanelVersion("filecoin", "p1", "v1");
    expect(mockClient.get).toHaveBeenCalledWith(`${BASE}/p1/versions/v1`);
  });

  it("creates, edits and removes a comment", async () => {
    mockClient.post.mockResolvedValue({ data: { id: "c1" } });
    mockClient.patch.mockResolvedValue({ data: { id: "c1" } });
    mockClient.delete.mockResolvedValue({});
    const body = { versionId: "v1", blockId: "summary", blockLabel: "Summary", body: "Shorter" };

    await createPanelComment("filecoin", "p1", body);
    await updatePanelComment("filecoin", "p1", "c1", { body: "Longer" });
    await deletePanelComment("filecoin", "p1", "c1");

    expect(mockClient.post).toHaveBeenCalledWith(`${BASE}/p1/comments`, body);
    expect(mockClient.patch).toHaveBeenCalledWith(`${BASE}/p1/comments/c1`, { body: "Longer" });
    expect(mockClient.delete).toHaveBeenCalledWith(`${BASE}/p1/comments/c1`);
  });

  it("encodes path segments and builds the absolute turns url", () => {
    expect(panelTurnsUrl("a b", "p/1")).toBe(
      "https://api.test/v2/communities/a%20b/panels/p%2F1/turns"
    );
  });
});
