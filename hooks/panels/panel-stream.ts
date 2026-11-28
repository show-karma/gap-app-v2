import type { PanelDetail, PanelStreamEvent, PanelTurn } from "@/types/panels";

export interface PanelPreview {
  turnId: string | null;
  /** Streamed `publish_page` input, grows with each `delta`. */
  buffer: string;
  /** Full page the agent last published this turn, replaces the buffer. */
  html: string | null;
  settled: boolean;
  error: string | null;
}

export const INITIAL_PREVIEW: PanelPreview = {
  turnId: null,
  buffer: "",
  html: null,
  settled: false,
  error: null,
};

const EVENT_NAMES = new Set<PanelStreamEvent["name"]>([
  "turn",
  "status",
  "delta",
  "page",
  "done",
  "error",
]);

export function parsePanelStreamEvent(name: string, data: string): PanelStreamEvent | null {
  if (!EVENT_NAMES.has(name as PanelStreamEvent["name"])) return null;
  try {
    return { name, data: JSON.parse(data) } as PanelStreamEvent;
  } catch {
    return null;
  }
}

export function reducePanelPreview(preview: PanelPreview, event: PanelStreamEvent): PanelPreview {
  switch (event.name) {
    case "turn":
      return { ...INITIAL_PREVIEW, turnId: event.data.turn.id };
    case "delta":
      return { ...preview, buffer: preview.buffer + event.data.text };
    case "page":
      return { ...preview, buffer: "", html: event.data.html };
    case "done":
      return { ...preview, settled: true };
    case "error":
      return { ...preview, settled: true, error: event.data.message };
    default:
      return preview;
  }
}

function upsertTurn(turns: PanelTurn[], next: PanelTurn): PanelTurn[] {
  const index = turns.findIndex((turn) => turn.id === next.id);
  if (index === -1) return [...turns, next];
  const copy = turns.slice();
  copy[index] = next;
  return copy;
}

function patchTurn(turns: PanelTurn[], turnId: string, fields: Partial<PanelTurn>): PanelTurn[] {
  return turns.map((turn) => (turn.id === turnId ? { ...turn, ...fields } : turn));
}

/**
 * Applies one stream event to the cached panel detail. Pure, so the cache
 * write in the hook is a one-liner and the merge rules are unit-testable.
 */
export function reducePanelDetail(detail: PanelDetail, event: PanelStreamEvent): PanelDetail {
  switch (event.name) {
    case "turn":
      return { ...detail, turns: upsertTurn(detail.turns, event.data.turn) };
    case "status":
      return {
        ...detail,
        turns: patchTurn(detail.turns, event.data.turnId, { statusText: event.data.text }),
      };
    case "error":
      return {
        ...detail,
        turns: patchTurn(detail.turns, event.data.turnId, {
          status: "failed",
          error: event.data.message,
          statusText: null,
        }),
      };
    case "done": {
      const { turn, version, comments } = event.data;
      const applied = new Map(comments.map((comment) => [comment.id, comment]));
      const next: PanelDetail = {
        ...detail,
        turns: upsertTurn(detail.turns, turn),
        comments: detail.comments.map((comment) => applied.get(comment.id) ?? comment),
      };
      if (!version) return next;
      const { html: _html, ...summary } = version;
      const hasVersion = detail.versions.some((item) => item.id === version.id);
      return {
        ...next,
        currentVersion: version,
        versions: hasVersion ? detail.versions : [...detail.versions, summary],
        panel: {
          ...detail.panel,
          currentVersionId: version.id,
          versionCount: hasVersion ? detail.panel.versionCount : detail.panel.versionCount + 1,
          updatedAt: version.createdAt,
        },
      };
    }
    default:
      return detail;
  }
}
