import { isAddress } from "viem";
import type {
  PayoutConfigItem,
  SavePayoutConfigResponse,
} from "@/src/features/payout-disbursement";

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

function normalizeHeader(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "");
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

export function validateFieldFormats(rows: ImportDraftRow[]): ValidatedImportRow[] {
  return rows.map((row) => {
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

    return {
      ...row,
      status: errors.length > 0 ? "invalid" : "valid",
      errors,
      target: null,
    } as ValidatedImportRow;
  });
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
