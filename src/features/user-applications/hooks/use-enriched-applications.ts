import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import type { Application, FundingProgram } from "@/types/whitelabel-entities";
import { api } from "@/utilities/api/client";
import { chosenCommunities } from "@/utilities/chosenCommunities";
import { INDEXER } from "@/utilities/indexer";

interface CommunityInfo {
  slug: string;
  name: string;
}

/**
 * When the applications list is not scoped to a single community, each row
 * needs its community name + slug to render a label and build a detail link.
 * Resolve those from each application's funding-program config (deduped by
 * programId), falling back to the app's own community fields.
 *
 * Returns the input array unchanged when a `communitySlug` scope is provided
 * (the rows already carry their community) or when nothing could be resolved.
 */
export function useEnrichedApplications(
  applications: Application[],
  communitySlug?: string
): Application[] {
  const uniqueProgramIds = useMemo(() => {
    if (communitySlug) return [];
    return [...new Set(applications.map((a) => a.programId))];
  }, [applications, communitySlug]);

  const programQueries = useQueries({
    queries: uniqueProgramIds.map((programId) => ({
      queryKey: ["funding-program-config", programId],
      queryFn: async () => {
        try {
          // TODO(#1775): add zod schema
          return await api.get<FundingProgram>(INDEXER.V2.FUNDING_PROGRAMS.GET(programId));
        } catch {
          // Program config fetch is best-effort here — it only enriches
          // applications with community info; a failure degrades to null
          // and the application still renders without that enrichment.
          return null;
        }
      },
      staleTime: 10 * 60 * 1000,
    })),
  });

  return useMemo(() => {
    if (communitySlug) return applications;

    const knownCommunities = chosenCommunities(true);
    const communityMap = new Map<string, CommunityInfo>();

    for (let i = 0; i < uniqueProgramIds.length; i++) {
      const program = programQueries[i]?.data;
      if (program?.communitySlug && !communityMap.has(uniqueProgramIds[i])) {
        const known = knownCommunities.find((c) => c.slug === program.communitySlug);
        communityMap.set(uniqueProgramIds[i], {
          slug: program.communitySlug,
          name: known?.name || program.communitySlug,
        });
      }
    }

    if (communityMap.size === 0) return applications;

    return applications.map((app) => {
      const info = communityMap.get(app.programId);
      if (!info) return app;
      return {
        ...app,
        communitySlug: app.communitySlug || info.slug,
        communityName: app.communityName || info.name,
      };
    });
  }, [applications, communitySlug, uniqueProgramIds, programQueries]);
}
