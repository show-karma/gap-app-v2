import {
  IGrantResponse,
  IProjectResponse,
  IProjectUpdate,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import {
  FilteredOutputsAndOutcomes,
  filterIndicators,
} from "../Impact/FilteredOutputsAndOutcomes";
import { useOwnerStore, useProjectStore } from "@/store";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { useMemo } from "react";
import { PAGES } from "@/utilities/pages";
import { useCommunityAdminStore } from "@/store/communityAdmin";
import { useAccount } from "wagmi";
import { useImpactAnswers } from "@/hooks/useImpactAnswers";

export const ProjectActivityBlock = ({
  activity,
}: {
  activity: IProjectUpdate;
}) => {
  const { project, isProjectOwner } = useProjectStore();

  const isContractOwner = useOwnerStore((state) => state.isOwner);
  const isCommunityAdmin = useCommunityAdminStore(
    (state) => state.isCommunityAdmin
  );

  const indicatorIds = activity.data?.indicators?.map(
    (indicator) => indicator.indicatorId
  );

  const indicatorNames = activity.data?.indicators?.map(
    (indicator) => indicator.name
  );

  const { isConnected } = useAccount();
  const isAuthorized =
    isConnected && (isProjectOwner || isContractOwner || isCommunityAdmin);

  const { data: impactAnswers = [], isLoading: isLoadingImpactAnswers } =
    useImpactAnswers({
      projectIdentifier: project?.uid as string,
      enabled:
        !!project?.uid && !!indicatorIds?.length && !!indicatorNames?.length,
    });

  // Filter indicators based on IDs and names
  const filteredAnswers = useMemo(() => {
    return filterIndicators(impactAnswers, indicatorIds, indicatorNames);
  }, [impactAnswers, indicatorIds, indicatorNames]);

  // Filter outputs based on authorization
  const filteredOutputs = isAuthorized
    ? filteredAnswers
    : filteredAnswers.filter((item) => item.datapoints?.length);


  if (
    !activity.data?.deliverables?.length &&
    !isLoadingImpactAnswers &&
    filteredOutputs.length === 0
  )
    return null;

  return (
    <div className="flex flex-col gap-6 max-sm:gap-4">
      <h3 className="font-bold text-black dark:text-zinc-100 text-xl">
        Outputs
      </h3>
      {activity.data?.deliverables?.length ? (
        <div className="flex w-full flex-col gap-2 p-6 bg-white dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-md">
          <p className="text-sm font-bold text-black dark:text-zinc-100">
            Deliverables
          </p>
          <div className="w-full">
            {activity.data?.deliverables &&
              activity.data?.deliverables?.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {activity.data.deliverables.map((deliverable, index) => (
                  <div
                    key={index}
                    className="flex flex-col p-4 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">
                          {deliverable.name}
                        </h4>
                      </div>

                      <div className="flex flex-col gap-4">
                        <p className="text-sm text-gray-600 dark:text-zinc-300 mb-3">
                          {deliverable.description}
                        </p>

                        {deliverable.proof && (
                          <div className="flex items-center">
                            <ExternalLink
                              href={
                                deliverable.proof.includes("http")
                                  ? deliverable.proof
                                  : `https://${deliverable.proof}`
                              }
                              className="inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                              aria-label={`View proof for ${deliverable.name}`}
                              tabIndex={0}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                />
                              </svg>
                              View Proof
                            </ExternalLink>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center p-6 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-zinc-400">
                  No deliverables found
                </p>
              </div>
            )}
          </div>
        </div>
      ) : null}
      {activity.data?.indicators?.length && project ? (
        <div className="flex w-full flex-col gap-2 p-6 bg-white dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-md">
          <p className="text-sm font-bold text-black dark:text-zinc-100">
            Metrics
          </p>
          <FilteredOutputsAndOutcomes
            indicatorIds={indicatorIds}
            indicatorNames={indicatorNames}
          />

        </div>
      ) : null}
    </div>
  );
};
