"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTracksForCommunity } from "@/hooks/useTracks";
import { useCommunityDetails } from "@/hooks/v2/useCommunityDetails";
import type { Application, ApplicationStatus } from "@/types/whitelabel-entities";
import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";

/** The applications API rejects a `limit` above 100. */
const APPLICATIONS_PAGE_LIMIT = 100;

interface ApplicationsPage {
  applications: Application[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

/** The subset of a program this hook needs to decide whether to read it. */
export interface ApplicationProgram {
  programId: string;
  applicationConfig?: {
    formSchema?: { settings?: { privateApplications?: boolean } | null } | null;
  } | null;
}

export type ApplicationChipCounts = Record<ApplicationStatus | "all", number>;

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

interface UseApplicationsByTrackOptions {
  communityId: string;
  /** Off for communities that browse this tab by program; nothing is fetched. */
  enabled: boolean;
  trackId: string;
  programs: ApplicationProgram[];
  status: ApplicationStatus | "all";
  search: string;
  /** How a row's project name is read, so filtering matches what is rendered. */
  getTitle: (application: Application) => string;
}

/**
 * The applications of one track.
 *
 * An application carries no track of its own — `funding_applications` has a
 * `programId` and there is no track-scoped endpoint. What it does carry is the
 * `projectUID` of the project created from it once funded, and that project
 * carries the track. So a track resolves to its projects first, and the
 * applications pointing at them are the track's.
 *
 * Consequences worth knowing at the call site: an application whose project was
 * never funded has no track and appears only when none is selected, and a
 * program whose applications are private is skipped rather than surfaced.
 */
export function useApplicationsByTrack({
  communityId,
  enabled,
  trackId,
  programs,
  status,
  search,
  getTitle,
}: UseApplicationsByTrackOptions) {
  const { community } = useCommunityDetails(enabled ? communityId : undefined);
  const { data: tracks = [] } = useTracksForCommunity(enabled ? (community?.uid ?? "") : "");

  const publicPrograms = useMemo(
    () =>
      programs.filter(
        (program) => !program.applicationConfig?.formSchema?.settings?.privateApplications
      ),
    [programs]
  );

  const query = useQuery<Application[]>({
    queryKey: [
      "wl-browse-applications-by-track",
      communityId,
      trackId,
      publicPrograms.map((program) => program.programId).join(","),
    ],
    queryFn: async () => {
      const projects = await api.get<{ payload: { uid: string }[] }>(
        INDEXER.COMMUNITY.V2.PROJECTS(communityId, {
          limit: 100,
          selectedTrackIds: [trackId],
        }),
        { isAuthorized: false }
      );
      const trackProjectUIDs = new Set((projects?.payload ?? []).map((project) => project.uid));

      // The API caps `limit` at 100 and a batch can exceed that (Filecoin's
      // Batch 2 holds 106), so every remaining page is fetched — one page
      // silently drops applications off the end of the track.
      const fetchPage = (programId: string, page: number) =>
        api.get<ApplicationsPage>(
          `/v2/funding-applications/program/${programId}?page=${page}&limit=${APPLICATIONS_PAGE_LIMIT}`,
          { isAuthorized: false }
        );

      const firstPages = await Promise.all(
        publicPrograms.map((program) => fetchPage(program.programId, 1))
      );
      const restPages = await Promise.all(
        firstPages.flatMap((page, index) => {
          const totalPages = page?.pagination?.totalPages ?? 1;
          return Array.from({ length: Math.max(totalPages - 1, 0) }, (_, offset) =>
            fetchPage(publicPrograms[index].programId, offset + 2)
          );
        })
      );

      return [...firstPages, ...restPages]
        .flatMap((page) => page?.applications ?? [])
        .filter(
          (application) => application.projectUID && trackProjectUIDs.has(application.projectUID)
        );
    },
    enabled: enabled && !!trackId && publicPrograms.length > 0,
    staleTime: 1000 * 60 * 2,
  });

  // Status and search are applied here rather than by the API, because the
  // track list is already whole — and the chips need counts over the whole
  // track, not over the current chip's own slice.
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
    trackName: tracks.find((track) => track.id === trackId)?.name,
    communityUid: community?.uid ?? "",
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
