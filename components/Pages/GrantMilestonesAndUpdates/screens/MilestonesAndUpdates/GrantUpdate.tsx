import { DeleteDialog } from "@/components/DeleteDialog";
import { Button } from "@/components/Utilities/Button";
import { useOwnerStore, useProjectStore } from "@/store";
import { useCommunityAdminStore } from "@/store/community";
import { ReadMore } from "@/utilities/ReadMore";
import { checkNetworkIsValid } from "@/utilities/checkNetworkIsValid";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { formatDate } from "@/utilities/formatDate";
import { MESSAGES } from "@/utilities/messages";
import { TrashIcon } from "@heroicons/react/24/outline";
import {
  GrantUpdateStatus,
  GrantUpdate as Update,
} from "@show-karma/karma-gap-sdk";
import { getWalletClient } from "@wagmi/core";
import { useEffect, useState, type FC } from "react";
import toast from "react-hot-toast";
import { useNetwork, useSwitchNetwork } from "wagmi";
import { VerifyGrantUpdateDialog } from "./VerifyGrantUpdateDialog";
import { VerifiedBadge } from "./VerifiedBadge";

interface UpdateTagProps {
  index: number;
}
const FlagIcon = () => {
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
  update: Update;
}

export const GrantUpdate: FC<GrantUpdateProps> = ({
  title,
  description,
  index,
  date,
  update,
}) => {
  const { chain } = useNetwork();
  const { switchNetworkAsync } = useSwitchNetwork();
  const refreshProject = useProjectStore((state) => state.refreshProject);
  const [isDeletingGrantUpdate, setIsDeletingGrantUpdate] = useState(false);

  const undoGrantUpdate = async () => {
    try {
      setIsDeletingGrantUpdate(true);
      if (!checkNetworkIsValid(chain?.id) || chain?.id !== update.chainID) {
        await switchNetworkAsync?.(update.chainID);
      }
      const walletClient = await getWalletClient({
        chainId: update.chainID,
      });
      if (!walletClient) return;
      const walletSigner = await walletClientToSigner(walletClient);
      await update.revoke(walletSigner as any).then(async () => {
        toast.success(MESSAGES.GRANT.GRANT_UPDATE.UNDO.SUCCESS);
        await refreshProject();
      });
    } catch (error) {
      console.log(error);
      toast.error(MESSAGES.GRANT.GRANT_UPDATE.UNDO.ERROR);
    } finally {
      setIsDeletingGrantUpdate(false);
    }
  };

  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const isContractOwner = useOwnerStore((state) => state.isOwner);
  const isCommunityAdmin = useCommunityAdminStore(
    (state) => state.isCommunityAdmin
  );

  const isAuthorized = isProjectOwner || isContractOwner || isCommunityAdmin;

  const [verifiedUpdate, setVerifiedUpdate] = useState<GrantUpdateStatus[]>(
    update?.verified || []
  );

  const addVerifiedUpdate = (newVerified: GrantUpdateStatus) => {
    setVerifiedUpdate([...verifiedUpdate, newVerified]);
  };

  useEffect(() => {
    setVerifiedUpdate(update?.verified || []);
  }, [update]);

  return (
    <div className="flex w-full flex-1 flex-col gap-4 rounded-lg border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 bg-white p-4 transition-all duration-200 ease-in-out  max-sm:px-2">
      <div className="flex flex-row items-center justify-between">
        <div className="flex flex-row gap-3 items-center">
          <UpdateTag index={index} />
          {verifiedUpdate.length ? (
            <VerifiedBadge
              verifications={verifiedUpdate}
              title={`Update ${index} - Reviews`}
            />
          ) : null}
          <VerifyGrantUpdateDialog
            grantUpdate={update}
            isCommunityAdmin={isCommunityAdmin}
            addVerifiedUpdate={addVerifiedUpdate}
          />
        </div>
        <div className="flex flex-row gap-3 items-center">
          <p className="text-sm font-semibold text-gray-500 dark:text-zinc-300 max-sm:text-xs">
            Posted on {formatDate(date)}
          </p>
          {isAuthorized ? (
            <DeleteDialog
              deleteFunction={undoGrantUpdate}
              isLoading={isDeletingGrantUpdate}
              title={
                <p className="font-normal">
                  Are you sure you want to delete <b>{update.title}</b> update?
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
      <div>
        <ReadMore
          readLessText="Read less update"
          readMoreText="Read full update"
        >
          {description}
        </ReadMore>
      </div>
    </div>
  );
};
