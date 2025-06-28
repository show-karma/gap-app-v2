"use client";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { TrashIcon } from "@heroicons/react/24/outline";
import { IGrantResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";
import { AddExternalId } from "./AddExternalIdDialog";
import { errorManager } from "@/components/Utilities/errorManager";
import { MESSAGES } from "@/utilities/messages";

import { useWallet } from "@/hooks/useWallet";

export default function ExternalIds({
  projectUID,
  communityUID,
  externalIds,
  refreshGrant,
}: {
  projectUID: string;
  communityUID: string;
  externalIds: string[];
  refreshGrant: () => Promise<IGrantResponse | undefined>;
}) {
  const [removingId, setRemovingId] = useState<string | null>(null);
  const { address } = useWallet();

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    try {
      const [result, error] = await fetchData(
        INDEXER.GRANTS.REMOVE_EXTERNAL_ID,
        "POST",
        {
          projectUID: projectUID,
          communityUID: communityUID,
          externalId: id,
        },
        {},
        {},
        true
      );
      if (error) {
        throw new Error(error);
      }
      await refreshGrant();
      toast.success("External ID removed successfully");
    } catch (error) {
      errorManager(
        MESSAGES.GRANT.ADD_EXTERNAL_ID.ERROR,
        error,
        {
          removingExternalId: id,
          projectUID,
          communityUID,
          address,
        },
        {
          error: MESSAGES.GRANT.ADD_EXTERNAL_ID.ERROR,
        }
      );
    } finally {
      setRemovingId(null);
    }
  };

  async function fetchApplicationsByProjectId(projectId: string) {
    try {
      const url = "https://grants-stack-indexer-v2.gitcoin.co/graphql";

      const payload = {
        query: `
      query MyQuery {
        applications(condition: {projectId: "${projectId}"}) {
          chainId
          roundId
          id
        }
      }
    `,
      };

      const [response, error] = await fetchData(
        "",
        "POST",
        payload,
        {},
        { "Content-Type": "application/json" },
        false,
        false,
        url
      );

      if (error) {
        throw new Error(error);
      }

      const applications = response.data.applications;

      if (applications && applications.length > 0) {
        return applications.map(
          ({
            chainId,
            roundId,
            id: applicationId,
          }: {
            chainId: string;
            roundId: string;
            id: string;
          }) =>
            `https://explorer.gitcoin.co/#/round/${chainId}/${roundId}/${applicationId}`
        );
      }
      return [];
    } catch (error) {
      console.error("Error fetching applications:", error);
      return [];
    }
  }

  const { data: gitcoinUrls, isLoading } = useQuery({
    queryKey: ["applicationUrls", externalIds],
    queryFn: async () => {
      const urls: { [key: string]: string[] } = {};
      for (const externalId of externalIds) {
        const applicationUrls = await fetchApplicationsByProjectId(externalId);
        if (applicationUrls.length > 0) {
          urls[externalId] = applicationUrls;
        }
      }
      return urls;
    },
    enabled: externalIds?.length > 0,
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">External IDs</h1>
        <AddExternalId
          projectUID={projectUID}
          communityUID={communityUID}
          refreshGrant={refreshGrant}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-x border-x-zinc-300 border-y border-y-zinc-300">
          <thead className="border-x border-x-zinc-300 border-y border-y-zinc-300">
            <tr className="divide-x">
              <th className="px-4 py-2 whitespace-nowrap">External ID</th>
              <th className="px-4 py-2 whitespace-nowrap">Gitcoin Profile</th>
              <th className="px-4 py-2 whitespace-nowrap">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-x">
            {externalIds?.map((externalId) => (
              <tr key={externalId} className="divide-x">
                <td className="px-4 py-2 text-center break-all">
                  {externalId}
                </td>
                <td className="px-4 py-2 text-center">
                  {isLoading
                    ? "Loading..."
                    : gitcoinUrls && gitcoinUrls[externalId]
                    ? gitcoinUrls[externalId].map((url, index) => (
                        <div key={index}>
                          <Link
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline"
                            title={url}
                          >
                            {url}
                          </Link>
                        </div>
                      ))
                    : "No data available"}
                </td>
                <td className="px-4 py-2 text-center whitespace-nowrap">
                  <button
                    onClick={() => handleRemove(externalId)}
                    className="text-red-500 hover:text-red-700 disabled:opacity-50"
                    disabled={removingId === externalId}
                  >
                    {removingId === externalId ? (
                      <div className="inline-block w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <TrashIcon className="w-5 h-5" />
                        <span>Remove</span>
                      </div>
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
