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
  syncIntervalMin: number;
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
  deletedAt: string | null;
}

export interface CreateKnowledgeSourceInput {
  programId?: string | null;
  kind: KnowledgeSourceKind;
  externalId: string;
  title: string;
  syncIntervalMin?: number;
}

export interface UpdateKnowledgeSourceInput {
  title?: string;
  isActive?: boolean;
  syncIntervalMin?: number;
}

export const KNOWLEDGE_SOURCE_KIND_LABELS: Record<KnowledgeSourceKind, string> = {
  gdrive_folder: "Google Drive folder",
  gdrive_file: "Google Doc",
  url: "Web page",
  sitemap: "Sitemap (sitemap.xml)",
  pdf_url: "PDF (URL)",
};

export const KNOWLEDGE_SOURCE_KIND_HINTS: Record<KnowledgeSourceKind, string> = {
  gdrive_folder: "Folder ID — share the folder with the service account first.",
  gdrive_file: "Google Doc ID (the long string in the doc URL).",
  url: "Full URL of the page (e.g. https://docs.example.com/intro).",
  sitemap: "URL of an XML sitemap (e.g. https://docs.example.com/sitemap.xml).",
  pdf_url: "Direct URL to a PDF file.",
};
