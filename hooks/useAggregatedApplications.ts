"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { BrowseApplicationStatusFilter } from "@/hooks/useBrowseApplicationFilters";
import type { Application, ApplicationStatus } from "@/types/whitelabel-entities";
import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";

/** The applications API rejects a `limit` above 100. */
const APPLICATIONS_PAGE_LIMIT = 100;

/** The community projects API rejects a `limit` above 1000. */
const TRACK_PROJECTS_PAGE_LIMIT = 1000;

interface ApplicationsPage {
  applications: Application[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

interface TrackProjectsPage {
  payload: { uid: string }[];
  pagination: { totalPages: number };
}

/** The subset of a program this hook needs to decide whether to read it. */
export interface ApplicationProgram {
  programId: string;
  applicationConfig?: {
    formSchema?: { settings?: { privateApplications?: boolean } | null } | null;
  } | null;
}

type ApplicationChipCounts = Record<ApplicationStatus | "all", number>;

const emptyChipCounts = (): ApplicationChipCounts => ({
  all: 0,
  pending: 0,
  under_review: 0,
  revision_requested: 0,
  approved: 0,
  rejected: 0,
  resubmitted: 0,
  draft: 0,
});

interface UseAggregatedApplicationsOptions {
  /** Route slug of the community. */
  communityId: string;
  /** Off on the per-program path; nothing is fetched. */
  enabled: boolean;
  /** `null` reads every public program of the community. */
  programId: string | null;
  /** `null` applies no track narrowing. */
  trackId: string | null;
  /** From `useProgramsWithConfig`. */
  programs: ApplicationProgram[];
  status: BrowseApplicationStatusFilter;
  search: string;
  /** How a row's project name is read, so filtering matches what is rendered. */
  getTitle: (application: Application) => string;
}

interface UseAggregatedApplicationsResult {
  /** Status and search already applied, client-side. */
  applications: Application[];
  /** `applications.length`. */
  totalCount: number;
  /** Counted over the loaded set, before status and search narrow it. */
  chipCounts: ApplicationChipCounts;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

const isPublicProgram = (program: ApplicationProgram) =>
  !program.applicationConfig?.formSchema?.settings?.privateApplications;

/**
 * Every project UID in a track, across every page of the community projects
 * endpoint. Program scoping is deliberately NOT applied here: the applications
 * are scoped by program themselves (see `useAggregatedApplications`), which
 * sidesteps any mismatch between the programId format the track-project link
 * carries (chainId-suffixed vs bare) and the one the application carries.
 */
async function fetchTrackProjectUIDs(communityId: string, trackId: string): Promise<Set<string>> {
  const fetchPage = (page: number) =>
    api.get<TrackProjectsPage>(
      INDEXER.COMMUNITY.V2.PROJECTS(communityId, {
        page,
        limit: TRACK_PROJECTS_PAGE_LIMIT,
        selectedTrackIds: [trackId],
      }),
      { isAuthorized: false }
    );

  const uids = new Set<string>();
  const firstPage = await fetchPage(1);
  for (const project of firstPage?.payload ?? []) uids.add(project.uid);

  const totalPages = firstPage?.pagination?.totalPages ?? 1;
  const restPages = await Promise.all(
    Array.from({ length: Math.max(totalPages - 1, 0) }, (_, offset) => fetchPage(offset + 2))
  );
  for (const page of restPages) {
    for (const project of page?.payload ?? []) uids.add(project.uid);
  }
  return uids;
}

/**
 * The public applications of a community, optionally narrowed to one program
 * and/or one track, loaded whole so the page can filter them client-side.
 *
 * This is the path for every filter combination the per-program endpoint
 * cannot serve on its own: "All Programs", and any selection with a track. An
 * application carries no track of its own — `funding_applications` has a
 * `programId` and there is no track-scoped endpoint. What it does carry is the
 * `projectUID` of the project created from it once funded, and that project
 * carries the track. So a track resolves to its projects first, and the
 * applications pointing at them are the track's.
 *
 * Consequences worth knowing at the call site: an application whose project was
 * never funded has no track and appears only when no track is selected, and a
 * program whose applications are private is skipped rather than surfaced.
 *
 * Known cost: with N public programs the first landing on "All Programs" makes
 * N + ceil(applications / 100) requests (plus the track's project pages when a
 * track is chosen), then the result is cached for 2 minutes. It is bounded by
 * the community's own public application count, which is what the page renders
 * anyway — the aggregate table has no pagination.
 */
export function useAggregatedApplications({
  communityId,
  enabled,
  programId,
  trackId,
  programs,
  status,
  search,
  getTitle,
}: UseAggregatedApplicationsOptions): UseAggregatedApplicationsResult {
  const scope = useMemo(() => {
    const publicPrograms = programs.filter(isPublicProgram);
    return programId
      ? publicPrograms.filter((program) => program.programId === programId)
      : publicPrograms;
  }, [programs, programId]);

  const query = useQuery<Application[], Error>({
    queryKey: [
      "wl-browse-applications-aggregate",
      communityId,
      programId ?? "",
      trackId ?? "",
      scope.map((program) => program.programId).join(","),
    ],
    queryFn: async () => {
      // No track selected means no narrowing at all, so the track's projects
      // are only resolved when there is a track to resolve.
      const trackProjectUIDs = trackId ? await fetchTrackProjectUIDs(communityId, trackId) : null;

      // The API caps `limit` at 100 and a program can exceed that (Filecoin's
      // Batch 2 holds 106), so every remaining page is fetched — one page
      // silently drops applications off the end of the list.
      const fetchPage = (scopedProgramId: string, page: number) =>
        api.get<ApplicationsPage>(
          `${INDEXER.V2.FUNDING_APPLICATIONS.BY_PROGRAM(scopedProgramId)}?page=${page}&limit=${APPLICATIONS_PAGE_LIMIT}`,
          { isAuthorized: false }
        );

      const firstPages = await Promise.all(scope.map((program) => fetchPage(program.programId, 1)));
      const restPages = await Promise.all(
        firstPages.flatMap((page, index) => {
          const totalPages = page?.pagination?.totalPages ?? 1;
          return Array.from({ length: Math.max(totalPages - 1, 0) }, (_, offset) =>
            fetchPage(scope[index].programId, offset + 2)
          );
        })
      );

      const allApplications = [...firstPages, ...restPages].flatMap(
        (page) => page?.applications ?? []
      );
      if (!trackProjectUIDs) return allApplications;
      return allApplications.filter(
        (application) => application.projectUID && trackProjectUIDs.has(application.projectUID)
      );
    },
    enabled: enabled && scope.length > 0,
    staleTime: 1000 * 60 * 2,
  });

  // Status and search are applied here rather than by the API, because the
  // loaded list is already whole — and the chips need counts over the whole
  // list, not over the current chip's own slice.
  const applications = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (query.data ?? []).filter((application) => {
      if (status !== "all" && application.status !== status) return false;
      if (!term) return true;
      return `${getTitle(application)} ${application.referenceNumber ?? ""}`
        .toLowerCase()
        .includes(term);
    });
  }, [query.data, status, search, getTitle]);

  const chipCounts = useMemo(() => {
    const counts = emptyChipCounts();
    for (const application of query.data ?? []) {
      counts.all += 1;
      if (application.status in counts) counts[application.status] += 1;
    }
    return counts;
  }, [query.data]);

  return {
    applications,
    totalCount: applications.length,
    chipCounts,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
