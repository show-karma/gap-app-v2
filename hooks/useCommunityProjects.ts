"use client";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { z } from "zod";
import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";

export interface CommunityProject {
  uid: string;
  title: string;
  slug: string;
}

// Items are a mix of shapes (some carry `details.title`, others a bare
// `title`) so only the envelope is validated — item fields stay untyped
// rather than inventing a schema stricter than reality.
// TODO(#1775): add zod schema for item shape
const CommunityProjectsEnvelopeSchema = z
  .object({
    payload: z.array(z.unknown()).optional(),
  })
  .passthrough();

export function useCommunityProjects(programId?: string | null) {
  const { communityId } = useParams();

  const queryKey = ["community-projects", communityId, programId || "all"];

  const queryFn = async (): Promise<CommunityProject[]> => {
    if (!communityId) return [];

    const queryParams: any = { limit: 1000 };
    if (programId) {
      queryParams.selectedProgramId = programId; // This maps to 'programIds' in the URL
    }

    const data = await api.get(INDEXER.COMMUNITY.V2.PROJECTS(communityId as string, queryParams), {
      schema: CommunityProjectsEnvelopeSchema,
    });

    // Transform the API response to extract project information
    // The API returns projects in the 'payload' array directly
    const projects = data?.payload || [];
    return projects.map((project: any) => ({
      uid: project.uid,
      title: project.details?.title || project.title || "Untitled Project",
      slug: project.details?.slug || project.slug || "",
    }));
  };

  return useQuery({
    queryKey,
    queryFn,
    enabled: !!communityId,
  });
}
