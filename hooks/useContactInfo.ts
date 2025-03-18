import { useQuery } from "@tanstack/react-query";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { APIContact } from "@/types/project";
import { errorManager } from "@/components/Utilities/errorManager";
import { useOwnerStore, useProjectStore } from "@/store";

interface Contact {
  id: string;
  name: string;
  email: string;
  telegram: string;
}

export const useContactInfo = (
  projectId: string | undefined,
  isAuthorized?: boolean
) => {
  const isOwner = useOwnerStore((state) => state.isOwner);
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const isDefaultAuthorized = isOwner || isProjectAdmin;
  return useQuery({
    queryKey: ["contactInfo", projectId],
    queryFn: async (): Promise<Contact[] | undefined> => {
      if (!projectId || !(isAuthorized || isDefaultAuthorized))
        return undefined;

      try {
        const [data, error] = await fetchData(
          INDEXER.SUBSCRIPTION.GET(projectId),
          "GET",
          {},
          {},
          {},
          true
        );

        if (error) {
          throw error;
        }

        const contacts = data.map((contact: APIContact) => ({
          id: contact._id.$oid,
          name: contact.name,
          email: contact.email,
          telegram: contact.telegram,
        }));

        return contacts;
      } catch (error: any) {
        console.error(error);
        errorManager(
          `Error fetching project contacts info from project ${projectId}`,
          error
        );
        return undefined;
      }
    },
    enabled: !!projectId && isAuthorized,
  });
};
