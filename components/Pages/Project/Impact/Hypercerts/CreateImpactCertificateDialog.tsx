/* eslint-disable @next/next/no-img-element */
import { FC, Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Button } from "@/components/Utilities/Button";
import { z } from "zod";
import { SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/auth";
import { useAccount, useNetwork, useSwitchNetwork } from "wagmi";
import { getWalletClient } from "@wagmi/core";
import { checkNetworkIsValid } from "@/utilities/checkNetworkIsValid";
import { MESSAGES } from "@/utilities/messages";
import { getGapClient, useGap } from "@/hooks";
import { ProjectImpact } from "@show-karma/karma-gap-sdk/core/class/entities/ProjectImpact";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useMintClaim } from "@/hooks/useMintClaim";

import { HypercertMetadata, TransferRestrictions } from "@hypercerts-org/sdk";

type CreateImpactCertDialogProps = {
  impact: ProjectImpact;
  mintImpactCertificate: (metadata: HypercertMetadata) => void;
};

const schema = z.object({
  comment: z.string(),
});

type SchemaType = z.infer<typeof schema>;

export const DEFAULT_NUM_FRACTIONS = 10000 as any;

export const CreateImpactCertDialog: FC<CreateImpactCertDialogProps> = ({
  impact,
  mintImpactCertificate,
}) => {
  const [image, setImage] = useState<string>();
  let [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const onComplete = async () => {
    closeModal();
    console.log("completed the hypercert mint");
    // TODO: Do logic to happen after the hypercert mint is complete
  };

  const {
    write: mintClaim,
    txPending: mintClaimPending,
    status,
  } = useMintClaim({
    onComplete,
  });

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

  const hasVerifiedThis = address
    ? impact?.verified?.find(
        (v) => v.attester?.toLowerCase() === address?.toLowerCase()
      )
    : null;
  const { chain } = useNetwork();
  const { switchNetworkAsync } = useSwitchNetwork();
  const { gap } = useGap();

  const onSubmit: SubmitHandler<SchemaType> = async (data) => {
    let gapClient = gap;
    if (!gap) throw new Error("Please, connect a wallet");
    try {
      setIsLoading(true);
      if (!checkNetworkIsValid(chain?.id) || chain?.id !== impact.chainID) {
        await switchNetworkAsync?.(impact.chainID);
        gapClient = getGapClient(impact.chainID);
      }
      const walletClient = await getWalletClient({
        chainId: impact.chainID,
      });
      if (!walletClient || !address || !gapClient) return;
      await mintClaim(
        {
          name: impact.data.impact,
          description: impact.data.work,
          image: image || "",
          version: "0.0.1",
          hypercert: {
            impact_scope: {
              name: "Impact Scope",
              value: [impact.data.impact],
              excludes: [],
              display_value: impact.data.impact,
            },
            work_scope: {
              name: "Work Scope",
              value: [impact.data.work],
              excludes: [],
              display_value: impact.data.work,
            },
            impact_timeframe: {
              name: "Impact Timeframe",
              value: [
                impact.data?.startedAt || impact.data.completedAt,
                impact.data.completedAt,
              ],
              display_value: `${
                impact.data?.startedAt
                  ? new Date(impact.data.startedAt * 1000).toLocaleDateString()
                  : new Date(
                      impact.data.completedAt * 1000
                    ).toLocaleDateString()
              }  ↔ ${new Date(
                impact.data.completedAt * 1000
              ).toLocaleDateString()}`,
            },
            work_timeframe: {
              name: "Work Timeframe",
              value: [
                impact.data?.startedAt || impact.data.completedAt,
                impact.data.completedAt,
              ],
              display_value: `${
                impact.data?.startedAt
                  ? new Date(impact.data.startedAt * 1000).toLocaleDateString()
                  : new Date(
                      impact.data.completedAt * 1000
                    ).toLocaleDateString()
              }  ↔ ${new Date(
                impact.data.completedAt * 1000
              ).toLocaleDateString()}`,
            },
            rights: {
              name: "Rights",
              value: ["Public Display"],
              excludes: [],
              display_value: "Public Display",
            },
            contributors: {
              name: "Contributors",
              value: [], // Assuming contributors will be added during minting
              display_value: "",
            },
          },
          properties: [],
          external_url: "",
        },
        DEFAULT_NUM_FRACTIONS,
        TransferRestrictions.FromCreatorOnly
      )
        .then(async () => {
          toast.success(MESSAGES.PROJECT.IMPACT.CERTIFICATE.SUCCESS);
        })
        .catch((error) => {
          console.error("Error minting hypercert:", error);
          toast.error(MESSAGES.PROJECT.IMPACT.CERTIFICATE.ERROR);
        });
      closeModal();
    } catch (error) {
      console.log(error);
      toast.error(MESSAGES.PROJECT.IMPACT.VERIFY.ERROR);
    } finally {
      setIsLoading(false);
    }
  };
  const isAuthorized = useAuthStore((state) => state.isAuth);

  const { openConnectModal } = useConnectModal();

  if (hasVerifiedThis) return null;

  return (
    <>
      <Button
        onClick={() => {
          if (!isAuthorized || !isConnected) {
            openConnectModal?.();
          } else {
            openModal();
          }
        }}
        className={
          "flex justify-center items-center gap-x-2 rounded-md bg-transparent dark:bg-transparent px-3 py-2 text-sm font-semibold text-red-600 dark:text-red-300  hover:opacity-75 dark:hover:opacity-75 border border-red-200 dark:border-red-900 hover:bg-transparent"
        }
      >
        Create Impact certificate
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
                        className="text-white text-base bg-blue-600 border-black  hover:bg-blue-600 hover:text-white"
                        disabled={isLoading}
                        isLoading={isLoading}
                        type="submit"
                      >
                        Create Impact certificate
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
