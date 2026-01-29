"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { type ReactNode, useCallback, useMemo, useRef } from "react";
import { cn } from "@/utilities/tailwind";

/**
 * Column definition for the VirtualizedTable component
 */
export interface VirtualizedTableColumn<T> {
  /** Unique identifier for the column */
  id: string;
  /** Header content - can be a string or ReactNode */
  header: ReactNode;
  /** Accessor function to get the cell value from the row data */
  accessor?: (row: T, index: number) => ReactNode;
  /** Cell renderer function - takes precedence over accessor */
  cell?: (row: T, index: number) => ReactNode;
  /** Column width - can be a number (px) or CSS string */
  width?: number | string;
  /** Minimum column width */
  minWidth?: number | string;
  /** Maximum column width */
  maxWidth?: number | string;
  /** Additional className for the column header */
  headerClassName?: string;
  /** Additional className for the column cells */
  cellClassName?: string;
}

/**
 * Props for the VirtualizedTable component
 */
export interface VirtualizedTableProps<T> {
  /** Array of data items to display in the table */
  data: T[];
  /** Column definitions */
  columns: VirtualizedTableColumn<T>[];
  /** Height of each row in pixels (default: 48) */
  rowHeight?: number;
  /** Fixed height of the scrollable container in pixels (default: 400) */
  containerHeight?: number;
  /** Number of extra rows to render outside the visible area for smooth scrolling (default: 5) */
  overscan?: number;
  /** Custom row renderer - overrides default row rendering */
  renderRow?: (item: T, index: number) => ReactNode;
  /** Function to generate a unique key for each row */
  getRowKey?: (item: T, index: number) => string | number;
  /** Additional className for the container */
  className?: string;
  /** Additional className for the table */
  tableClassName?: string;
  /** Additional className for the header row */
  headerClassName?: string;
  /** Additional className for each body row */
  rowClassName?: string | ((item: T, index: number) => string);
  /** Accessible label for the table */
  ariaLabel?: string;
  /** Show loading state */
  isLoading?: boolean;
  /** Custom loading component */
  loadingComponent?: ReactNode;
  /** Message to show when data is empty */
  emptyMessage?: string;
  /** Custom empty state component */
  emptyComponent?: ReactNode;
  /** Callback when a row is clicked */
  onRowClick?: (item: T, index: number) => void;
  /** Whether rows are clickable (adds hover styles) */
  clickableRows?: boolean;
  /** Sticky header (default: true) */
  stickyHeader?: boolean;
}

/**
 * Converts a size value to a CSS string
 */
function toCssSize(value: number | string): string {
  return typeof value === "number" ? `${value}px` : value;
}

/**
 * Creates column style object from column definition
 */
function createColumnStyle<T>(column: VirtualizedTableColumn<T>): React.CSSProperties {
  const style: React.CSSProperties = {};
  if (column.width) {
    style.width = toCssSize(column.width);
  }
  if (column.minWidth) {
    style.minWidth = toCssSize(column.minWidth);
  }
  if (column.maxWidth) {
    style.maxWidth = toCssSize(column.maxWidth);
  }
  return style;
}

/**
 * A virtualized table component that efficiently renders large datasets
 * by only rendering visible rows plus a configurable overscan.
 *
 * Uses @tanstack/react-virtual for virtualization while preserving
 * semantic table structure (thead, tbody, tr, td) for accessibility.
 *
 * @example
 * ```tsx
 * const columns = [
 *   { id: 'name', header: 'Name', accessor: (row) => row.name },
 *   { id: 'value', header: 'Value', cell: (row) => <strong>{row.value}</strong> },
 * ];
 *
 * <VirtualizedTable
 *   data={datapoints}
 *   columns={columns}
 *   rowHeight={48}
 *   containerHeight={400}
 *   overscan={5}
 * />
 * ```
 */
export function VirtualizedTable<T>({
  data,
  columns,
  rowHeight = 48,
  containerHeight = 400,
  overscan = 5,
  renderRow,
  getRowKey,
  className,
  tableClassName,
  headerClassName,
  rowClassName,
  ariaLabel,
  isLoading = false,
  loadingComponent,
  emptyMessage = "No data available",
  emptyComponent,
  onRowClick,
  clickableRows = false,
  stickyHeader = true,
}: VirtualizedTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  const getKey = useCallback(
    (item: T, index: number): string | number => {
      if (getRowKey) {
        return getRowKey(item, index);
      }
      // Try common key patterns
      const itemWithId = item as {
        id?: string | number;
        uid?: string | number;
        key?: string | number;
      };
      if (itemWithId.id !== undefined) return itemWithId.id;
      if (itemWithId.uid !== undefined) return itemWithId.uid;
      if (itemWithId.key !== undefined) return itemWithId.key;
      return index;
    },
    [getRowKey]
  );

  const getRowClassName = useCallback(
    (item: T, index: number): string => {
      if (typeof rowClassName === "function") {
        return rowClassName(item, index);
      }
      return rowClassName || "";
    },
    [rowClassName]
  );

  const columnStyles = useMemo(() => columns.map((column) => createColumnStyle(column)), [columns]);

  const handleKeyDown = useCallback(
    (item: T, index: number) => (e: React.KeyboardEvent) => {
      if (onRowClick && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        onRowClick(item, index);
      }
    },
    [onRowClick]
  );

  // Loading state
  if (isLoading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md",
          className
        )}
        style={{ height: containerHeight }}
        aria-busy="true"
      >
        {loadingComponent || (
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-zinc-100" />
            <span className="text-sm text-gray-500 dark:text-zinc-400">Loading...</span>
          </div>
        )}
      </div>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md",
          className
        )}
        style={{ height: containerHeight }}
      >
        {emptyComponent || (
          <p className="text-sm text-gray-500 dark:text-zinc-400">{emptyMessage}</p>
        )}
      </div>
    );
  }

  const rowInteractionProps = onRowClick
    ? {
        role: "button" as const,
        tabIndex: 0,
      }
    : {};

  return (
    <div
      ref={parentRef}
      className={cn(
        "overflow-auto bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md",
        className
      )}
      style={{ height: containerHeight }}
    >
      <table
        className={cn("min-w-full divide-y divide-gray-200 dark:divide-zinc-700", tableClassName)}
        aria-label={ariaLabel}
      >
        <thead
          className={cn(
            "bg-gray-50 dark:bg-zinc-800",
            stickyHeader && "sticky top-0 z-10",
            headerClassName
          )}
        >
          <tr>
            {columns.map((column, colIndex) => (
              <th
                key={column.id}
                scope="col"
                className={cn(
                  "px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider",
                  column.headerClassName
                )}
                style={columnStyles[colIndex]}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody
          className="divide-y divide-gray-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900"
          style={{
            height: totalSize,
            position: "relative",
          }}
        >
          {virtualItems.map((virtualRow) => {
            const item = data[virtualRow.index];
            const index = virtualRow.index;
            const key = getKey(item, index);
            const rowStyle = {
              position: "absolute" as const,
              top: 0,
              left: 0,
              width: "100%",
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            };
            const rowClasses = cn(
              getRowClassName(item, index),
              (clickableRows || onRowClick) &&
                "cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800"
            );

            // Custom row renderer takes precedence
            if (renderRow) {
              return (
                <tr
                  key={key}
                  data-index={index}
                  style={rowStyle}
                  className={rowClasses}
                  onClick={onRowClick ? () => onRowClick(item, index) : undefined}
                  onKeyDown={onRowClick ? handleKeyDown(item, index) : undefined}
                  {...rowInteractionProps}
                >
                  {renderRow(item, index)}
                </tr>
              );
            }

            // Default column-based rendering
            return (
              <tr
                key={key}
                data-index={index}
                style={{ ...rowStyle, display: "table-row" }}
                className={rowClasses}
                onClick={onRowClick ? () => onRowClick(item, index) : undefined}
                onKeyDown={onRowClick ? handleKeyDown(item, index) : undefined}
                {...rowInteractionProps}
              >
                {columns.map((column, colIndex) => (
                  <td
                    key={column.id}
                    className={cn(
                      "px-3 py-2 text-sm text-gray-900 dark:text-zinc-100",
                      column.cellClassName
                    )}
                    style={columnStyles[colIndex]}
                  >
                    {column.cell
                      ? column.cell(item, index)
                      : column.accessor
                        ? column.accessor(item, index)
                        : null}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default VirtualizedTable;
