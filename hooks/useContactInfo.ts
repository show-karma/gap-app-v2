import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { errorManager } from "@/components/Utilities/errorManager";
import { useProjectAuthorization } from "@/hooks/useProjectAuthorization";
import type { APIContact } from "@/types/project";
import { api } from "@/utilities/api/client";
import { HttpError, isApiError } from "@/utilities/api/errors";
import { INDEXER } from "@/utilities/indexer";
import { defaultQueryOptions } from "@/utilities/queries/defaultOptions";

interface Contact {
  id: string;
  name: string | undefined;
  email: string | undefined;
  telegram: string | undefined;
}

/**
 * Project contacts are an admin-gated indexer resource: the `GET
 * /:idOrSlug/contacts` route is guarded by `isProjectAdminMiddleware`, which
 * returns 403 for anyone who is not a project admin. That denial is EXPECTED
 * data, not an error — so this hook (1) only fires once authorization has
 * *resolved* to true (never from stale/optimistic store booleans), and (2)
 * classifies a 403 as "no contacts" (null) without logging to the console or
 * errorManager. Only unexpected failures are surfaced.
 *
 * @param projectId  Project UID or slug.
 * @param isAuthorized Optional caller-supplied authorization. When provided it
 *   is ANDed with the resolved tri-state authorization; the query only fires
 *   when both agree the user may read contacts.
 */
export const useContactInfo = (projectId: string | undefined, isAuthorized?: boolean) => {
  const { address } = useAccount();
  const auth = useProjectAuthorization();
  // Resolved-true authorization only — never the in-flight loading state, so an
  // admin-gated fetch can never fire from an undecided (optimistic) signal.
  const isResolvedAuthorized = auth.isAuthorized && !auth.isLoading;
  const canFetch = (isAuthorized ?? true) && isResolvedAuthorized;

  return useQuery({
    queryKey: ["contactInfo", projectId],
    queryFn: async (): Promise<Contact[] | null> => {
      if (!projectId || !canFetch) return null;

      try {
        // TODO(#1775): add zod schema
        const data = await api.get<APIContact[]>(INDEXER.SUBSCRIPTION.GET(projectId));

        if (!data) return null;

        return data.map((contact: APIContact) => ({
          id: contact._id.$oid,
          name: contact.name,
          email: contact.email,
          telegram: contact.telegram,
        }));
      } catch (error) {
        // 403 is the documented project-admin denial — treat it as data
        // (no contacts) and stay silent. Anything else is unexpected.
        if (isApiError(error) && error instanceof HttpError && error.status === 403) {
          return null;
        }
        errorManager(`Error fetching project contacts info from project ${projectId}`, error, {
          projectUID: projectId,
          address,
        });
        return null;
      }
    },
    enabled: !!projectId && canFetch,
    ...defaultQueryOptions,
  });
};
