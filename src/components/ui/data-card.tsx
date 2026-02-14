import type { HTMLAttributes } from "react";
import { cn } from "@/utilities/tailwind";

// Lightweight replacements for @tremor/react layout components (Card, Title, Text, Metric, Grid).
// These match the visual output of Tremor while eliminating the heavy bundle dependency
// for non-chart usage.

export interface DataCardProps extends HTMLAttributes<HTMLDivElement> {}

export function DataCard({ className, children, ...props }: DataCardProps) {
  return (
    <div
      className={cn(
        "rounded-tremor-default border border-tremor-border p-4 shadow-tremor-card dark:border-dark-tremor-border dark:shadow-dark-tremor-card",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface DataTitleProps extends HTMLAttributes<HTMLParagraphElement> {}

export function DataTitle({ className, children, ...props }: DataTitleProps) {
  return (
    <p
      className={cn(
        "font-semibold text-tremor-content-strong dark:text-dark-tremor-content-strong text-tremor-title",
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}

export interface DataTextProps extends HTMLAttributes<HTMLParagraphElement> {}

export function DataText({ className, children, ...props }: DataTextProps) {
  return (
    <p
      className={cn(
        "text-tremor-default text-tremor-content dark:text-dark-tremor-content",
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}

export interface DataMetricProps extends HTMLAttributes<HTMLParagraphElement> {}

export function DataMetric({ className, children, ...props }: DataMetricProps) {
  return (
    <p
      className={cn(
        "font-semibold text-tremor-metric text-tremor-content-strong dark:text-dark-tremor-content-strong",
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}

export interface DataGridProps extends HTMLAttributes<HTMLDivElement> {
  numItems?: number;
  numItemsLg?: number;
}

export function DataGrid({
  children,
  className,
  numItems = 1,
  numItemsLg,
  ...props
}: DataGridProps) {
  const gridColsMap: Record<number, string> = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
    5: "grid-cols-5",
    6: "grid-cols-6",
  };

  const lgGridColsMap: Record<number, string> = {
    1: "lg:grid-cols-1",
    2: "lg:grid-cols-2",
    3: "lg:grid-cols-3",
    4: "lg:grid-cols-4",
    5: "lg:grid-cols-5",
    6: "lg:grid-cols-6",
  };

  return (
    <div
      className={cn(
        "grid",
        gridColsMap[numItems] || "grid-cols-1",
        numItemsLg ? lgGridColsMap[numItemsLg] || "" : "",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
