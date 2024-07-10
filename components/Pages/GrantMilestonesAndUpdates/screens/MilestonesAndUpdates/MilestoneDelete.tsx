import { DeleteDialog } from "@/components/DeleteDialog";
import { getGapClient, useGap } from "@/hooks";
import { useProjectStore } from "@/store";
import { useStepper } from "@/store/txStepper";
import { checkNetworkIsValid } from "@/utilities/checkNetworkIsValid";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { MESSAGES } from "@/utilities/messages";
import { config } from "@/utilities/wagmi/config";
import { TrashIcon } from "@heroicons/react/24/outline";
import { Milestone } from "@show-karma/karma-gap-sdk";
import { IMilestoneResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { getWalletClient } from "@wagmi/core";
import { type FC, useState } from "react";
import toast from "react-hot-toast";
import { Hex } from "viem";
import { useAccount, useSwitchChain } from "wagmi";

interface MilestoneDeleteProps {
  milestone: IMilestoneResponse;
}

export const MilestoneDelete: FC<MilestoneDeleteProps> = ({ milestone }) => {
  const [isDeletingMilestone, setIsDeletingMilestone] = useState(false);

  const { switchChainAsync } = useSwitchChain();
  const { chain } = useAccount();
  const refreshProject = useProjectStore((state) => state.refreshProject);
  const { gap } = useGap();
  const { changeStepperStep, setIsStepper } = useStepper();
  const selectedProject = useProjectStore((state) => state.project);

  const deleteFn = async () => {
    setIsDeletingMilestone(true);
    let gapClient = gap;
    try {
      if (!checkNetworkIsValid(chain?.id) || chain?.id !== milestone.chainID) {
        await switchChainAsync?.({ chainId: milestone.chainID });
        gapClient = getGapClient(milestone.chainID);
      }
      const milestoneUID = milestone.uid;
      const walletClient = await getWalletClient(config, {
        chainId: milestone.chainID,
      });
      if (!walletClient) return;
      const walletSigner = await walletClientToSigner(walletClient);
      const milestoneInstance = new Milestone({
        ...milestone,
        schema: gapClient!.findSchema("Milestone"),
      });
      await milestoneInstance
        .revoke(walletSigner, changeStepperStep)
        .then(async () => {
          let retries = 1000;
          changeStepperStep("indexing");
          let fetchedProject = null;
          while (retries > 0) {
            if (selectedProject) {
              fetchedProject = await gapClient!.fetch
                .projectById(selectedProject.uid as Hex)
                .catch(() => null);
            }
            const grant = fetchedProject?.grants.find(
              (g) => g.uid === milestone.refUID
            );
            const stillExist = grant?.milestones.find(
              (m) => m.uid === milestoneUID
            );
            if (!stillExist && grant?.milestones) {
              retries = 0;
              changeStepperStep("indexed");
              toast.success(MESSAGES.MILESTONES.DELETE.SUCCESS);
              await refreshProject();
            }
          }
          retries -= 1;
          // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
          await new Promise((resolve) => setTimeout(resolve, 1500));
        });
    } catch (error) {
      toast.error(MESSAGES.MILESTONES.DELETE.ERROR(milestone.data.title));
      throw error;
    } finally {
      setIsDeletingMilestone(false);
      setIsStepper(false);
    }
  };

  return (
    <DeleteDialog
      deleteFunction={deleteFn}
      isLoading={isDeletingMilestone}
      title={
        <p className="font-normal">
          Are you sure you want to delete <b>{milestone.data.title}</b>{" "}
          milestone?
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
