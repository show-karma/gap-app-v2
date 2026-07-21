"use client";

import {
  BlocksIcon,
  BracesIcon,
  DatabaseIcon,
  type LucideIcon,
  NetworkIcon,
  SparklesIcon,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/utilities/tailwind";

type VisualKind = "infrastructure" | "storage" | "developer" | "data" | "generic";

interface ProjectVisualProps {
  uid: string;
  title: string;
  imageUrl?: string | null;
  categories?: string[];
  className?: string;
  priority?: boolean;
  variant?: "square" | "banner" | "fill";
}

interface VisualTheme {
  background: string;
  accent: string;
  secondaryAccent: string;
  icon: LucideIcon;
  label: string;
}

const VISUAL_THEMES: Record<VisualKind, readonly VisualTheme[]> = {
  infrastructure: [
    {
      background: "from-amber-950 via-orange-900 to-slate-950",
      accent: "bg-amber-300",
      secondaryAccent: "border-orange-300",
      icon: BlocksIcon,
      label: "Infrastructure",
    },
    {
      background: "from-slate-950 via-amber-900 to-stone-900",
      accent: "bg-orange-300",
      secondaryAccent: "border-amber-200",
      icon: NetworkIcon,
      label: "Infrastructure",
    },
  ],
  storage: [
    {
      background: "from-sky-950 via-blue-900 to-cyan-800",
      accent: "bg-cyan-300",
      secondaryAccent: "border-sky-200",
      icon: DatabaseIcon,
      label: "Storage",
    },
    {
      background: "from-blue-950 via-indigo-900 to-sky-800",
      accent: "bg-blue-300",
      secondaryAccent: "border-cyan-200",
      icon: BlocksIcon,
      label: "Storage",
    },
  ],
  developer: [
    {
      background: "from-indigo-950 via-violet-900 to-blue-900",
      accent: "bg-violet-300",
      secondaryAccent: "border-indigo-200",
      icon: BracesIcon,
      label: "Developer tools",
    },
    {
      background: "from-slate-950 via-indigo-900 to-purple-900",
      accent: "bg-indigo-300",
      secondaryAccent: "border-violet-200",
      icon: NetworkIcon,
      label: "Developer tools",
    },
  ],
  data: [
    {
      background: "from-cyan-950 via-teal-900 to-slate-900",
      accent: "bg-teal-300",
      secondaryAccent: "border-cyan-200",
      icon: NetworkIcon,
      label: "Data services",
    },
    {
      background: "from-emerald-950 via-cyan-900 to-blue-950",
      accent: "bg-emerald-300",
      secondaryAccent: "border-teal-200",
      icon: DatabaseIcon,
      label: "Data services",
    },
  ],
  generic: [
    {
      background: "from-slate-950 via-blue-950 to-zinc-900",
      accent: "bg-sky-300",
      secondaryAccent: "border-blue-200",
      icon: SparklesIcon,
      label: "Generic",
    },
    {
      background: "from-zinc-950 via-slate-900 to-cyan-950",
      accent: "bg-cyan-300",
      secondaryAccent: "border-slate-200",
      icon: BlocksIcon,
      label: "Generic",
    },
  ],
};

const SHAPE_POSITIONS = [
  {
    primary: "-right-8 -top-8",
    secondary: "bottom-5 left-5 rotate-12",
    icon: "right-5 bottom-5",
  },
  {
    primary: "-bottom-10 -left-8",
    secondary: "right-6 top-5 -rotate-12",
    icon: "left-5 top-5",
  },
  {
    primary: "-right-12 bottom-3",
    secondary: "left-8 top-8 rotate-45",
    icon: "right-6 top-6",
  },
] as const;

const VISUAL_KIND_KEYWORDS: ReadonlyArray<{
  kind: Exclude<VisualKind, "generic">;
  keywords: readonly string[];
}> = [
  {
    kind: "storage",
    keywords: ["storage", "retrieval", "archive", "archival", "file", "files", "filecoin"],
  },
  {
    kind: "developer",
    keywords: [
      "developer",
      "developers",
      "tool",
      "tools",
      "sdk",
      "api",
      "software",
      "application",
      "applications",
    ],
  },
  {
    kind: "data",
    keywords: [
      "data",
      "analytics",
      "research",
      "index",
      "indexer",
      "indexing",
      "ai",
      "intelligence",
      "model",
      "models",
    ],
  },
  {
    kind: "infrastructure",
    keywords: [
      "infrastructure",
      "protocol",
      "network",
      "node",
      "nodes",
      "security",
      "hardware",
      "miner",
      "mining",
    ],
  },
];

function stableHash(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function getVisualKind(categories: string[], title: string): VisualKind {
  const words = new Set(`${categories.join(" ")} ${title}`.toLowerCase().match(/[a-z0-9]+/g));

  for (const { kind, keywords } of VISUAL_KIND_KEYWORDS) {
    if (keywords.some((keyword) => words.has(keyword))) return kind;
  }

  return "generic";
}

function isUsableImageUrl(imageUrl?: string | null): imageUrl is string {
  if (!imageUrl) return false;
  if (imageUrl.startsWith("/") && !imageUrl.startsWith("//")) return true;
  try {
    const parsedUrl = new URL(imageUrl);
    return parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
}

export function ProjectVisual({
  uid,
  title,
  imageUrl,
  categories = [],
  className,
  priority = false,
  variant = "square",
}: ProjectVisualProps) {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const seed = stableHash(uid || title);
  const kind = getVisualKind(categories, title);
  const themes = VISUAL_THEMES[kind];
  const theme = themes[seed % themes.length];
  const shapePosition = SHAPE_POSITIONS[seed % SHAPE_POSITIONS.length];
  const hasProjectImage = isUsableImageUrl(imageUrl) && failedImageUrl !== imageUrl;
  const Icon = theme.icon;
  const artworkLabel = `${theme.label} project artwork`;

  const visualSource = hasProjectImage ? "logo" : kind === "generic" ? "generic" : "category";
  const initials = title
    .split(/\s+/)
    .map((word) => word.replace(/[^a-z0-9]/gi, ""))
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return (
    <div
      data-testid="project-visual"
      data-visual-source={visualSource}
      aria-label={hasProjectImage ? title : artworkLabel}
      role="img"
      className={cn(
        "relative isolate overflow-hidden bg-gradient-to-br",
        theme.background,
        variant === "square" ? "aspect-square" : variant === "fill" ? "h-full" : "h-full min-h-64",
        className
      )}
    >
      <div
        aria-hidden
        className={cn(
          "absolute size-40 rounded-full opacity-30 blur-3xl",
          theme.accent,
          shapePosition.primary
        )}
      />
      <div
        aria-hidden
        className={cn(
          "absolute size-20 rounded-2xl border-2 opacity-25",
          theme.secondaryAccent,
          shapePosition.secondary
        )}
      />
      <Icon
        aria-hidden
        className={cn(
          "absolute size-20 text-white opacity-15",
          variant === "banner" && "size-28",
          shapePosition.icon
        )}
        strokeWidth={1}
      />

      {hasProjectImage ? (
        <div className="absolute inset-0 flex items-center justify-center p-5 sm:p-7">
          <div className="relative size-full max-h-40 max-w-40 overflow-hidden rounded-2xl border border-white/60 bg-white/95 shadow-2xl shadow-black/30">
            <Image
              data-testid="project-logo"
              src={imageUrl}
              alt=""
              aria-hidden
              fill
              priority={priority}
              sizes={variant === "banner" ? "(min-width: 1024px) 32vw, 70vw" : "160px"}
              className="object-contain p-3"
              onError={() => setFailedImageUrl(imageUrl)}
            />
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-body text-3xl font-semibold tracking-tight text-white/90 sm:text-4xl">
            {initials || "K"}
          </span>
        </div>
      )}
    </div>
  );
}
