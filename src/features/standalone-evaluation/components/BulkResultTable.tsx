"use client";

import { Loader2 } from "lucide-react";
import React, { useMemo, useState } from "react";
import { useBulkJobResult } from "../hooks/useBulkJob";

interface BulkResultTableProps {
  sessionId: string;
  jobId: string;
  enabled: boolean;
}

const INITIAL_VISIBLE = 25;
const PAGE_INCREMENT = 25;
const PINNED_EVAL_COLUMNS = ["eval_score", "eval_summary", "eval_decision", "eval_error"] as const;
const PINNED_CELL_WIDTH_PX = 180;

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function BulkResultTable({ sessionId, jobId, enabled }: BulkResultTableProps) {
  const query = useBulkJobResult(sessionId, jobId, enabled);
  const [visible, setVisible] = useState(INITIAL_VISIBLE);

  const { orderedColumns, pinnedRightOffsets } = useMemo(() => {
    if (!query.data) {
      return {
        orderedColumns: [] as string[],
        pinnedRightOffsets: {} as Record<string, number>,
      };
    }
    const evalSet = new Set<string>(PINNED_EVAL_COLUMNS);
    const original = query.data.columns.filter((c) => !evalSet.has(c));
    const evalCols = PINNED_EVAL_COLUMNS.filter((c) => query.data!.columns.includes(c));
    const offsets: Record<string, number> = {};
    evalCols.forEach((col, idx) => {
      offsets[col] = (evalCols.length - 1 - idx) * PINNED_CELL_WIDTH_PX;
    });
    return {
      orderedColumns: [...original, ...evalCols],
      pinnedRightOffsets: offsets,
    };
  }, [query.data]);

  if (!enabled) return null;

  if (query.isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading results…
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="flex flex-col gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
        <span>Couldn't load results inline: {query.error?.message ?? "unknown error"}</span>
        <button
          type="button"
          className="self-start rounded border border-red-300 px-2 py-1 text-xs hover:bg-red-100 dark:border-red-800 dark:hover:bg-red-900/40"
          onClick={() => query.refetch()}
        >
          Retry
        </button>
      </div>
    );
  }

  const data = query.data;
  if (!data || data.rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No rows in this result.</p>;
  }

  const visibleRows = data.rows.slice(0, visible);
  const remaining = data.rows.length - visible;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Showing {visibleRows.length} of {data.rows.length}{" "}
          {data.rows.length === 1 ? "row" : "rows"}
        </span>
        <span>{orderedColumns.length} columns</span>
      </div>
      <div className="max-h-[480px] overflow-auto rounded-md border border-border">
        <table className="min-w-full text-left text-xs">
          <thead className="sticky top-0 z-20 bg-muted/60 text-muted-foreground">
            <tr>
              {orderedColumns.map((col) => {
                const isPinned = col in pinnedRightOffsets;
                return (
                  <th
                    key={col}
                    className={
                      "border-b border-border px-3 py-2 font-semibold " +
                      (isPinned ? "sticky right-0 z-30 bg-muted/95 backdrop-blur" : "")
                    }
                    style={
                      isPinned
                        ? {
                            right: `${pinnedRightOffsets[col]}px`,
                            width: `${PINNED_CELL_WIDTH_PX}px`,
                            minWidth: `${PINNED_CELL_WIDTH_PX}px`,
                            maxWidth: `${PINNED_CELL_WIDTH_PX}px`,
                          }
                        : undefined
                    }
                  >
                    {col}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, rowIdx) => (
              <BulkResultRow
                key={rowIdx}
                row={row}
                columns={orderedColumns}
                rowIndex={rowIdx}
                pinnedRightOffsets={pinnedRightOffsets}
              />
            ))}
          </tbody>
        </table>
      </div>
      {remaining > 0 ? (
        <div className="text-center">
          <button
            type="button"
            className="rounded-md border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-muted/60"
            onClick={() => setVisible((v) => v + PAGE_INCREMENT)}
          >
            Show {Math.min(remaining, PAGE_INCREMENT)} more
          </button>
        </div>
      ) : null}
    </div>
  );
}

interface RowProps {
  row: Record<string, unknown>;
  columns: string[];
  rowIndex: number;
  pinnedRightOffsets: Record<string, number>;
}

const BulkResultRow = React.memo(function BulkResultRow({
  row,
  columns,
  rowIndex,
  pinnedRightOffsets,
}: RowProps) {
  // Stripe each cell rather than the row — sticky cells render transparent
  // over scrolled rows otherwise.
  const stripeBg = rowIndex % 2 === 0 ? "bg-background" : "bg-muted/20";
  return (
    <tr>
      {columns.map((col) => {
        const value = cellToString(row[col]);
        const isEval = col.startsWith("eval_");
        const isPinned = col in pinnedRightOffsets;
        return (
          <td
            key={col}
            className={
              "border-b border-border px-3 py-2 align-top " +
              stripeBg +
              " " +
              (isEval ? "font-medium text-foreground" : "text-muted-foreground") +
              (isPinned ? " sticky right-0 z-10" : "")
            }
            style={
              isPinned
                ? {
                    right: `${pinnedRightOffsets[col]}px`,
                    width: `${PINNED_CELL_WIDTH_PX}px`,
                    minWidth: `${PINNED_CELL_WIDTH_PX}px`,
                    maxWidth: `${PINNED_CELL_WIDTH_PX}px`,
                  }
                : undefined
            }
            title={value.length > 200 ? value : undefined}
          >
            <div className="max-w-[420px] whitespace-pre-wrap break-words">{value || "—"}</div>
          </td>
        );
      })}
    </tr>
  );
});
