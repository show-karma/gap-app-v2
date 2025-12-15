import { type FC, useState } from "react";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { useProjectStore } from "@/store";
import type { ProjectUpdate } from "@/types/v2/roadmap";
import { PAGES } from "@/utilities/pages";
import { ReadMore } from "@/utilities/ReadMore";
import { EditUpdateDialog } from "../../Pages/Project/Updates/EditUpdateDialog";
import { ActivityAttribution } from "./ActivityAttribution";
import { ActivityMenu } from "./ActivityMenu";
import { ActivityStatusHeader } from "./ActivityStatusHeader";

interface ProjectUpdateCardProps {
  update: ProjectUpdate;
  index: number;
  isAuthorized: boolean;
}

export const ProjectUpdateCard: FC<ProjectUpdateCardProps> = ({ update, index, isAuthorized }) => {
  const { project } = useProjectStore();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const canEdit = true;
  const canDelete = true;
  const canShare = !!update.uid;

  const handleShare = () => {
    const url = `${window.location.origin}${PAGES.PROJECT.UPDATES(
      project?.details?.slug || project?.uid || ""
    )}`;
    navigator.clipboard.writeText(url);
  };

  const handleEdit = () => {
    setIsEditDialogOpen(true);
  };

  const closeEditDialog = () => {
    setIsEditDialogOpen(false);
  };

  const handleDelete = async () => {
    // TODO: Implement delete functionality
  };

  // V2 API structure
  const title = update.title || "";
  const description = update.description || "";
  const deliverables = update.associations?.deliverables || [];
  const indicators = update.associations?.indicators || [];

  const hasDeliverables = deliverables.length > 0;
  const hasIndicators = indicators.length > 0;

  return (
    <div className="flex flex-col gap-0 w-full">
      <div className="flex flex-col gap-3 w-full px-5 py-4">
        <div className="flex flex-col gap-3 w-full">
          <ActivityStatusHeader
            activityType="ProjectUpdate"
            dueDate={null}
            showCompletionStatus={false}
            completed={false}
            completionStatusClassName="text-xs px-2 py-1"
            update={null}
            index={index}
          />
          {title && <p className="text-xl font-bold text-[#101828] dark:text-zinc-100">{title}</p>}
        </div>

        {description && (
          <div className="flex flex-col my-2 w-full">
            <ReadMore
              side="left"
              markdownClass="text-black dark:text-zinc-200 font-normal text-base"
              readLessText="Read less"
              readMoreText="Read more"
            >
              {description}
            </ReadMore>
          </div>
        )}

        {(hasDeliverables || hasIndicators) && (
          <div className="w-full flex-col flex gap-2 px-4 py-2 bg-[#F8F9FC] dark:bg-zinc-700 rounded-lg">
            <div className="flex flex-col gap-6 max-sm:gap-4">
              <h3 className="font-bold text-black dark:text-zinc-100 text-xl">Outputs</h3>
              {hasDeliverables && (
                <div className="flex w-full flex-col gap-2 p-6 bg-white dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-md">
                  <p className="text-sm font-bold text-black dark:text-zinc-100">Deliverables</p>
                  <div className="w-full">
                    <div className="grid grid-cols-1 gap-4">
                      {deliverables.map((deliverable, idx) => (
                        <div
                          key={idx}
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
                  </div>
                </div>
              )}
              {hasIndicators && (
                <div className="flex w-full flex-col gap-2 p-6 bg-white dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-md">
                  <p className="text-sm font-bold text-black dark:text-zinc-100">Metrics</p>
                  <div className="grid grid-cols-1 gap-4">
                    {indicators.map((indicator, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col p-4 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg"
                      >
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">
                          {indicator.name}
                        </h4>
                        {indicator.description && (
                          <p className="text-sm text-gray-600 dark:text-zinc-300 mt-1">
                            {indicator.description}
                          </p>
                        )}
                        {indicator.unitOfMeasure && (
                          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                            Unit: {indicator.unitOfMeasure}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {isAuthorized && (
          <EditUpdateDialog
            isOpen={isEditDialogOpen}
            onClose={closeEditDialog}
            projectId={project?.uid || ""}
            updateId={update.uid}
            updateType="ProjectUpdate"
          />
        )}
      </div>
      <ActivityAttribution
        date={update.createdAt || ""}
        attester={update.recipient}
        actions={
          isAuthorized ? (
            <ActivityMenu
              onShare={canShare ? handleShare : undefined}
              onEdit={canEdit ? handleEdit : undefined}
              onDelete={canDelete ? handleDelete : undefined}
              canShare={canShare}
              canEdit={canEdit}
              canDelete={canDelete}
              isDeleting={false}
              activityType="ProjectUpdate"
              deleteTitle={
                <p className="font-normal">
                  Are you sure you want to delete <b>{title || "this"}</b> update?
                </p>
              }
            />
          ) : undefined
        }
      />
    </div>
  );
};
