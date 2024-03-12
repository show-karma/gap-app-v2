import { Button } from "@/components/Utilities/Button";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { config } from "@/components/Utilities/WagmiProvider";
import { useProjectStore } from "@/store";
import { checkNetworkIsValid } from "@/utilities/checkNetworkIsValid";
import { useSigner, walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { MESSAGES } from "@/utilities/messages";
import { shortAddress } from "@/utilities/shortAddress";
import { XMarkIcon } from "@heroicons/react/24/solid";
import type { Grant, Project } from "@show-karma/karma-gap-sdk";
import { getWalletClient } from "@wagmi/core";
import { useQueryState } from "nuqs";
import type { FC } from "react";
import { useState } from "react";
import toast from "react-hot-toast";
import { useAccount, useSwitchChain } from "wagmi";

const labelStyle = "text-sm font-bold text-black dark:text-zinc-100";

interface GrantCompletionProps {
  grant: Grant;
  project: Project;
}

export const GrantCompletion: FC<GrantCompletionProps> = ({
  grant,
  project,
}) => {
  const [description, setDescription] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  const { chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const refreshProject = useProjectStore((state) => state.refreshProject);
  const [, changeTab] = useQueryState("tab");

  const markGrantAsComplete = async (
    grantToComplete: Grant,
    data: {
      text?: string;
      title?: string;
    }
  ) => {
    try {
      if (
        !checkNetworkIsValid(chain?.id) ||
        chain?.id !== grantToComplete.chainID
      ) {
        await switchChainAsync?.({ chainId: grantToComplete.chainID });
      }
      const walletClient = await getWalletClient(config, {
        chainId: grantToComplete.chainID,
      });
      if (!walletClient) return;
      const walletSigner = await walletClientToSigner(walletClient);
      await grantToComplete
        .complete(walletSigner, {
          title: data.title || "",
          text: data.text || "",
        })
        .then(async () => {
          toast.success(MESSAGES.GRANT.MARK_AS_COMPLETE.SUCCESS);
          await refreshProject().then(() => {
            changeTab("milestones-and-updates");
          });
        });
    } catch (error) {
      console.log(error);
      toast.error(MESSAGES.GRANT.MARK_AS_COMPLETE.ERROR);
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
            Complete {grant.details?.title || shortAddress(grant.uid)} Grant
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
