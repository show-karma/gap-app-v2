/* eslint-disable @next/next/no-img-element */
import { zodResolver } from "@hookform/resolvers/zod";
import { Milestone } from "@show-karma/karma-gap-sdk";
import type { FC } from "react";
import { useState } from "react";
import type { SubmitHandler } from "react-hook-form";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { useOwnerStore, useProjectStore } from "@/store";
import { useChainId, useSwitchChain } from "wagmi";
import { getGapClient, useGap } from "@/hooks";
import { Hex } from "viem";
import { checkNetworkIsValid } from "@/utilities/checkNetworkIsValid";
import toast from "react-hot-toast";
import { Button } from "@/components/Utilities/Button";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { Popover } from "@headlessui/react";
import { DayPicker } from "react-day-picker";
import { CalendarIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { MESSAGES } from "@/utilities/messages";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { formatDate } from "@/utilities/formatDate";
import { getWalletClient } from "@wagmi/core";
import { useCommunityAdminStore } from "@/store/community";
import { useStepper } from "@/store/modals/txStepper";
import { config } from "@/utilities/wagmi/config";
import {
  IGrantResponse,
  IMilestoneResponse,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { useRouter } from "next/navigation";
import { PAGES } from "@/utilities/pages";
import { errorManager } from "../Utilities/errorManager";
import { sanitizeObject } from "@/utilities/sanitize";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { appNetwork } from "@/utilities/network";

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
        const startsAt = data.startsAt
          ? data.startsAt.getTime() / 1000
          : undefined;

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
  grant: IGrantResponse;
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

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting, isValid },
  } = useForm<MilestoneType>({
    resolver: zodResolver(milestoneSchema),
    reValidateMode: "onChange",
    mode: "onChange",
  });
  const [isLoading, setIsLoading] = useState(false);
  const { gap } = useGap();
  const { switchChainAsync } = useSwitchChain();
  const refreshProject = useProjectStore((state) => state.refreshProject);
  const isCommunityAdmin = useCommunityAdminStore(
    (state) => state.isCommunityAdmin
  );
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
      startsAt: data.dates.startsAt
        ? data.dates.startsAt.getTime() / 1000
        : undefined,
      priority: data.priority,
    });

    try {
      if (!checkNetworkIsValid(chain?.id) || chain?.id !== chainID) {
        await switchChainAsync?.({ chainId: chainID });
        gapClient = getGapClient(chainID);
      }
      const milestoneToAttest = new Milestone({
        refUID: uid,
        schema: gapClient.findSchema("Milestone"),
        recipient: (recipient as Hex) || address,
        data: milestone,
      });

      const walletClient = await getWalletClient(config, {
        chainId: chainID,
      });
      if (!walletClient) return;
      const walletSigner = await walletClientToSigner(walletClient);
      await milestoneToAttest
        .attest(walletSigner as any, changeStepperStep)
        .then(async () => {
          let retries = 1000;
          changeStepperStep("indexing");
          while (retries > 0) {
            await refreshProject()
              .then(async (fetchedProject) => {
                const fetchedGrant = fetchedProject?.grants.find(
                  (g) => g.uid === uid
                );
                const milestoneExists = fetchedGrant?.milestones.find(
                  (g: any) => g.uid === milestoneToAttest.uid
                );
                if (milestoneExists) {
                  retries = 0;
                  changeStepperStep("indexed");
                  toast.success(MESSAGES.MILESTONES.CREATE.SUCCESS);
                  router.push(
                    PAGES.PROJECT.SCREENS.SELECTED_SCREEN(
                      (fetchedProject?.details?.data.slug ||
                        fetchedProject?.uid) as string,
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
      toast.error(MESSAGES.MILESTONES.CREATE.ERROR);
      errorManager(
        `Error creating milestone for grant ${uid} from project ${projectUID}`,
        error,
        {
          grantUID: uid,
          projectUID: projectUID,
          address: address,
          data: milestone,
        }
      );
    } finally {
      setIsLoading(false);
      setIsStepper(false);
    }
  };

  const priorities = Array.from({ length: 5 }, (_, index) => index + 1);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-full flex-col gap-4"
    >
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
                <label className={labelStyle}>
                  Milestone priority (optional)
                </label>
                <div>
                  <Popover className="relative">
                    <Popover.Button className="max-lg:w-full w-max text-sm flex-row flex gap-2 items-center text-black dark:text-white border border-gray-200 bg-white dark:bg-zinc-800 px-4 py-2 rounded-md">
                      {field.value
                        ? `Priority ${field.value}`
                        : `Select priority`}
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
                              disabled={milestones.some(
                                (m: IMilestoneResponse) =>
                                  m.data.priority === priority
                              )}
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
                <p className="text-base text-red-400">
                  {formState.errors.dates?.endsAt?.message}
                </p>
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
            render={({ field, formState, fieldState }) => (
              <div className="flex w-full flex-col gap-2">
                <label className={labelStyle}>Start date (optional)</label>
                <div>
                  <Popover className="relative">
                    <Popover.Button className="max-lg:w-full w-max text-sm flex-row flex gap-2 items-center bg-white dark:bg-zinc-800 border border-gray-200 px-4 py-2 rounded-md">
                      {field.value ? (
                        formatDate(field.value)
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Popover.Button>
                    <Popover.Panel className="absolute z-10 bg-white dark:bg-zinc-800 mt-4 rounded-md">
                      <DayPicker
                        mode="single"
                        selected={field.value}
                        onDayClick={(e) => {
                          setValue("dates.startsAt", e, {
                            shouldValidate: true,
                          });
                          field.onChange(e);
                        }}
                        disabled={(date) => {
                          if (date < new Date("2000-01-01")) return true;
                          return false;
                        }}
                        initialFocus
                      />
                    </Popover.Panel>
                  </Popover>
                </div>
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
            render={({ field, formState, fieldState }) => (
              <div className="flex w-full flex-col gap-2">
                <label className={labelStyle}>End date *</label>
                <div>
                  <Popover className="relative">
                    <Popover.Button className="max-lg:w-full w-max text-sm flex-row flex gap-2 items-center  border border-gray-200 bg-white dark:bg-zinc-800 px-4 py-2 rounded-md">
                      {field.value ? (
                        formatDate(field.value)
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Popover.Button>
                    <Popover.Panel className="absolute z-10 bg-white dark:bg-zinc-800 mt-4 rounded-md">
                      <DayPicker
                        mode="single"
                        selected={field.value}
                        onDayClick={(e) => {
                          setValue("dates.endsAt", e, {
                            shouldValidate: true,
                          });
                          field.onChange(e);
                        }}
                        disabled={(date) => {
                          if (date < new Date("2000-01-01")) return true;
                          const startsAt = watch("dates.startsAt");
                          if (startsAt && date < startsAt) return true;
                          return false;
                        }}
                        initialFocus
                      />
                    </Popover.Panel>
                  </Popover>
                </div>
                <p className="text-base text-red-400">
                  {formState.errors.dates?.endsAt?.message}
                </p>
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
