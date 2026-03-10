"use client";

import type React from "react";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";

interface TruncatedMarkdownProps {
  content: string;
  wordLimit?: number;
  className?: string;
}

function isInsideMarkdownSyntax(content: string, position: number): boolean {
  const before = content.substring(0, position);
  const patterns = [
    /\*\*[^*]*$/,
    /__[^_]*$/,
    /\*[^*\s][^*]*$/,
    /_[^_\s][^_]*$/,
    /\[[^\]]*$/,
    /\([^)]*$/,
    /!\[[^\]]*$/,
    /`[^`]*$/,
    /```[\s\S]*$/,
    /#+\s*$/,
  ];
  return patterns.some((p) => p.test(before));
}

function findSafeTruncationPoint(content: string, targetPosition: number): number {
  let position = targetPosition;
  if (position >= content.length) return position;

  if (!isInsideMarkdownSyntax(content, position)) {
    while (position > 0 && !/\s/.test(content[position - 1])) {
      position--;
      if (isInsideMarkdownSyntax(content, position)) break;
    }
    return position;
  }

  while (position > 0) {
    position--;
    if (!isInsideMarkdownSyntax(content, position)) {
      while (position > 0 && !/\s/.test(content[position - 1])) {
        position--;
      }
      break;
    }
    if (position < targetPosition - 100) break;
  }

  return Math.max(0, position);
}

function truncateMarkdown(content: string, wordLimit: number): string {
  if (!content) return "";

  const plainText = content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]+`/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, " ")
    .replace(/[#*_~`>]/g, "")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = plainText.split(/\s+/).filter((w) => w.length > 0);
  if (words.length <= wordLimit) return content;

  const segments = content.split(/(\s+)/);
  let wordCount = 0;
  let charIndex = 0;

  for (const segment of segments) {
    if (segment.trim().length === 0) {
      charIndex += segment.length;
      continue;
    }

    const stripped = segment
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[#*_~`>]/g, "")
      .trim();

    if (stripped.length > 0) {
      const wordsInSeg = stripped.split(/\s+/).filter((w) => w.length > 0);
      wordCount += wordsInSeg.length;
      if (wordCount >= wordLimit) {
        charIndex += segment.length;
        break;
      }
    }
    charIndex += segment.length;
  }

  const safePos = findSafeTruncationPoint(content, charIndex);
  return `${content.substring(0, safePos).trim()}...`;
}

export function TruncatedMarkdown({
  content,
  wordLimit = 25,
  className = "",
}: TruncatedMarkdownProps) {
  if (!content) return null;

  const truncated = truncateMarkdown(content, wordLimit);

  return (
    <div className={className}>
      <MarkdownPreview
        source={truncated}
        components={{
          p: ({ children }: { children?: React.ReactNode }) => (
            <p className="text-muted-foreground mb-0">{children}</p>
          ),
        }}
      />
    </div>
  );
}
