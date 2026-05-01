export type KnowledgeSourceKind = "gdrive_folder" | "gdrive_file" | "url" | "sitemap" | "pdf_url";

export type KnowledgeSyncStatus = "syncing" | "success" | "partial" | "failed";

export interface KnowledgeSyncStats {
  added?: number;
  updated?: number;
  removed?: number;
  unchanged?: number;
}

export interface KnowledgeSource {
  id: string;
  communityId: string;
  programId: string | null;
  kind: KnowledgeSourceKind;
  externalId: string;
  title: string;
  isActive: boolean;
  // Optional editorial purpose. Prepended to each chunk at embed time so
  // retrieval picks up the curator's intent — never shown in citations or
  // the agent's excerpt path.
  goal: string | null;
  syncIntervalMin: number;
  // DEV-192: when true on a kind=gdrive_file source, the sync worker
  // ingests Google Docs linked from the parent doc as additional
  // documents under the same source (depth=1, no recursion).
  followLinks: boolean;
  lastSyncedAt: string | null;
  lastSyncStatus: KnowledgeSyncStatus | null;
  lastSyncError: string | null;
  lastSyncStats: KnowledgeSyncStats;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeDocument {
  id: string;
  sourceId: string;
  externalId: string;
  title: string;
  sourceUrl: string;
  mimeType: string;
  lastFetchedAt: string;
  byteSize: number;
  chunkCount: number;
  // DEV-192: id of the parent KnowledgeDocument that linked to this one
  // during a depth=1 link-following sync. Null for top-level docs.
  discoveredFromId: string | null;
  deletedAt: string | null;
}

export interface CreateKnowledgeSourceInput {
  programId?: string | null;
  kind: KnowledgeSourceKind;
  externalId: string;
  title: string;
  goal?: string | null;
  syncIntervalMin?: number;
  // DEV-192: opt-in only when kind === "gdrive_file". Backend rejects
  // with 422 if set true on any other kind.
  followLinks?: boolean;
}

export interface UpdateKnowledgeSourceInput {
  title?: string;
  // `null` clears the goal; omitting the key leaves it unchanged.
  goal?: string | null;
  isActive?: boolean;
  syncIntervalMin?: number;
  followLinks?: boolean;
}

export const KNOWLEDGE_SOURCE_KIND_LABELS: Record<KnowledgeSourceKind, string> = {
  gdrive_folder: "Google Drive folder",
  gdrive_file: "Google Doc",
  url: "Web page",
  sitemap: "Sitemap (sitemap.xml)",
  pdf_url: "PDF (URL)",
};

// Three-letter shorthand for the row's mono meta strip — matches the
// design's compact resource-style line (e.g. `● SYNCED · WEB · 10m AGO`).
// Distinct from the title-row label which is human-readable.
export const KNOWLEDGE_SOURCE_KIND_SHORT: Record<KnowledgeSourceKind, string> = {
  gdrive_folder: "Drive",
  gdrive_file: "Doc",
  url: "Web",
  sitemap: "Map",
  pdf_url: "PDF",
};

export const KNOWLEDGE_SOURCE_KIND_HINTS: Record<KnowledgeSourceKind, string> = {
  gdrive_folder: "Folder ID — currently disabled in the UI; tracked in docs/features.",
  gdrive_file:
    "Paste the share URL or just the doc ID. The Doc must be set to “Anyone with the link — Viewer”.",
  url: "Full URL of the page (e.g. https://docs.example.com/intro). Must load without sign-in.",
  sitemap: "Currently disabled in the UI; tracked in docs/features.",
  pdf_url: "Direct URL to a publicly-accessible PDF file (no auth or session cookies required).",
};
