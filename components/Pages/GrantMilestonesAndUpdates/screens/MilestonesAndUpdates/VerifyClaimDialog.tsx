/* eslint-disable @next/next/no-img-element */
import { FC, Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Button } from "@/components/Utilities/Button";
import { z } from "zod";
import { SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/auth";
import { useAccount, useSwitchChain } from "wagmi";
import { Milestone, MilestoneCompleted } from "@show-karma/karma-gap-sdk";
import { getWalletClient } from "@wagmi/core";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { checkNetworkIsValid } from "@/utilities/checkNetworkIsValid";
import { useProjectStore } from "@/store";
import { MESSAGES } from "@/utilities/messages";
import { config } from "@/components/Utilities/WagmiProvider";
import { getGapClient, useGap } from "@/hooks";

type VerifyClaimDialogProps = {
  milestone: Milestone;
  isCommunityAdmin: boolean;
  addVerifiedMilestone: (newVerified: MilestoneCompleted) => void;
};

const schema = z.object({
  comment: z.string(),
});

type SchemaType = z.infer<typeof schema>;

export const VerifyClaimDialog: FC<VerifyClaimDialogProps> = ({
  milestone,
  isCommunityAdmin,
  addVerifiedMilestone,
}) => {
  let [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<SchemaType>({
    resolver: zodResolver(schema),
    reValidateMode: "onChange",
    mode: "onChange",
  });

  function closeModal() {
    setIsOpen(false);
  }
  function openModal() {
    setIsOpen(true);
  }
  const { address, isConnected } = useAccount();

  const hasVerifiedThis = milestone?.verified?.find(
    (v) => v.attester?.toLowerCase() === address?.toLowerCase()
  );
  const refreshProject = useProjectStore((state) => state.refreshProject);
  const { chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { gap } = useGap();

  const onSubmit: SubmitHandler<SchemaType> = async (data) => {
    let gapClient = gap;
    if (!gap) throw new Error("Please, connect a wallet");
    try {
      setIsLoading(true);
      if (!checkNetworkIsValid(chain?.id) || chain?.id !== milestone.chainID) {
        await switchChainAsync?.({ chainId: milestone.chainID });
        gapClient = getGapClient(milestone.chainID);
      }
      const walletClient = await getWalletClient(config, {
        chainId: milestone.chainID,
      });
      if (!walletClient || !address || !gapClient) return;
      const walletSigner = await walletClientToSigner(walletClient);
      await milestone.verify(walletSigner, data.comment).then(async () => {
        toast.success(MESSAGES.MILESTONES.VERIFY.SUCCESS);
        const newVerified = new MilestoneCompleted({
          data: {
            type: "verified",
            reason: data.comment,
          },
          schema: gapClient!.findSchema("MilestoneCompleted"),
          recipient: address,
          refUID: milestone.uid,
          attester: address,
        });
        milestone.verified = [...milestone.verified, newVerified];
        addVerifiedMilestone(newVerified);
      });
      closeModal();
    } catch (error) {
      console.log(error);
      toast.error(MESSAGES.MILESTONES.VERIFY.ERROR);
    } finally {
      setIsLoading(false);
    }
  };
  const isAuthorized = useAuthStore((state) => state.isAuth);
  const ableToVerify = isAuthorized && isConnected;
  if (!isCommunityAdmin || hasVerifiedThis || !ableToVerify) return null;

  return (
    <>
      <Button
        onClick={openModal}
        className={
          "flex justify-center items-center gap-x-2 rounded-md bg-transparent dark:bg-transparent px-3 py-2 text-sm font-semibold text-red-600 dark:text-red-300  hover:opacity-75 dark:hover:opacity-75 border border-red-200 dark:border-red-900 hover:bg-transparent"
        }
      >
        Verify update
      </Button>
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={closeModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl dark:bg-zinc-800 bg-white p-6 text-left align-middle  transition-all">
                  <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="flex w-full flex-col gap-4"
                  >
                    <div className="flex w-full flex-col">
                      <label htmlFor="comment" className={"text-sm font-bold"}>
                        Post a comment (optional)
                      </label>
                      <textarea
                        id="comment"
                        className={
                          "mt-2 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                        }
                        placeholder="I tested and can confirm it works as expected"
                        {...register("comment")}
                      />
                      <p className="text-base text-red-400">
                        {errors.comment?.message}
                      </p>
                    </div>
                    <div className="flex flex-row gap-4 justify-end">
                      <Button
                        className="text-zinc-900 hover:bg-transparent text-base bg-transparent border-black border dark:text-zinc-100 dark:border-zinc-100 hover:opacity-75 disabled:hover:bg-transparent disabled:hover:text-zinc-900"
                        onClick={closeModal}
                        disabled={isLoading}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="text-white text-base bg-red-600 border-black  hover:bg-red-600 hover:text-white"
                        disabled={isLoading}
                        isLoading={isLoading}
                        type="submit"
                      >
                        Verify update
                      </Button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};
