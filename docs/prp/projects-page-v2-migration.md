# PRP: Projects Explorer Page V2 Migration

## Overview

Migrate the `/projects` page from V1 patterns to V2 architecture, implement design changes from provided mockups, and filter out test projects.

**Status**: IMPLEMENTED
**Priority**: High

---

## Requirements

1. **Migrate to V2**: Use existing V2 project search service (`/v2/projects` endpoint)
2. **Hide Test Projects**: Filter out projects with 'test' in their name
3. **Design Changes**: Implement new header and explorer layout per mockups

---

## Current State Analysis

### Frontend Architecture (V1 Pattern)
```
app/projects/page.tsx
└── <NewProjectsPage /> [components/Pages/NewProjects/index.tsx]
    ├── Sort dropdown (Headlessui Listbox)
    ├── <InfiniteScroll>
    │   └── <react-virtualized Grid>
    │       └── <ProjectCard />
    └── <ProjectCardListSkeleton />
```

### Data Flow (V1)
- `utilities/indexer/getExplorerProjects.ts` → `fetchData()` → `/projects/list` (V1 endpoint)
- Uses offset-based pagination with infinite scroll
- 12 items per page

### Existing V2 Service
- **Endpoint**: `GET /v2/projects?q=query&limit=50`
- **Service**: `services/project-search.service.ts` → `searchProjects(query, limit)`
- **Hook**: `hooks/useProjectSearch.ts` (uses unified search, different purpose)
- **Limit**: 1-50 items (default 10)

---

## Target State

### New Component Architecture
```
app/projects/page.tsx (Server Component)
├── <ProjectsHeroSection /> (NEW - from design image 1)
└── <Suspense>
    └── <ProjectsExplorer /> (Client Component)
        ├── <ProjectsHeader />
        │   ├── "Browse projects" title
        │   └── <ProjectsSearchBar /> (NEW)
        └── <ProjectsGrid />
            └── <ProjectCard /> (updated)
```

### Data Flow (V2)
```
useProjectsExplorer hook
  → QUERY_KEYS.PROJECTS.EXPLORER(search)
  → services/projects-explorer.service.ts
    → INDEXER.V2.PROJECTS.LIST(limit) or .SEARCH(query, limit)
    → Filter test projects client-side
```

---

## Implementation Plan

### Phase 1: Infrastructure Setup

#### Task 1.1: Add Query Keys

**File**: `gap-app-v2/utilities/queryKeys.ts`

Add to existing QUERY_KEYS:
```typescript
PROJECTS: {
  ...existing,
  EXPLORER: (search?: string) => ["projects-explorer", search] as const,
  EXPLORER_BASE: ["projects-explorer"] as const,
},
```

#### Task 1.2: Add Constants

**File**: `gap-app-v2/constants/projects-explorer.ts` (NEW)

```typescript
/**
 * Projects Explorer Constants
 * Configuration for the /projects page functionality
 */
export const PROJECTS_EXPLORER_CONSTANTS = {
  /** Maximum results to fetch */
  RESULT_LIMIT: 50,

  /** Debounce delay for search input in milliseconds */
  DEBOUNCE_DELAY_MS: 300,

  /** Minimum characters before triggering search */
  MIN_SEARCH_LENGTH: 3,

  /** Stale time for cache in milliseconds (1 minute) */
  STALE_TIME_MS: 60 * 1000,

  /** Items per row on different breakpoints */
  GRID_COLUMNS: {
    SM: 1,
    MD: 2,
    LG: 3,
    XL: 4,
  },
} as const;
```

#### Task 1.3: Update INDEXER (if needed)

**File**: `gap-app-v2/utilities/indexer.ts`

Verify existing endpoint works for listing without search query:
```typescript
V2: {
  PROJECTS: {
    // Existing - works when q is empty string
    SEARCH: (query: string, limit?: number) =>
      `/v2/projects?q=${encodeURIComponent(query)}${limit ? `&limit=${limit}` : ""}`,
    // Add explicit LIST if backend supports different behavior
    LIST: (limit?: number) =>
      `/v2/projects${limit ? `?limit=${limit}` : ""}`,
  }
}
```

---

### Phase 2: Service Layer

#### Task 2.1: Create Projects Explorer Service

**File**: `gap-app-v2/services/projects-explorer.service.ts` (NEW)

```typescript
import { errorManager } from "@/components/Utilities/errorManager";
import type { Project as ProjectResponse } from "@/types/v2/project";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { PROJECTS_EXPLORER_CONSTANTS } from "@/constants/projects-explorer";

export interface ExplorerProjectsParams {
  search?: string;
  limit?: number;
}

/**
 * Filter out test projects from results
 * Projects with 'test' (case-insensitive) in title are excluded
 */
const filterTestProjects = (projects: ProjectResponse[]): ProjectResponse[] => {
  return projects.filter(
    (project) => !project.details?.title?.toLowerCase().includes("test")
  );
};

/**
 * Fetch projects for the explorer page using V2 API
 * Automatically filters out test projects
 *
 * @param params - Search parameters
 * @returns Filtered list of projects
 */
export const getExplorerProjects = async (
  params: ExplorerProjectsParams = {}
): Promise<ProjectResponse[]> => {
  const { search = "", limit = PROJECTS_EXPLORER_CONSTANTS.RESULT_LIMIT } = params;

  const endpoint = INDEXER.V2.PROJECTS.SEARCH(search, limit);

  const [data, error] = await fetchData<ProjectResponse[]>(endpoint);

  if (error || !data) {
    errorManager("Failed to fetch explorer projects", error, {
      context: "projects-explorer.service",
      search,
      limit,
    });
    return [];
  }

  return filterTestProjects(data);
};
```

---

### Phase 3: Hook Layer

#### Task 3.1: Create Projects Explorer Hook

**File**: `gap-app-v2/hooks/useProjectsExplorer.ts` (NEW)

```typescript
import { useQuery } from "@tanstack/react-query";
import { getExplorerProjects } from "@/services/projects-explorer.service";
import { defaultQueryOptions } from "@/utilities/queries/defaultOptions";
import { QUERY_KEYS } from "@/utilities/queryKeys";
import { PROJECTS_EXPLORER_CONSTANTS } from "@/constants/projects-explorer";

interface UseProjectsExplorerOptions {
  search?: string;
  enabled?: boolean;
}

/**
 * Hook to fetch projects for the explorer page.
 * Uses V2 API with automatic test project filtering.
 *
 * @param options - Configuration options
 * @returns Query result with projects data
 *
 * @example
 * ```tsx
 * const { projects, isLoading } = useProjectsExplorer({ search: 'dao' });
 * ```
 */
export const useProjectsExplorer = (options: UseProjectsExplorerOptions = {}) => {
  const { search = "", enabled = true } = options;

  const shouldSearch = search.length >= PROJECTS_EXPLORER_CONSTANTS.MIN_SEARCH_LENGTH;

  const query = useQuery({
    ...defaultQueryOptions,
    queryKey: QUERY_KEYS.PROJECTS.EXPLORER(search),
    queryFn: () => getExplorerProjects({ search: shouldSearch ? search : "" }),
    enabled,
    staleTime: PROJECTS_EXPLORER_CONSTANTS.STALE_TIME_MS,
  });

  return {
    projects: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};
```

---

### Phase 4: UI Components

#### Task 4.1: Create Hero Section

**File**: `gap-app-v2/components/Pages/Projects/HeroSection.tsx` (NEW)

Based on design Image 1:
- Row of 6 colorful emoji icons
- Blue tagline: "Show your work. Build your rep. Earn trust onchain"
- Large title: "Projects on Karma GAP"
- Subtitle describing the platform
- Two CTAs: "Explore Projects" (outline) + "Create Project" (primary)
- "Are you a grant operator? Click here" link

```typescript
import Link from "next/link";
import { PAGES } from "@/utilities/pages";
import { Button } from "@/components/Utilities/Button";

const HERO_ICONS = ["💜", "🤝", "💵", "📬", "👍", "🔗"];

export const ProjectsHeroSection = () => {
  return (
    <section className="relative flex flex-col items-center justify-center py-16 px-4">
      {/* Icon row */}
      <div className="flex gap-3 mb-6">
        {HERO_ICONS.map((icon, i) => (
          <span
            key={i}
            className="text-2xl bg-gray-50 dark:bg-zinc-800 p-3 rounded-full"
          >
            {icon}
          </span>
        ))}
      </div>

      {/* Tagline */}
      <p className="text-blue-600 dark:text-blue-400 text-sm font-medium mb-4">
        Show your work. Build your rep. Earn trust onchain
      </p>

      {/* Title */}
      <h1 className="text-4xl md:text-5xl font-bold text-center text-black dark:text-white mb-4">
        Projects on Karma GAP
      </h1>

      {/* Subtitle */}
      <p className="text-gray-600 dark:text-gray-400 text-center max-w-2xl mb-8">
        Track milestones, grow reputation, and connect with funders
        using the Grantee Accountability Protocol.
      </p>

      {/* Buttons */}
      <div className="flex gap-4 mb-4">
        <a
          href="#browse-projects"
          className="px-6 py-3 border border-gray-300 dark:border-zinc-600 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
        >
          Explore Projects
        </a>
        <Link href={PAGES.PROJECT.NEW || "/project/new"}>
          <Button className="px-6 py-3">Create Project</Button>
        </Link>
      </div>

      {/* Grant operator link */}
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Are you a <span className="font-semibold">grant operator</span>?{" "}
        <Link href={PAGES.REGISTRY.ADD_PROGRAM} className="text-blue-600 hover:underline">
          Click here
        </Link>
      </p>
    </section>
  );
};
```

#### Task 4.2: Create Search Bar Component

**File**: `gap-app-v2/components/Pages/Projects/SearchBar.tsx` (NEW)

```typescript
"use client";

import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useState, useEffect } from "react";
import { useDebouncedCallback } from "use-debounce";
import { PROJECTS_EXPLORER_CONSTANTS } from "@/constants/projects-explorer";

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  initialValue?: string;
}

export const ProjectsSearchBar = ({
  onSearch,
  placeholder = "Search our Projects",
  initialValue = "",
}: SearchBarProps) => {
  const [value, setValue] = useState(initialValue);

  const debouncedSearch = useDebouncedCallback((searchValue: string) => {
    onSearch(searchValue);
  }, PROJECTS_EXPLORER_CONSTANTS.DEBOUNCE_DELAY_MS);

  useEffect(() => {
    debouncedSearch(value);
  }, [value, debouncedSearch]);

  return (
    <div className="relative flex items-center w-full max-w-md">
      <MagnifyingGlassIcon className="absolute left-3 h-5 w-5 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  );
};
```

#### Task 4.3: Create Projects Explorer Component

**File**: `gap-app-v2/components/Pages/Projects/ProjectsExplorer.tsx` (NEW)

```typescript
"use client";

import { useState } from "react";
import { useProjectsExplorer } from "@/hooks/useProjectsExplorer";
import { ProjectsSearchBar } from "./SearchBar";
import { ProjectCard } from "./ProjectCard";
import { ProjectsLoading } from "./Loading";

export const ProjectsExplorer = () => {
  const [search, setSearch] = useState("");
  const { projects, isLoading, isError } = useProjectsExplorer({ search });

  return (
    <section id="browse-projects" className="w-full max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h2 className="text-2xl font-bold text-black dark:text-white">
          Browse projects
        </h2>
        <ProjectsSearchBar onSearch={setSearch} />
      </div>

      {/* Grid */}
      {isLoading ? (
        <ProjectsLoading />
      ) : isError ? (
        <div className="text-center py-12 text-gray-500">
          Failed to load projects. Please try again.
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {search ? `No projects found for "${search}"` : "No projects available"}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {projects.map((project, index) => (
            <ProjectCard key={project.uid} project={project} index={index} />
          ))}
        </div>
      )}
    </section>
  );
};
```

#### Task 4.4: Create/Update Project Card Component

**File**: `gap-app-v2/components/Pages/Projects/ProjectCard.tsx` (NEW or update existing)

Based on design Image 2:
- Colored top border (rotating colors)
- Project title (bold)
- Organization/sponsor name
- Creation date
- Description (truncated)
- Stats badges: grants received, milestones, roadmap items

```typescript
import Image from "next/image";
import Link from "next/link";
import type { Project } from "@/types/v2/project";
import { PAGES } from "@/utilities/pages";
import { formatDate } from "@/utilities/formatDate";

interface ProjectCardProps {
  project: Project;
  index: number;
}

const CARD_COLORS = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-red-500",
  "bg-orange-500",
  "bg-yellow-500",
  "bg-green-500",
  "bg-teal-500",
  "bg-cyan-500",
  "bg-indigo-500",
];

export const ProjectCard = ({ project, index }: ProjectCardProps) => {
  const colorClass = CARD_COLORS[index % CARD_COLORS.length];
  const { details, createdAt } = project;

  return (
    <Link href={PAGES.PROJECT.OVERVIEW(details.slug)}>
      <div className="border border-gray-200 dark:border-zinc-700 rounded-lg overflow-hidden hover:shadow-lg transition-shadow bg-white dark:bg-zinc-900">
        {/* Colored top bar */}
        <div className={`h-2 ${colorClass}`} />

        <div className="p-4">
          {/* Logo + Title row */}
          <div className="flex items-center gap-3 mb-2">
            {details.logoUrl ? (
              <Image
                src={details.logoUrl}
                alt={details.title}
                width={40}
                height={40}
                className="rounded-full object-cover"
              />
            ) : (
              <div className={`w-10 h-10 rounded-full ${colorClass} flex items-center justify-center text-white font-bold`}>
                {details.title?.charAt(0)?.toUpperCase() || "P"}
              </div>
            )}
            <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1 flex-1">
              {details.title}
            </h3>
          </div>

          {/* Date */}
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Created on {formatDate(createdAt)}
          </p>

          {/* Description */}
          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 mb-4">
            {details.description || details.missionSummary || "No description available"}
          </p>

          {/* Stats - will need actual data from API */}
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-zinc-800 rounded-full text-gray-600 dark:text-gray-400">
              0 grants received
            </span>
            <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-zinc-800 rounded-full text-gray-600 dark:text-gray-400">
              0 Milestones
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};
```

#### Task 4.5: Create Loading Component

**File**: `gap-app-v2/components/Pages/Projects/Loading.tsx` (NEW)

```typescript
export const ProjectsLoading = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="border border-gray-200 dark:border-zinc-700 rounded-lg overflow-hidden bg-white dark:bg-zinc-900 animate-pulse"
        >
          <div className="h-2 bg-gray-200 dark:bg-zinc-700" />
          <div className="p-4">
            <div className="h-5 bg-gray-200 dark:bg-zinc-700 rounded mb-2 w-3/4" />
            <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded mb-3 w-1/2" />
            <div className="space-y-2 mb-4">
              <div className="h-3 bg-gray-200 dark:bg-zinc-700 rounded" />
              <div className="h-3 bg-gray-200 dark:bg-zinc-700 rounded w-5/6" />
            </div>
            <div className="flex gap-2">
              <div className="h-6 bg-gray-200 dark:bg-zinc-700 rounded-full w-24" />
              <div className="h-6 bg-gray-200 dark:bg-zinc-700 rounded-full w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
```

---

### Phase 5: Page Integration

#### Task 5.1: Update Page Entry Point

**File**: `gap-app-v2/app/projects/page.tsx`

```typescript
import { Suspense } from "react";
import { ProjectsHeroSection } from "@/components/Pages/Projects/HeroSection";
import { ProjectsExplorer } from "@/components/Pages/Projects/ProjectsExplorer";
import { ProjectsLoading } from "@/components/Pages/Projects/Loading";
import { customMetadata } from "@/utilities/meta";

export const metadata = customMetadata({
  title: "Explore Projects | Karma GAP",
  description:
    "Thousands of projects utilize Karma GAP to track their grants, share project progress and build reputation. Explore projects making a difference.",
});

export default function Projects() {
  return (
    <div className="flex flex-col w-full">
      <ProjectsHeroSection />
      <Suspense fallback={<ProjectsLoading />}>
        <ProjectsExplorer />
      </Suspense>
    </div>
  );
}
```

---

## File Changes Summary

### New Files
| File | Purpose |
|------|---------|
| `constants/projects-explorer.ts` | Configuration constants |
| `services/projects-explorer.service.ts` | V2 data fetching with test filtering |
| `hooks/useProjectsExplorer.ts` | React Query hook |
| `components/Pages/Projects/HeroSection.tsx` | Hero section (Image 1) |
| `components/Pages/Projects/SearchBar.tsx` | Search input component |
| `components/Pages/Projects/ProjectsExplorer.tsx` | Main explorer container |
| `components/Pages/Projects/ProjectCard.tsx` | Updated card design (Image 2) |
| `components/Pages/Projects/Loading.tsx` | Loading skeleton |

### Modified Files
| File | Changes |
|------|---------|
| `utilities/queryKeys.ts` | Add PROJECTS.EXPLORER keys |
| `app/projects/page.tsx` | New layout with hero + explorer |

### Deprecated (remove after migration)
| File | Reason |
|------|--------|
| `components/Pages/NewProjects/*` | Replaced by new components |
| `utilities/indexer/getExplorerProjects.ts` | V1 endpoint, replaced by service |

---

## Migration Checklist

### Infrastructure
- [ ] Add `QUERY_KEYS.PROJECTS.EXPLORER` to `utilities/queryKeys.ts`
- [ ] Create `constants/projects-explorer.ts`
- [ ] Verify `INDEXER.V2.PROJECTS.SEARCH` works for listing (empty query)

### Service Layer
- [ ] Create `services/projects-explorer.service.ts`
- [ ] Implement test project filtering

### Hook Layer
- [ ] Create `hooks/useProjectsExplorer.ts`

### UI Components
- [ ] Create `components/Pages/Projects/HeroSection.tsx`
- [ ] Create `components/Pages/Projects/SearchBar.tsx`
- [ ] Create `components/Pages/Projects/ProjectsExplorer.tsx`
- [ ] Create `components/Pages/Projects/ProjectCard.tsx`
- [ ] Create `components/Pages/Projects/Loading.tsx`

### Page Integration
- [ ] Update `app/projects/page.tsx`

### Testing & QA
- [ ] Verify test projects are hidden
- [ ] Test search functionality (debounce, min chars)
- [ ] Responsive testing (1/2/3/4 columns)
- [ ] Dark mode testing
- [ ] Accessibility testing

### Cleanup
- [ ] Remove deprecated NewProjects components
- [ ] Remove `utilities/indexer/getExplorerProjects.ts`
