export type PanelCommentStatus = "open" | "applied";
export type PanelTurnStatus = "working" | "done" | "failed";

export interface Panel {
  id: string;
  communityUid: string;
  title: string;
  createdBy: string;
  currentVersionId: string | null;
  versionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PanelVersionSummary {
  id: string;
  panelId: string;
  versionNumber: number;
  note: string;
  modelId: string;
  createdBy: string;
  createdAt: string;
}

export interface PanelVersion extends PanelVersionSummary {
  html: string;
}

export interface PanelComment {
  id: string;
  panelId: string;
  versionId: string;
  blockId: string;
  blockLabel: string;
  body: string;
  status: PanelCommentStatus;
  appliedInVersionId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PanelTurn {
  id: string;
  panelId: string;
  prompt: string;
  pinnedCommentIds: string[];
  status: PanelTurnStatus;
  statusText: string | null;
  summary: string | null;
  versionId: string | null;
  modelId: string;
  error: string | null;
  createdBy: string;
  createdAt: string;
  finishedAt: string | null;
}

export interface PanelDetail {
  panel: Panel;
  currentVersion: PanelVersion | null;
  versions: PanelVersionSummary[];
  comments: PanelComment[];
  turns: PanelTurn[];
}

export interface CreatePanelRequest {
  title?: string;
}

export interface UpdatePanelRequest {
  title?: string;
  currentVersionId?: string;
}

export interface CreatePanelCommentRequest {
  versionId: string;
  blockId: string;
  blockLabel: string;
  body: string;
}

export interface UpdatePanelCommentRequest {
  body: string;
}

export interface PanelTurnRequest {
  prompt: string;
  commentIds?: string[];
}

export type PanelStreamEvent =
  | { name: "turn"; data: { turn: PanelTurn } }
  | { name: "status"; data: { turnId: string; text: string } }
  | { name: "delta"; data: { turnId: string; text: string } }
  | { name: "page"; data: { turnId: string; html: string } }
  | {
      name: "done";
      data: { turn: PanelTurn; version: PanelVersion | null; comments: PanelComment[] };
    }
  | { name: "error"; data: { turnId: string; message: string } };

export function isPanelWorking(detail: PanelDetail | undefined): boolean {
  return detail?.turns.some((turn) => turn.status === "working") ?? false;
}
