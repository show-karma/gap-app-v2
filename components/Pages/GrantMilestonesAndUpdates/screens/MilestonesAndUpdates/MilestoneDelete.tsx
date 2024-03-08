import { DeleteDialog } from "@/components/DeleteDialog";
import { useProjectStore } from "@/store";
import { checkNetworkIsValid } from "@/utilities/checkNetworkIsValid";
import { useSigner, walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { MESSAGES } from "@/utilities/messages";
import { TrashIcon } from "@heroicons/react/24/outline";
import type { Milestone } from "@show-karma/karma-gap-sdk";
import { getWalletClient } from "@wagmi/core";
import { type FC, useState } from "react";
import toast from "react-hot-toast";
import { useNetwork, useSwitchNetwork } from "wagmi";

interface MilestoneDeleteProps {
  milestone: Milestone;
}

export const MilestoneDelete: FC<MilestoneDeleteProps> = ({ milestone }) => {
  const [isDeletingMilestone, setIsDeletingMilestone] = useState(false);

  const { switchNetworkAsync } = useSwitchNetwork();
  const { chain } = useNetwork();
  const signer = useSigner();
  const refreshProject = useProjectStore((state) => state.refreshProject);

  const deleteFn = async () => {
    setIsDeletingMilestone(true);
    try {
      if (!checkNetworkIsValid(chain?.id) || chain?.id !== milestone.chainID) {
        await switchNetworkAsync?.(milestone.chainID);
      }
      const milestoneUID = milestone.uid;
      const walletClient = await getWalletClient({
        chainId: milestone.chainID,
      });
      if (!walletClient) return;
      const walletSigner = await walletClientToSigner(walletClient);
      await milestone.revoke(walletSigner).then(async () => {
        toast.success(MESSAGES.MILESTONES.DELETE.SUCCESS);
        await refreshProject().then((res) => {
          const grantUID = milestone.refUID;
          const grant = res?.grants.find((g) => g.uid === grantUID);
          const stillExist = grant?.milestones.find(
            (m) => m.uid === milestoneUID
          );
          if (stillExist && grant?.milestones) {
            const removedMilestone = grant?.milestones.filter(
              (m) => m.uid !== milestoneUID
            );
            grant.milestones = removedMilestone;
          }
        });
      });
    } catch (error) {
      toast.error(MESSAGES.MILESTONES.DELETE.ERROR(milestone.title));
      throw error;
    } finally {
      setIsDeletingMilestone(false);
    }
  };

  return (
    <DeleteDialog
      deleteFunction={deleteFn}
      isLoading={isDeletingMilestone}
      title={
        <p className="font-normal">
          Are you sure you want to delete <b>{milestone.title}</b> milestone?
        </p>
      }
      buttonElement={{
        text: "",
        icon: <TrashIcon className="text-red-500 w-5 h-5" />,
        styleClass:
          "bg-transparent p-0 w-max h-max text-red-500 hover:bg-transparent",
      }}
    />
  );
};
