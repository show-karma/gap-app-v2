import {
  INITIAL_PREVIEW,
  parsePanelStreamEvent,
  reducePanelDetail,
  reducePanelPreview,
} from "@/hooks/panels/panel-stream";
import type {
  PanelComment,
  PanelDetail,
  PanelStreamEvent,
  PanelTurn,
  PanelVersion,
} from "@/types/panels";

function makeTurn(overrides: Partial<PanelTurn> = {}): PanelTurn {
  return {
    id: "turn-1",
    panelId: "panel-1",
    prompt: "Build it",
    pinnedCommentIds: [],
    status: "working",
    statusText: null,
    summary: null,
    versionId: null,
    modelId: "claude-sonnet-5-5",
    error: null,
    createdBy: "0xabc",
    createdAt: "2026-10-20T00:00:00.000Z",
    finishedAt: null,
    ...overrides,
  };
}

function makeVersion(overrides: Partial<PanelVersion> = {}): PanelVersion {
  return {
    id: "v-2",
    panelId: "panel-1",
    versionNumber: 2,
    note: "Build it",
    modelId: "claude-sonnet-5-5",
    createdBy: "0xabc",
    createdAt: "2026-10-20T00:01:00.000Z",
    html: "<!doctype html><html><head></head><body><p data-pl-id='a'>hi</p></body></html>",
    ...overrides,
  };
}

function makeComment(overrides: Partial<PanelComment> = {}): PanelComment {
  return {
    id: "c-1",
    panelId: "panel-1",
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
    panel: {
      id: "panel-1",
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
    },
    currentVersion: makeVersion({ id: "v-1", versionNumber: 1 }),
    versions: [
      {
        id: "v-1",
        panelId: "panel-1",
        versionNumber: 1,
        note: "first",
        modelId: "claude-sonnet-5-5",
        createdBy: "0xabc",
        createdAt: "2026-10-20T00:00:00.000Z",
      },
    ],
    comments: [makeComment()],
    turns: [],
    ...overrides,
  };
}

describe("parsePanelStreamEvent", () => {
  it("parses a known event", () => {
    const event = parsePanelStreamEvent("status", JSON.stringify({ turnId: "t", text: "x" }));
    expect(event).toEqual({ name: "status", data: { turnId: "t", text: "x" } });
  });

  it("drops unknown event names and malformed payloads", () => {
    expect(parsePanelStreamEvent("keepalive", "{}")).toBeNull();
    expect(parsePanelStreamEvent("status", "not json")).toBeNull();
  });
});

describe("reducePanelPreview", () => {
  it("starts a fresh buffer on turn and accumulates deltas", () => {
    let preview = reducePanelPreview(
      { ...INITIAL_PREVIEW, buffer: "stale" },
      { name: "turn", data: { turn: makeTurn() } }
    );
    expect(preview.buffer).toBe("");
    expect(preview.turnId).toBe("turn-1");

    preview = reducePanelPreview(preview, {
      name: "delta",
      data: { turnId: "turn-1", text: "<a" },
    });
    preview = reducePanelPreview(preview, {
      name: "delta",
      data: { turnId: "turn-1", text: "b>" },
    });
    expect(preview.buffer).toBe("<ab>");
  });

  it("replaces the buffer with the published page", () => {
    const preview = reducePanelPreview(
      { ...INITIAL_PREVIEW, buffer: "partial" },
      { name: "page", data: { turnId: "turn-1", html: "<html>full</html>" } }
    );
    expect(preview.buffer).toBe("");
    expect(preview.html).toBe("<html>full</html>");
  });

  it("settles on done and records the message on error", () => {
    const done = reducePanelPreview(INITIAL_PREVIEW, {
      name: "done",
      data: { turn: makeTurn({ status: "done" }), version: null, comments: [] },
    });
    expect(done.settled).toBe(true);
    expect(done.error).toBeNull();

    const failed = reducePanelPreview(INITIAL_PREVIEW, {
      name: "error",
      data: { turnId: "turn-1", message: "boom" },
    });
    expect(failed).toMatchObject({ settled: true, error: "boom" });
  });
});

describe("reducePanelDetail", () => {
  it("appends the turn on turn and patches statusText on status", () => {
    const withTurn = reducePanelDetail(makeDetail(), {
      name: "turn",
      data: { turn: makeTurn() },
    });
    expect(withTurn.turns).toHaveLength(1);

    const withStatus = reducePanelDetail(withTurn, {
      name: "status",
      data: { turnId: "turn-1", text: "Reading /v2/communities/x…" },
    });
    expect(withStatus.turns[0].statusText).toBe("Reading /v2/communities/x…");
  });

  it("does not duplicate a turn the poll already loaded", () => {
    const detail = makeDetail({ turns: [makeTurn()] });
    const next = reducePanelDetail(detail, { name: "turn", data: { turn: makeTurn() } });
    expect(next.turns).toHaveLength(1);
  });

  it("marks the turn failed on error", () => {
    const next = reducePanelDetail(makeDetail({ turns: [makeTurn()] }), {
      name: "error",
      data: { turnId: "turn-1", message: "model unavailable" },
    });
    expect(next.turns[0]).toMatchObject({
      status: "failed",
      error: "model unavailable",
      statusText: null,
    });
  });

  it("on done with a version: sets current version, appends summary, bumps the panel, applies comments", () => {
    const version = makeVersion();
    const doneTurn = makeTurn({ status: "done", versionId: version.id, pinnedCommentIds: ["c-1"] });
    const applied = makeComment({ status: "applied", appliedInVersionId: version.id });
    const event: PanelStreamEvent = {
      name: "done",
      data: { turn: doneTurn, version, comments: [applied] },
    };

    const next = reducePanelDetail(makeDetail({ turns: [makeTurn()] }), event);

    expect(next.currentVersion).toEqual(version);
    expect(next.versions.map((item) => item.id)).toEqual(["v-1", "v-2"]);
    expect(next.versions[1]).not.toHaveProperty("html");
    expect(next.panel).toMatchObject({ currentVersionId: "v-2", versionCount: 2 });
    expect(next.comments[0].status).toBe("applied");
    expect(next.turns[0].status).toBe("done");
  });

  it("on done without a version: leaves versions and current version untouched", () => {
    const detail = makeDetail({ turns: [makeTurn()] });
    const next = reducePanelDetail(detail, {
      name: "done",
      data: { turn: makeTurn({ status: "done" }), version: null, comments: [] },
    });
    expect(next.versions).toEqual(detail.versions);
    expect(next.currentVersion).toEqual(detail.currentVersion);
    expect(next.panel.versionCount).toBe(1);
  });

  it("on done with a version the poll already appended: does not add it twice", () => {
    const version = makeVersion();
    const { html: _html, ...summary } = version;
    const detail = makeDetail({ versions: [...makeDetail().versions, summary] });
    const next = reducePanelDetail(detail, {
      name: "done",
      data: { turn: makeTurn({ status: "done", versionId: version.id }), version, comments: [] },
    });
    expect(next.versions).toHaveLength(2);
    expect(next.panel.versionCount).toBe(1);
  });
});
