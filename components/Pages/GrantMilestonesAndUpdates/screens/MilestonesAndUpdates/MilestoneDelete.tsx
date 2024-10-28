import { DeleteDialog } from "@/components/DeleteDialog";
import { getGapClient, useGap } from "@/hooks";
import { useProjectStore } from "@/store";
import { useStepper } from "@/store/modals/txStepper";
import { checkNetworkIsValid } from "@/utilities/checkNetworkIsValid";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { config } from "@/utilities/wagmi/config";
import { TrashIcon } from "@heroicons/react/24/outline";
import { IMilestoneResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { getWalletClient } from "@wagmi/core";
import { type FC, useState } from "react";
import toast from "react-hot-toast";
import { Hex } from "viem";
import { useChainId, useSwitchChain } from "wagmi";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { appNetwork } from "@/utilities/network";

import { errorManager } from "@/components/Utilities/errorManager";
interface MilestoneDeleteProps {
  milestone: IMilestoneResponse;
}

export const MilestoneDelete: FC<MilestoneDeleteProps> = ({ milestone }) => {
  const [isDeletingMilestone, setIsDeletingMilestone] = useState(false);

  const { switchChainAsync } = useSwitchChain();
  const {
    user,
    ready,
    authenticated,
  } = usePrivy();
  const chainId = useChainId();
  const { wallets } = useWallets();
  const isConnected = ready && authenticated && wallets.length !== 0;
  const chain = appNetwork.find((c) => c.id === chainId);
  const address = user && wallets[0]?.address as `0x${string}`;
  const refreshProject = useProjectStore((state) => state.refreshProject);
  const { gap } = useGap();
  const { changeStepperStep, setIsStepper } = useStepper();
  const selectedProject = useProjectStore((state) => state.project);

  const project = useProjectStore((state) => state.project);

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
      if (!walletClient || !gapClient) return;
      const walletSigner = await walletClientToSigner(walletClient);
      const instanceProject = await gapClient.fetch.projectById(project?.uid);
      const grantInstance = instanceProject?.grants.find(
        (item) => item.uid.toLowerCase() === milestone.refUID.toLowerCase()
      );
      if (!grantInstance) return;
      const milestoneInstance = grantInstance.milestones.find(
        (item) => item.uid.toLowerCase() === milestone.uid.toLowerCase()
      );
      if (!milestoneInstance) return;
      await milestoneInstance
        .revoke(walletSigner, changeStepperStep)
        .then(async (res) => {
          let retries = 1000;
          changeStepperStep("indexing");
          const txHash = res?.tx[0]?.hash;
          if (txHash) {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(txHash, milestoneInstance.chainID),
              "POST",
              {}
            );
          }
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
    } catch (error: any) {
      toast.error(MESSAGES.MILESTONES.DELETE.ERROR(milestone.data.title));
      errorManager(
        `Error deleting milestone ${milestone.uid} from grant ${milestone.refUID}`,
        error
      );
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
