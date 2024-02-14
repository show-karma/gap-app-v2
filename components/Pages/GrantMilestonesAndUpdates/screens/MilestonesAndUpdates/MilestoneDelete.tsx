import { DeleteDialog } from "@/components/DeleteDialog";
import { useProjectStore } from "@/store";
import { MESSAGES, useSigner } from "@/utilities";
import { checkNetworkIsValid } from "@/utilities/checkNetworkIsValid";
import { TrashIcon } from "@heroicons/react/24/outline";
import type { Milestone } from "@show-karma/karma-gap-sdk";
import { type FC, useState } from "react";
import toast from "react-hot-toast";
import { useAccount, useSwitchChain } from "wagmi";

interface MilestoneDeleteProps {
  milestone: Milestone;
}

export const MilestoneDelete: FC<MilestoneDeleteProps> = ({ milestone }) => {
  const [isDeletingMilestone, setIsDeletingMilestone] = useState(false);

  const { switchChainAsync } = useSwitchChain();
  const { chain } = useAccount();
  const signer = useSigner();
  const refreshProject = useProjectStore((state) => state.refreshProject);

  const deleteFn = async () => {
    setIsDeletingMilestone(true);
    try {
      if (!checkNetworkIsValid(chain?.id) || chain?.id !== milestone.chainID) {
        await switchChainAsync?.({ chainId: milestone.chainID });
      }
      await milestone
        .revoke(signer as any)
        .then(async () => {
          toast.success(MESSAGES.MILESTONES.DELETE.SUCCESS);
          await refreshProject();
        })
        .catch((error) => console.log(error));
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
          "bg-transparent p-0 w-max h-max text-red-500 hover:bg-transparent shadow-none hover:shadow-none",
      }}
    />
  );
};
