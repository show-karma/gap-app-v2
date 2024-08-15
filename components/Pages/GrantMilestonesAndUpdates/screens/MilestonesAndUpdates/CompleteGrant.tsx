import { Button } from "@/components/Utilities/Button";
import { errorManager } from "@/components/Utilities/errorManager";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { getGapClient, useGap } from "@/hooks";
import { useProjectStore } from "@/store";
import { useStepper } from "@/store/modals/txStepper";
import { checkNetworkIsValid } from "@/utilities/checkNetworkIsValid";
import { useSigner, walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { MESSAGES } from "@/utilities/messages";
import { shortAddress } from "@/utilities/shortAddress";
import { config } from "@/utilities/wagmi/config";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { Grant } from "@show-karma/karma-gap-sdk";
import {
  IGrantResponse,
  IProjectResponse,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { getWalletClient } from "@wagmi/core";
import { useQueryState } from "nuqs";
import type { FC } from "react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Hex } from "viem";
import { useAccount, useSwitchChain } from "wagmi";

const labelStyle = "text-sm font-bold text-black dark:text-zinc-100";

interface GrantCompletionProps {
  grant: IGrantResponse;
  project: IProjectResponse;
}

export const GrantCompletion: FC<GrantCompletionProps> = ({
  grant,
  project,
}) => {
  const [description, setDescription] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  const { chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const signer = useSigner();
  const refreshProject = useProjectStore((state) => state.refreshProject);
  const [, changeTab] = useQueryState("tab");

  const { changeStepperStep, setIsStepper } = useStepper();
  const { gap } = useGap();

  const markGrantAsComplete = async (
    grantToComplete: IGrantResponse,
    data: {
      text?: string;
      title?: string;
    }
  ) => {
    let gapClient = gap;
    try {
      if (
        !checkNetworkIsValid(chain?.id) ||
        chain?.id !== grantToComplete.chainID
      ) {
        await switchChainAsync?.({ chainId: grantToComplete.chainID });
        gapClient = getGapClient(grantToComplete.chainID);
      }
      const walletClient = await getWalletClient(config, {
        chainId: grantToComplete.chainID,
      });
      if (!walletClient || !gapClient) return;
      const walletSigner = await walletClientToSigner(walletClient);
      const fetchedProject = await gapClient.fetch.projectById(project?.uid);
      if (!fetchedProject) return;
      const grantInstance = fetchedProject.grants.find(
        (g) => g.uid.toLowerCase() === grantToComplete.uid.toLowerCase()
      );
      if (!grantInstance) return;
      await grantInstance
        .complete(
          walletSigner,
          {
            title: data.title || "",
            text: data.text || "",
          },
          changeStepperStep
        )
        .then(async () => {
          let retries = 1000;
          changeStepperStep("indexing");
          let fetchedProject = null;
          while (retries > 0) {
            fetchedProject = await gapClient!.fetch
              .projectById(project.uid as Hex)
              .catch(() => null);
            const grant = fetchedProject?.grants?.find(
              (g) => g.uid === grantToComplete.uid
            );
            if (grant && grant.completed) {
              retries = 0;
              changeStepperStep("indexed");
              toast.success(MESSAGES.GRANT.MARK_AS_COMPLETE.SUCCESS);
              await refreshProject().then(() => {
                changeTab("milestones-and-updates");
              });
            }
          }
          retries -= 1;
          // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
          await new Promise((resolve) => setTimeout(resolve, 1500));
        });
    } catch (error) {
      errorManager(`Error marking grant ${grant.uid} as complete`, error);
      toast.error(MESSAGES.GRANT.MARK_AS_COMPLETE.ERROR);
    } finally {
      setIsStepper(false);
    }
  };

  const onSubmit = async () => {
    setIsLoading(true);
    await markGrantAsComplete(grant, {
      text: description,
    }).finally(() => {
      setIsLoading(false);
    });
  };

  return (
    <div className="mt-9 flex flex-1">
      <div className="flex w-full max-w-3xl flex-col gap-6 rounded-md bg-gray-200 dark:bg-zinc-800 px-4 py-6 max-lg:max-w-full">
        <div className="flex w-full flex-row justify-between">
          <h4 className="text-2xl font-bold text-black dark:text-zinc-100">
            Complete {grant.details?.data?.title || shortAddress(grant.uid)}{" "}
            Grant
          </h4>
          <button
            onClick={() => {
              changeTab("overview");
            }}
            className="bg-transparent p-4 hover:bg-transparent hover:opacity-75"
          >
            <XMarkIcon className="h-6 w-6 " />
          </button>
        </div>
        <div className="flex w-full flex-col gap-4">
          <div className="flex w-full flex-col gap-2">
            <label htmlFor="completion-description" className={labelStyle}>
              Description (optional)
            </label>
            <div className="w-full bg-transparent" data-color-mode="light">
              <MarkdownEditor
                className="bg-transparent"
                value={description}
                onChange={(newValue: string) => setDescription(newValue || "")}
              />
            </div>
          </div>
          <div className="flex w-full flex-row-reverse">
            <Button
              onClick={() => onSubmit()}
              className="flex w-max flex-row bg-[#17B26A] text-white hover:bg-[#17B26A]"
              disabled={isLoading}
              isLoading={isLoading}
            >
              Mark grant as complete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
