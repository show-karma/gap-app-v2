/* eslint-disable @next/next/no-img-element */

import { Popover } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { zodResolver } from "@hookform/resolvers/zod";
import { Milestone } from "@show-karma/karma-gap-sdk";
import type { IMilestoneResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { useRouter } from "next/navigation";
import type { FC } from "react";
import { useState } from "react";
import type { SubmitHandler } from "react-hook-form";
import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import type { Hex } from "viem";
import { useAccount } from "wagmi";
import { z } from "zod";
import { Button } from "@/components/Utilities/Button";
import { DatePicker } from "@/components/Utilities/DatePicker";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { useGap } from "@/hooks/useGap";
import { useWallet } from "@/hooks/useWallet";
import { useOwnerStore, useProjectStore } from "@/store";
import { useCommunityAdminStore } from "@/store/communityAdmin";
import { useStepper } from "@/store/modals/txStepper";
import type { GrantResponse } from "@/types/v2/grant";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { ensureCorrectChain } from "@/utilities/ensureCorrectChain";
import fetchData from "@/utilities/fetchData";
import { formatDate } from "@/utilities/formatDate";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { PAGES } from "@/utilities/pages";
import { sanitizeObject } from "@/utilities/sanitize";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";
import { errorManager } from "../Utilities/errorManager";

const milestoneSchema = z.object({
  title: z
    .string()
    .min(3, { message: MESSAGES.MILESTONES.FORM.TITLE.MIN })
    .max(50, { message: MESSAGES.MILESTONES.FORM.TITLE.MAX }),
  priority: z.number().optional(),
  description: z.string().optional(),
  dates: z
    .object({
      endsAt: z.date({
        required_error: MESSAGES.MILESTONES.FORM.DATE,
      }),
      startsAt: z.date().optional(),
    })
    .refine(
      (data) => {
        const endsAt = data.endsAt.getTime() / 1000;
        const startsAt = data.startsAt ? data.startsAt.getTime() / 1000 : undefined;

        return startsAt ? startsAt <= endsAt : true;
      },
      {
        message: "Start date must be before the end date",
        path: ["dates", "startsAt"],
      }
    ),
});

const labelStyle = "text-sm font-bold text-black dark:text-zinc-100";
const inputStyle =
  "mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100";

type MilestoneType = z.infer<typeof milestoneSchema>;

interface MilestoneFormProps {
  grant: GrantResponse;
  afterSubmit?: () => void;
}

export const MilestoneForm: FC<MilestoneFormProps> = ({
  grant: { uid, chainID, milestones },
  afterSubmit,
}) => {
  const form = useForm<z.infer<typeof milestoneSchema>>({
    resolver: zodResolver(milestoneSchema),
  });
  const isOwner = useOwnerStore((state) => state.isOwner);
  const [recipient, setRecipient] = useState("");

  const { address } = useAccount();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting, isValid },
  } = useForm<MilestoneType>({
    resolver: zodResolver(milestoneSchema),
    reValidateMode: "onChange",
    mode: "onChange",
  });
  const [isLoading, setIsLoading] = useState(false);
  const { gap } = useGap();
  const { chain } = useAccount();
  const { switchChainAsync } = useWallet();
  const refreshProject = useProjectStore((state) => state.refreshProject);
  const isCommunityAdmin = useCommunityAdminStore((state) => state.isCommunityAdmin);
  const project = useProjectStore((state) => state.project);
  const projectUID = project?.uid;

  const { changeStepperStep, setIsStepper } = useStepper();

  const router = useRouter();

  const onSubmit: SubmitHandler<MilestoneType> = async (data, event) => {
    event?.preventDefault();
    event?.stopPropagation();
    setIsLoading(true);
    if (!address) return;
    if (!gap) throw new Error("Please, connect a wallet");
    let gapClient = gap;
    const milestone = sanitizeObject({
      title: data.title,
      description: data.description || "",
      endsAt: data.dates.endsAt.getTime() / 1000,
      startsAt: data.dates.startsAt ? data.dates.startsAt.getTime() / 1000 : undefined,
      priority: data.priority,
    });

    try {
      const {
        success,
        chainId: actualChainId,
        gapClient: newGapClient,
      } = await ensureCorrectChain({
        targetChainId: chainID,
        currentChainId: chain?.id,
        switchChainAsync,
      });

      if (!success) {
        setIsLoading(false);
        return;
      }

      gapClient = newGapClient;

      const milestoneToAttest = new Milestone({
        refUID: uid as `0x${string}`,
        schema: gapClient.findSchema("Milestone"),
        recipient: (recipient as Hex) || address,
        data: milestone,
      });

      const { walletClient, error } = await safeGetWalletClient(actualChainId);

      if (error || !walletClient || !gapClient) {
        throw new Error("Failed to connect to wallet", { cause: error });
      }
      const walletSigner = await walletClientToSigner(walletClient);
      await milestoneToAttest.attest(walletSigner as any, changeStepperStep).then(async (res) => {
        let retries = 1000;
        const txHash = res?.tx[0]?.hash;
        if (txHash) {
          await fetchData(
            INDEXER.ATTESTATION_LISTENER(txHash, milestoneToAttest.chainID),
            "POST",
            {}
          );
        }
        changeStepperStep("indexing");
        while (retries > 0) {
          await refreshProject()
            .then(async (fetchedProject) => {
              const fetchedGrant = fetchedProject?.grants?.find((g) => g.uid === uid);
              const milestoneExists = fetchedGrant?.milestones?.find(
                (g: any) => g.uid === milestoneToAttest.uid
              );
              if (milestoneExists) {
                retries = 0;
                changeStepperStep("indexed");
                toast.success(MESSAGES.MILESTONES.CREATE.SUCCESS);
                router.push(
                  PAGES.PROJECT.SCREENS.SELECTED_SCREEN(
                    (fetchedProject?.details?.slug || fetchedProject?.uid) as string,
                    fetchedGrant?.uid as string,
                    "milestones-and-updates"
                  )
                );
                router.refresh();
                afterSubmit?.();
              }
              retries -= 1;
              // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
              await new Promise((resolve) => setTimeout(resolve, 1500));
            })
            .catch(async () => {
              retries -= 1;
              // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
              await new Promise((resolve) => setTimeout(resolve, 1500));
            });
        }
      });
    } catch (error) {
      console.error(error);
      errorManager(
        MESSAGES.MILESTONES.CREATE.ERROR(data.title),
        error,
        {
          grantUID: uid,
          projectUID: projectUID,
          address: address,
          data: milestone,
        },
        {
          error: MESSAGES.MILESTONES.CREATE.ERROR(data.title),
        }
      );
    } finally {
      setIsLoading(false);
      setIsStepper(false);
    }
  };

  const priorities = Array.from({ length: 5 }, (_, index) => index + 1);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex w-full flex-col gap-4">
      <div className="flex w-full flex-col">
        <label htmlFor="milestone-title" className={labelStyle}>
          Milestone title *
        </label>
        <input
          id="milestone-title"
          className={inputStyle}
          placeholder="Ex: Finalize requirements"
          {...register("title")}
        />
        <p className="text-base text-red-400">{errors.title?.message}</p>
      </div>
      <div className="flex w-full flex-row items-center justify-between gap-4">
        <div className="flex w-full flex-row justify-between gap-4">
          <Controller
            name="priority"
            control={form.control}
            render={({ field, formState, fieldState }) => (
              <div className="flex w-full flex-col gap-2">
                <div className={labelStyle}>Milestone priority (optional)</div>
                <div>
                  <Popover className="relative">
                    <Popover.Button className="max-lg:w-full w-max text-sm flex-row flex gap-2 items-center text-black dark:text-white border border-gray-200 bg-white dark:bg-zinc-800 px-4 py-2 rounded-md">
                      {field.value ? `Priority ${field.value}` : `Select priority`}
                      <ChevronDownIcon className="ml-auto h-4 w-4 opacity-50 text-black dark:text-white" />
                    </Popover.Button>
                    <Popover.Panel className="absolute z-10 bg-white dark:bg-zinc-800 mt-4 rounded-md w-[160px] scroll-smooth overflow-y-auto overflow-x-hidden py-2">
                      {({ close }) => (
                        <>
                          <button
                            key={"none"}
                            className="cursor-pointer hover:opacity-75 text-sm flex flex-row items-center justify-start py-2 px-4 hover:bg-zinc-200 dark:hover:bg-zinc-900 w-full disabled:opacity-30 disabled:cursor-not-allowed disabled:bg-zinc-200 dark:disabled:bg-zinc-900"
                            onClick={(event) => {
                              event?.preventDefault();
                              event?.stopPropagation();
                              field.onChange(undefined);
                              setValue("priority", undefined, {
                                shouldValidate: true,
                              });

                              close();
                            }}
                          >
                            None
                          </button>
                          {priorities.map((priority) => (
                            <button
                              key={priority}
                              className="cursor-pointer hover:opacity-75 text-sm flex flex-row items-center justify-start py-2 px-4 hover:bg-zinc-200 dark:hover:bg-zinc-900 w-full disabled:opacity-30 disabled:cursor-not-allowed disabled:bg-zinc-200 dark:disabled:bg-zinc-900"
                              disabled={milestones?.some((m) => m.priority === priority)}
                              onClick={(event) => {
                                event?.preventDefault();
                                event?.stopPropagation();
                                if (watch("priority") === priority) {
                                  field.onChange(undefined);
                                  setValue("priority", undefined, {
                                    shouldValidate: true,
                                  });
                                } else {
                                  field.onChange(priority);
                                  setValue("priority", priority, {
                                    shouldValidate: true,
                                  });
                                }
                                close();
                              }}
                            >
                              Priority {priority}
                            </button>
                          ))}
                        </>
                      )}
                    </Popover.Panel>
                  </Popover>
                </div>
                <p className="text-base text-red-400">{formState.errors.dates?.endsAt?.message}</p>
              </div>
            )}
          />
        </div>
      </div>
      <div className="flex w-full flex-row items-center justify-between gap-4">
        <div className="flex w-full flex-row justify-between gap-4">
          <Controller
            name="dates.startsAt"
            control={form.control}
            render={({ field, formState }) => (
              <div className="flex w-full flex-col gap-2">
                <div className={labelStyle}>Start date (optional)</div>
                <DatePicker
                  selected={field.value}
                  onSelect={(date) => {
                    if (formatDate(date) === formatDate(watch("dates.startsAt") || "")) {
                      setValue("dates.startsAt", undefined, {
                        shouldValidate: true,
                      });
                      field.onChange(undefined);
                    } else {
                      setValue("dates.startsAt", date, {
                        shouldValidate: true,
                      });
                      field.onChange(date);
                    }
                  }}
                  placeholder="Pick a date"
                  clearButtonFn={() => {
                    setValue("dates.startsAt", undefined, {
                      shouldValidate: true,
                    });
                    field.onChange(undefined);
                  }}
                />
                <p className="text-base text-red-400">
                  {formState.errors.dates?.startsAt?.message}
                </p>
              </div>
            )}
          />
        </div>
        <div className="flex w-full flex-row justify-between gap-4">
          <Controller
            name="dates.endsAt"
            control={form.control}
            render={({ field, formState }) => (
              <div className="flex w-full flex-col gap-2">
                <div className={labelStyle}>End date *</div>
                <DatePicker
                  selected={field.value}
                  onSelect={(date) => {
                    setValue("dates.endsAt", date, {
                      shouldValidate: true,
                    });
                    field.onChange(date);
                  }}
                  minDate={watch("dates.startsAt")}
                  placeholder="Pick a date"
                />
                <p className="text-base text-red-400">{formState.errors.dates?.endsAt?.message}</p>
              </div>
            )}
          />
        </div>
      </div>
      {(isOwner || isCommunityAdmin) && (
        <div className="flex w-full flex-col gap-2">
          <label htmlFor="tags-input" className={labelStyle}>
            Recipient address
          </label>
          <input
            id="tags-input"
            type="text"
            className={inputStyle}
            placeholder="0xab...0xbf2"
            onChange={(e) => setRecipient(e.target.value)}
          />
        </div>
      )}
      <div className="flex w-full flex-col">
        <label htmlFor="milestone-description" className={labelStyle}>
          Milestone description (optional)
        </label>
        <div className="mt-2 w-full bg-transparent" data-color-mode="light">
          <MarkdownEditor
            value={watch("description") || ""}
            onChange={(newValue: string) => {
              setValue("description", newValue || "", {
                shouldValidate: true,
              });
            }}
            placeholderText="Please provide a concise description of your objectives for this milestone"
          />
        </div>
      </div>

      <div className="flex w-full flex-row-reverse">
        <Button
          type="submit"
          className="flex w-max flex-row bg-slate-600 text-slate-200"
          disabled={isSubmitting || !isValid}
          isLoading={isSubmitting || isLoading}
        >
          Create milestone
        </Button>
      </div>
    </form>
  );
};
