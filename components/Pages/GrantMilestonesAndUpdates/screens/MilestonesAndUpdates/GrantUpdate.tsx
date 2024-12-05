import { DeleteDialog } from "@/components/DeleteDialog";
import { useOwnerStore, useProjectStore } from "@/store";
import { useCommunityAdminStore } from "@/store/community";
import { ReadMore } from "@/utilities/ReadMore";
import { checkNetworkIsValid } from "@/utilities/checkNetworkIsValid";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { formatDate } from "@/utilities/formatDate";
import { MESSAGES } from "@/utilities/messages";
import { TrashIcon } from "@heroicons/react/24/outline";
import { getWalletClient } from "@wagmi/core";
import { useEffect, useState, type FC } from "react";
import toast from "react-hot-toast";
import { VerifyGrantUpdateDialog } from "./VerifyGrantUpdateDialog";
import { VerifiedBadge } from "./VerifiedBadge";
import { getGapClient, useGap } from "@/hooks";
import { useStepper } from "@/store/modals/txStepper";
import { Hex } from "viem";
import { config } from "@/utilities/wagmi/config";
import { useAccount, useSwitchChain } from "wagmi";
import {
  IGrantUpdate,
  IGrantUpdateStatus,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

import { errorManager } from "@/components/Utilities/errorManager";
import { ExternalLink } from "@/components/Utilities/ExternalLink";

interface UpdateTagProps {
  index: number;
}
export const FlagIcon = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
      <line x1="4" x2="4" y1="22" y2="15"></line>
    </svg>
  );
};
const UpdateTag: FC<UpdateTagProps> = ({ index }) => {
  return (
    <div className="flex w-max flex-row gap-3 rounded-full  bg-[#F5F3FF] px-3 py-1 text-[#5720B7] dark:text-violet-100 dark:bg-purple-700">
      <FlagIcon />
      <p className="text-xs font-bold text-[#5720B7] dark:text-violet-100">
        UPDATE {index}
      </p>
    </div>
  );
};

interface GrantUpdateProps {
  title: string;
  description: string;
  index: number;
  date: Date | number;
  update: IGrantUpdate;
}

export const GrantUpdate: FC<GrantUpdateProps> = ({
  title,
  description,
  index,
  date,
  update,
}) => {
  const { chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const refreshProject = useProjectStore((state) => state.refreshProject);
  const [isDeletingGrantUpdate, setIsDeletingGrantUpdate] = useState(false);

  const selectedProject = useProjectStore((state) => state.project);
  const { gap } = useGap();
  const { changeStepperStep, setIsStepper } = useStepper();

  const project = useProjectStore((state) => state.project);

  const undoGrantUpdate = async () => {
    let gapClient = gap;
    try {
      setIsDeletingGrantUpdate(true);
      if (!checkNetworkIsValid(chain?.id) || chain?.id !== update.chainID) {
        await switchChainAsync?.({ chainId: update.chainID });
        gapClient = getGapClient(update.chainID);
      }
      const walletClient = await getWalletClient(config, {
        chainId: update.chainID,
      });
      if (!walletClient || !gapClient) return;
      const walletSigner = await walletClientToSigner(walletClient);

      const instanceProject = await gapClient.fetch.projectById(project?.uid);
      const grantInstance = instanceProject?.grants.find(
        (item) => item.uid.toLowerCase() === update.refUID.toLowerCase()
      );
      if (!grantInstance) return;
      const grantUpdateInstance = grantInstance.updates.find(
        (item) => item.uid.toLowerCase() === update.uid.toLowerCase()
      );
      if (!grantUpdateInstance) return;
      await grantUpdateInstance
        .revoke(walletSigner as any, changeStepperStep)
        .then(async (res) => {
          let retries = 1000;
          changeStepperStep("indexing");
          let fetchedProject = null;
          const txHash = res?.tx[0]?.hash;
          if (txHash) {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(txHash, grantUpdateInstance.chainID),
              "POST",
              {}
            );
          }
          while (retries > 0) {
            fetchedProject = await gapClient!.fetch
              .projectById(selectedProject?.uid as Hex)
              .catch(() => null);
            const grant = fetchedProject?.grants?.find(
              (item) => item.uid.toLowerCase() === update.refUID.toLowerCase()
            );
            const stillExists = grant?.updates?.find(
              (grantUpdate) =>
                grantUpdate.uid.toLowerCase() === update.uid.toLowerCase()
            );
            if (!stillExists) {
              retries = 0;
              changeStepperStep("indexed");
              toast.success(MESSAGES.GRANT.GRANT_UPDATE.UNDO.SUCCESS);
              await refreshProject();
            }
            retries -= 1;
            // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
        });
    } catch (error: any) {
      toast.error(MESSAGES.GRANT.GRANT_UPDATE.UNDO.ERROR);
      errorManager(`Error deleting grant update ${update.uid}`, error);
    } finally {
      setIsDeletingGrantUpdate(false);
      setIsStepper(false);
    }
  };

  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const isContractOwner = useOwnerStore((state) => state.isOwner);
  const isCommunityAdmin = useCommunityAdminStore(
    (state) => state.isCommunityAdmin
  );

  const isAuthorized = isProjectAdmin || isContractOwner || isCommunityAdmin;

  const [verifiedUpdate, setVerifiedUpdate] = useState<IGrantUpdateStatus[]>(
    update?.verified || []
  );

  const addVerifiedUpdate = (newVerified: IGrantUpdateStatus) => {
    setVerifiedUpdate([...verifiedUpdate, newVerified]);
  };

  useEffect(() => {
    setVerifiedUpdate(update?.verified || []);
  }, [update]);

  /*
   * Check if the grant update was created after the launch date of the feature
   * @returns {boolean}
   */
  const checkProofLaunch = () => {
    return new Date("2024-08-30") <= new Date(update?.createdAt);
  };

  const isAfterProofLaunch = checkProofLaunch();

  return (
    <div className="flex w-full flex-1 max-w-full flex-col gap-4 rounded-lg border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 bg-white p-4 transition-all duration-200 ease-in-out  max-sm:px-2">
      <div className="flex flex-row items-center justify-between gap-4 flex-wrap">
        <div className="flex flex-row gap-3 items-center flex-wrap">
          <UpdateTag index={index} />
          {verifiedUpdate.length ? (
            <VerifiedBadge
              verifications={verifiedUpdate}
              title={`Update ${index} - Reviews`}
            />
          ) : null}
          <VerifyGrantUpdateDialog
            grantUpdate={update}
            addVerifiedUpdate={addVerifiedUpdate}
          />
        </div>
        <div className="flex flex-row gap-3 items-center flex-wrap">
          <p className="text-sm font-semibold text-gray-500 dark:text-zinc-300 max-sm:text-xs">
            Posted on {formatDate(date)}
          </p>
          {isAuthorized ? (
            <DeleteDialog
              deleteFunction={undoGrantUpdate}
              isLoading={isDeletingGrantUpdate}
              title={
                <p className="font-normal">
                  Are you sure you want to delete <b>{update.data.title}</b>{" "}
                  update?
                </p>
              }
              buttonElement={{
                text: "",
                icon: <TrashIcon className="text-red-500 w-5 h-5" />,
                styleClass:
                  "bg-transparent p-0 w-max h-max text-red-500 hover:bg-transparent",
              }}
            />
          ) : null}
        </div>
      </div>
      {title ? (
        <p className="text-lg font-semibold text-black dark:text-zinc-100 max-sm:text-base">
          {title}
        </p>
      ) : null}
      <div className="flex flex-col gap-2 w-full">
        <ReadMore
          readLessText="Read less update"
          readMoreText="Read full update"
        >
          {description}
        </ReadMore>
        {isAfterProofLaunch ? (
          <div className="flex flex-row items-center gap-1 flex-1 max-w-full flex-wrap max-sm:mt-4">
            <p className="text-sm w-full min-w-max max-w-max font-semibold text-gray-500 dark:text-zinc-300 max-sm:text-xs">
              Proof of work:
            </p>
            {update?.data.proofOfWork ? (
              <ExternalLink
                href={
                  update?.data.proofOfWork.includes("http")
                    ? update?.data.proofOfWork
                    : `https://${update?.data.proofOfWork}`
                }
                className="flex flex-row w-max max-w-full gap-2 bg-transparent text-sm font-semibold text-blue-600 underline dark:text-blue-100 hover:bg-transparent break-all line-clamp-3"
              >
                {update?.data.proofOfWork.includes("http")
                  ? `${update?.data.proofOfWork.slice(0, 80)}${
                      update?.data.proofOfWork.slice(0, 80).length >= 80
                        ? "..."
                        : ""
                    }`
                  : `https://${update?.data.proofOfWork.slice(0, 80)}${
                      update?.data.proofOfWork.slice(0, 80).length >= 80
                        ? "..."
                        : ""
                    }`}
              </ExternalLink>
            ) : (
              <p className="text-sm font-medium text-gray-500 dark:text-zinc-300 max-sm:text-xs">
                Grantee indicated there is no proof for this milestone.
              </p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};
