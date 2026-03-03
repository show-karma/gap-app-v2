import { isAddress } from "viem";
import type {
  PayoutConfigItem,
  SavePayoutConfigResponse,
} from "@/src/features/payout-disbursement";
import type { TableRow } from "./ControlCenterTable";

const AMOUNT_PATTERN = /^\d+(\.\d{1,18})?$/;

const HEADER_ALIASES = {
  grantUID: ["grantuid", "grantid", "grant"],
  projectUID: ["projectuid", "projectid"],
  projectSlug: ["projectslug", "slug"],
  projectURL: ["projecturl", "projectlink", "projectprofile", "url", "profile"],
  projectName: ["projectname", "projecttitle", "project"],
  payoutAddress: ["payoutaddress", "walletaddress", "address", "wallet", "recipient"],
  amount: ["amount", "grantamount", "totalgrant", "payoutamount", "prize", "value"],
} as const;

export type ImportMatchSource =
  | "direct_uid_pair"
  | "grant_uid"
  | "project_uid"
  | "project_slug"
  | "project_name"
  | "combined_identifiers";

export interface ImportDraftRow {
  rowNumber: number;
  grantUID: string;
  projectUID: string;
  projectSlug: string;
  projectName: string;
  payoutAddress: string;
  amount: string;
}

export interface ResolvedImportTarget {
  grantUID: string;
  projectUID: string;
  matchedBy: ImportMatchSource;
}

export interface ValidatedImportRow extends ImportDraftRow {
  status: "valid" | "invalid";
  errors: string[];
  target: ResolvedImportTarget | null;
}

export interface ParsedImportData {
  rows: ImportDraftRow[];
  fatalErrors: string[];
}

type RowCandidates = {
  grantUID: TableRow | null;
  projectUID: TableRow[];
  projectSlug: TableRow[];
  projectName: TableRow[];
};

function normalizeHeader(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "");
}

function normalizeIdentifier(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeProjectName(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

function findColumnIndex(headers: string[], aliases: readonly string[]): number {
  const normalizedHeaders = headers.map((header) => normalizeHeader(header));
  for (const alias of aliases) {
    const normalizedAlias = normalizeHeader(alias);
    const index = normalizedHeaders.indexOf(normalizedAlias);
    if (index !== -1) {
      return index;
    }
  }
  return -1;
}

function toCellValue(row: unknown[], index: number): string {
  if (index < 0 || index >= row.length) {
    return "";
  }
  const value = row[index];
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim();
}

export function extractProjectSlug(input: string): string {
  const value = input.trim();
  if (!value) {
    return "";
  }

  try {
    if (value.includes("://")) {
      const url = new URL(value);
      const parts = url.pathname.split("/").filter(Boolean);
      const projectIdx = parts.findIndex((part) => part === "project" || part === "projects");
      if (projectIdx >= 0 && parts[projectIdx + 1]) {
        return decodeURIComponent(parts[projectIdx + 1]).toLowerCase();
      }
      if (parts.length > 0) {
        return decodeURIComponent(parts[parts.length - 1]).toLowerCase();
      }
      return "";
    }
  } catch {
    // Fall back to regex parsing below.
  }

  const projectMatch = value.match(/\/(?:project|projects)\/([^/?#]+)/i);
  if (projectMatch?.[1]) {
    try {
      return decodeURIComponent(projectMatch[1]).trim().toLowerCase();
    } catch {
      return projectMatch[1].trim().toLowerCase();
    }
  }

  return value.replace(/^\/+|\/+$/g, "").toLowerCase();
}

function dedupeCandidates(rows: TableRow[]): TableRow[] {
  const map = new Map<string, TableRow>();
  for (const row of rows) {
    map.set(row.grantUid.toLowerCase(), row);
  }
  return Array.from(map.values());
}

function intersectCandidates(base: TableRow[], next: TableRow[]): TableRow[] {
  const keys = new Set(next.map((row) => row.grantUid.toLowerCase()));
  return base.filter((row) => keys.has(row.grantUid.toLowerCase()));
}

function buildTableIndexes(tableRows: TableRow[]) {
  const byGrantUID = new Map<string, TableRow>();
  const byProjectUID = new Map<string, TableRow[]>();
  const byProjectSlug = new Map<string, TableRow[]>();
  const byProjectName = new Map<string, TableRow[]>();

  for (const row of tableRows) {
    byGrantUID.set(row.grantUid.toLowerCase(), row);

    const projectUidKey = normalizeIdentifier(row.projectUid);
    const uidRows = byProjectUID.get(projectUidKey) || [];
    uidRows.push(row);
    byProjectUID.set(projectUidKey, uidRows);

    const slugKey = normalizeIdentifier(row.projectSlug);
    if (slugKey) {
      const slugRows = byProjectSlug.get(slugKey) || [];
      slugRows.push(row);
      byProjectSlug.set(slugKey, slugRows);
    }

    const nameKey = normalizeProjectName(row.projectName);
    if (nameKey) {
      const nameRows = byProjectName.get(nameKey) || [];
      nameRows.push(row);
      byProjectName.set(nameKey, nameRows);
    }
  }

  return { byGrantUID, byProjectUID, byProjectSlug, byProjectName };
}

function getRowCandidates(
  row: ImportDraftRow,
  indexes: ReturnType<typeof buildTableIndexes>
): RowCandidates {
  const grantUIDKey = normalizeIdentifier(row.grantUID);
  const projectUIDKey = normalizeIdentifier(row.projectUID);
  const projectSlugKey = normalizeIdentifier(row.projectSlug);
  const projectNameKey = normalizeProjectName(row.projectName);

  return {
    grantUID: grantUIDKey ? indexes.byGrantUID.get(grantUIDKey) || null : null,
    projectUID: projectUIDKey ? indexes.byProjectUID.get(projectUIDKey) || [] : [],
    projectSlug: projectSlugKey ? indexes.byProjectSlug.get(projectSlugKey) || [] : [],
    projectName: projectNameKey ? indexes.byProjectName.get(projectNameKey) || [] : [],
  };
}

function resolveTargetFromCandidates(
  row: ImportDraftRow,
  candidates: RowCandidates
): { target: ResolvedImportTarget | null; errors: string[] } {
  const errors: string[] = [];

  if (row.grantUID && row.projectUID) {
    if (candidates.grantUID) {
      const grantProjectUID = normalizeIdentifier(candidates.grantUID.projectUid);
      const providedProjectUID = normalizeIdentifier(row.projectUID);
      if (grantProjectUID !== providedProjectUID) {
        errors.push("Grant UID and project UID do not match");
        return { target: null, errors };
      }

      return {
        target: {
          grantUID: candidates.grantUID.grantUid,
          projectUID: candidates.grantUID.projectUid,
          matchedBy: "direct_uid_pair",
        },
        errors,
      };
    }

    return {
      target: {
        grantUID: row.grantUID,
        projectUID: row.projectUID,
        matchedBy: "direct_uid_pair",
      },
      errors,
    };
  }

  const allCandidateLists: TableRow[][] = [];
  let matchSource: ImportMatchSource = "combined_identifiers";

  if (row.grantUID) {
    if (!candidates.grantUID) {
      errors.push("Unknown grant UID (provide project UID too, or fix grant UID)");
    } else {
      allCandidateLists.push([candidates.grantUID]);
      matchSource = "grant_uid";
    }
  }

  if (row.projectUID) {
    if (candidates.projectUID.length === 0) {
      errors.push("Unknown project UID");
    } else {
      allCandidateLists.push(candidates.projectUID);
      matchSource = row.grantUID ? "combined_identifiers" : "project_uid";
    }
  }

  if (row.projectSlug) {
    if (candidates.projectSlug.length === 0) {
      errors.push("Project slug/url not found");
    } else {
      allCandidateLists.push(candidates.projectSlug);
      matchSource = row.grantUID || row.projectUID ? "combined_identifiers" : "project_slug";
    }
  }

  if (row.projectName) {
    if (candidates.projectName.length === 0) {
      errors.push("Project name not found");
    } else {
      allCandidateLists.push(candidates.projectName);
      matchSource =
        row.grantUID || row.projectUID || row.projectSlug ? "combined_identifiers" : "project_name";
    }
  }

  if (allCandidateLists.length === 0) {
    if (!row.grantUID && !row.projectUID && !row.projectSlug && !row.projectName) {
      errors.push("Provide at least one identifier (grant UID, project UID, slug/url, or name)");
    }
    return { target: null, errors };
  }

  const initial = dedupeCandidates(allCandidateLists[0]);
  const narrowed = allCandidateLists
    .slice(1)
    .reduce((acc, list) => intersectCandidates(acc, dedupeCandidates(list)), initial);

  if (narrowed.length === 0) {
    errors.push("Identifiers did not match any project/grant combination");
    return { target: null, errors };
  }

  if (narrowed.length > 1) {
    errors.push("Ambiguous match (multiple grants matched). Add grant UID or project UID.");
    return { target: null, errors };
  }

  const [resolved] = narrowed;
  return {
    target: {
      grantUID: resolved.grantUid,
      projectUID: resolved.projectUid,
      matchedBy: matchSource,
    },
    errors,
  };
}

export function parseImportRecords(records: unknown[][]): ParsedImportData {
  if (!records || records.length < 2) {
    return {
      rows: [],
      fatalErrors: ["CSV appears empty. Include a header row and at least one data row."],
    };
  }

  const headerRow = records[0].map((value) => String(value ?? ""));
  const dataRows = records.slice(1);

  const grantUIDIndex = findColumnIndex(headerRow, HEADER_ALIASES.grantUID);
  const projectUIDIndex = findColumnIndex(headerRow, HEADER_ALIASES.projectUID);
  const projectSlugIndex = findColumnIndex(headerRow, HEADER_ALIASES.projectSlug);
  const projectURLIndex = findColumnIndex(headerRow, HEADER_ALIASES.projectURL);
  const projectNameIndex = findColumnIndex(headerRow, HEADER_ALIASES.projectName);
  const payoutAddressIndex = findColumnIndex(headerRow, HEADER_ALIASES.payoutAddress);
  const amountIndex = findColumnIndex(headerRow, HEADER_ALIASES.amount);

  const fatalErrors: string[] = [];
  if (payoutAddressIndex === -1) {
    fatalErrors.push("Missing payout address column");
  }
  if (amountIndex === -1) {
    fatalErrors.push("Missing amount column");
  }
  if (
    grantUIDIndex === -1 &&
    projectUIDIndex === -1 &&
    projectSlugIndex === -1 &&
    projectURLIndex === -1 &&
    projectNameIndex === -1
  ) {
    fatalErrors.push(
      "Missing identifier column. Add one of: grantUID, projectUID, projectSlug/projectURL, projectName."
    );
  }

  if (fatalErrors.length > 0) {
    return { rows: [], fatalErrors };
  }

  const rows: ImportDraftRow[] = [];

  for (let i = 0; i < dataRows.length; i += 1) {
    const rawRow = Array.isArray(dataRows[i]) ? dataRows[i] : [];
    const rowValues = rawRow as unknown[];
    const rowNumber = i + 2;

    const grantUID = toCellValue(rowValues, grantUIDIndex);
    const projectUID = toCellValue(rowValues, projectUIDIndex);
    const rawSlug = toCellValue(rowValues, projectSlugIndex);
    const rawURL = toCellValue(rowValues, projectURLIndex);
    const projectName = toCellValue(rowValues, projectNameIndex);
    const payoutAddress = toCellValue(rowValues, payoutAddressIndex);
    const amount = toCellValue(rowValues, amountIndex);

    const extractedSlug = rawSlug || rawURL ? extractProjectSlug(rawSlug || rawURL) : "";

    const row: ImportDraftRow = {
      rowNumber,
      grantUID,
      projectUID,
      projectSlug: extractedSlug,
      projectName,
      payoutAddress,
      amount,
    };

    const hasAnyValue = [grantUID, projectUID, extractedSlug, projectName, payoutAddress, amount]
      .map((value) => value.trim())
      .some(Boolean);

    if (!hasAnyValue) {
      continue;
    }

    rows.push(row);
  }

  if (rows.length === 0) {
    return {
      rows: [],
      fatalErrors: ["No data rows found. Add at least one row below the header."],
    };
  }

  return { rows, fatalErrors: [] };
}

export function validateAndMatchImportRows(
  rows: ImportDraftRow[],
  tableRows: TableRow[]
): ValidatedImportRow[] {
  const indexes = buildTableIndexes(tableRows);

  const validatedRows = rows.map((row) => {
    const errors: string[] = [];

    if (!row.payoutAddress) {
      errors.push("Missing payout address");
    } else if (!isAddress(row.payoutAddress)) {
      errors.push("Invalid payout address");
    }

    if (!row.amount) {
      errors.push("Missing amount");
    } else {
      const parsedAmount = parseFloat(row.amount);
      if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
        errors.push("Amount must be greater than 0");
      } else if (!AMOUNT_PATTERN.test(row.amount)) {
        errors.push("Amount must use up to 18 decimal places");
      }
    }

    const candidates = getRowCandidates(row, indexes);
    const resolved = resolveTargetFromCandidates(row, candidates);

    errors.push(...resolved.errors);

    return {
      ...row,
      status: errors.length > 0 || !resolved.target ? "invalid" : "valid",
      errors,
      target: errors.length > 0 ? null : resolved.target,
    } as ValidatedImportRow;
  });

  const seenTargets = new Set<string>();
  for (const row of validatedRows) {
    if (row.status !== "valid" || !row.target) {
      continue;
    }
    const key = `${row.target.grantUID.toLowerCase()}::${row.target.projectUID.toLowerCase()}`;
    if (seenTargets.has(key)) {
      row.status = "invalid";
      row.target = null;
      row.errors.push("Duplicate mapping in import. Keep only one row per grant/project.");
      continue;
    }
    seenTargets.add(key);
  }

  return validatedRows;
}

export function buildPayoutConfigItems(rows: ValidatedImportRow[]): PayoutConfigItem[] {
  return rows
    .filter((row) => row.status === "valid" && row.target)
    .map((row) => ({
      grantUID: row.target!.grantUID,
      projectUID: row.target!.projectUID,
      payoutAddress: row.payoutAddress,
      totalGrantAmount: row.amount,
    }));
}

export function toErrorReport(rows: ValidatedImportRow[], fatalErrors: string[]): string {
  const lines: string[] = [];

  if (fatalErrors.length > 0) {
    lines.push("Fatal errors:");
    for (const error of fatalErrors) {
      lines.push(`- ${error}`);
    }
    lines.push("");
  }

  const invalidRows = rows.filter((row) => row.status === "invalid");
  if (invalidRows.length > 0) {
    lines.push("Row errors:");
    for (const row of invalidRows) {
      lines.push(`Row ${row.rowNumber}: ${row.errors.join("; ")}`);
    }
  } else if (fatalErrors.length === 0) {
    lines.push("No errors.");
  }

  return lines.join("\n");
}

export function summarizeSaveResponse(response: SavePayoutConfigResponse): {
  successCount: number;
  failedCount: number;
} {
  return {
    successCount: response.success.length,
    failedCount: response.failed.length,
  };
}
