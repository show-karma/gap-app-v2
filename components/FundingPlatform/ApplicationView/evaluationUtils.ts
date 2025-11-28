import { CheckCircleIcon, ExclamationTriangleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import React, { type JSX } from "react";

export type GenericJSON = Record<string, unknown>;

/**
 * Parses an evaluation JSON string into a GenericJSON object.
 * Returns null if parsing fails.
 *
 * @param evaluationStr - The JSON string to parse
 * @returns Parsed JSON object or null if parsing fails
 */
export function parseEvaluation(evaluationStr: string): GenericJSON | null {
  try {
    return JSON.parse(evaluationStr);
  } catch (error) {
    console.error("Failed to parse evaluation JSON:", error);
    return null;
  }
}

/**
 * Returns the CSS class for score-based background color.
 *
 * @param score - The evaluation score (0-10)
 * @returns CSS class string for background color
 */
export function getScoreColor(score: number): string {
  if (score > 7) return "bg-green-500";
  if (score >= 4) return "bg-yellow-500";
  return "bg-red-500";
}

/**
 * Returns an icon component based on the evaluation score.
 *
 * @param score - The evaluation score (0-10)
 * @returns JSX element with appropriate icon
 */
export function getScoreIcon(score: number): JSX.Element {
  if (score > 7)
    return React.createElement(CheckCircleIcon, { className: "w-5 h-5 text-green-500" });
  if (score >= 4)
    return React.createElement(ExclamationTriangleIcon, { className: "w-5 h-5 text-blue-500" });
  return React.createElement(XMarkIcon, { className: "w-5 h-5 text-red-500" });
}

/**
 * Returns the CSS class for priority-based badge color.
 *
 * @param priority - The priority level (high, medium, low)
 * @returns CSS class string for badge color
 */
export function getPriorityColor(priority: string): string {
  const defaultColor = "bg-zinc-100 dark:bg-zinc-700 text-gray-800 dark:text-gray-200";
  if (!priority) return defaultColor;

  const colorMap: Record<string, string> = {
    high: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300",
    medium: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300",
    low: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300",
  };

  return colorMap[priority.toLowerCase()] || defaultColor;
}

/**
 * Returns the CSS class for status-based badge color.
 *
 * @param status - The evaluation status (complete, incomplete, rejected)
 * @returns CSS class string for badge color
 */
export function getStatusColor(status: string): string {
  const defaultColor = "bg-zinc-100 dark:bg-zinc-700 text-gray-800 dark:text-gray-200";
  if (!status) return defaultColor;

  const colorMap: Record<string, string> = {
    complete: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300",
    incomplete: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300",
    rejected: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300",
  };

  return colorMap[status.toLowerCase()] || defaultColor;
}
