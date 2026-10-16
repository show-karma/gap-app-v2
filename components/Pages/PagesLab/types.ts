export interface Anchor {
  /** `data-pl-id` the agent stamped on the block. */
  id: string;
  /** Visible text when the block was marked, used when the id disappears. */
  label: string;
}

export interface Comment {
  id: string;
  anchor: Anchor;
  body: string;
  status: "open" | "applied";
}

export interface Version {
  id: string;
  html: string;
  note: string;
  createdAt: number;
}

/** One exchange in the panel: what was asked, and what came back. */
export interface Turn {
  id: string;
  prompt: string;
  pinnedCount: number;
  status: "working" | "done" | "failed";
  /** What the agent is doing right now, while status is "working". */
  statusText?: string;
  versionLabel?: string;
  modelLabel?: string;
  error?: string;
}

export type AgentResponse =
  | { kind: "html"; html: string; note: string }
  | { kind: "dry"; prompt: string }
  | { kind: "error"; message: string };
