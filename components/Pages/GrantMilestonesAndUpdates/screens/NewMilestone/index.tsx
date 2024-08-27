/* eslint-disable @next/next/no-img-element */
import { zodResolver } from "@hookform/resolvers/zod";
import { Milestone, MilestoneCompleted } from "@show-karma/karma-gap-sdk";
import type { FC } from "react";
import { useEffect, useState } from "react";
import type { SubmitHandler } from "react-hook-form";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { useOwnerStore, useProjectStore } from "@/store";
import { useAccount, useSwitchChain } from "wagmi";
import { getGapClient, useGap } from "@/hooks";
import { Hex } from "viem";
import { checkNetworkIsValid } from "@/utilities/checkNetworkIsValid";
import toast from "react-hot-toast";
import { Button } from "@/components/Utilities/Button";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { Popover } from "@headlessui/react";
import { DayPicker } from "react-day-picker";
import { CalendarIcon } from "@heroicons/react/24/outline";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { useQueryState } from "nuqs";
import { MESSAGES } from "@/utilities/messages";
import { useSigner, walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { formatDate } from "@/utilities/formatDate";
import { getWalletClient } from "@wagmi/core";
import { useCommunityAdminStore } from "@/store/community";
import { useStepper } from "@/store/modals/txStepper";
import { config } from "@/utilities/wagmi/config";
import { IGrantResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

import { errorManager } from "@/components/Utilities/errorManager";
import { sanitizeInput, sanitizeObject } from "@/utilities/sanitize";
import { urlRegex } from "@/utilities/regexs/urlRegex";
import { cn } from "@/utilities/tailwind";

const milestoneSchema = z.object({
  title: z.string().min(3, { message: MESSAGES.MILESTONES.FORM.TITLE }),
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

interface NewMilestoneProps {
  grant: IGrantResponse;
}

export const NewMilestone: FC<NewMilestoneProps> = ({ grant }) => {
  const { uid, chainID, recipient: grantRecipient } = grant;
  const project = useProjectStore((state) => state.project);
  const projectUID = project?.uid;
  const form = useForm<z.infer<typeof milestoneSchema>>({
    resolver: zodResolver(milestoneSchema),
  });
  const isOwner = useOwnerStore((state) => state.isOwner);
  const [description, setDescription] = useState("");
  const [recipient, setRecipient] = useState("");

  const { address } = useAccount();
  const signer = useSigner();

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
  const { chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const refreshProject = useProjectStore((state) => state.refreshProject);
  const [, changeTab] = useQueryState("tab");
  const isCommunityAdmin = useCommunityAdminStore(
    (state) => state.isCommunityAdmin
  );

  const { changeStepperStep, setIsStepper } = useStepper();

  const onSubmit: SubmitHandler<MilestoneType> = async (data, event) => {
    event?.preventDefault();
    event?.stopPropagation();
    setIsLoading(true);
    if (!address) return;
    if (!gap) throw new Error("Please, connect a wallet");
    let gapClient = gap;
    const milestone = {
      title: data.title,
      description,
      endsAt: data.dates.endsAt.getTime() / 1000,
      startsAt: data.dates.startsAt
        ? data.dates.startsAt.getTime() / 1000
        : undefined,
    };

    try {
      if (!checkNetworkIsValid(chain?.id) || chain?.id !== chainID) {
        await switchChainAsync?.({ chainId: chainID });
        gapClient = getGapClient(chainID);
      }
      const sanitizedMilestone = sanitizeObject({
        description: milestone.description,
        endsAt: milestone.endsAt,
        startsAt: milestone.startsAt,
        title: milestone.title,
      });
      const milestoneToAttest = new Milestone({
        refUID: uid,
        schema: gapClient.findSchema("Milestone"),
        recipient: (recipient as Hex) || address,
        data: sanitizedMilestone,
      });

      const walletClient = await getWalletClient(config, {
        chainId: chainID,
      });
      if (!walletClient) return;
      const walletSigner = await walletClientToSigner(walletClient);
      await milestoneToAttest
        .attest(walletSigner as any, changeStepperStep)
        .then(async (res) => {
          let retries = 1000;
          changeStepperStep("indexing");
          const txHash = res?.tx[0]?.hash;
          if (txHash) {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(txHash, chainID),
              "POST",
              {}
            );
          }
          while (retries > 0) {
            await refreshProject()
              .then(async (fetchedProject) => {
                const grant = fetchedProject?.grants.find((g) => g.uid === uid);
                const milestoneExists = grant?.milestones.find(
                  (g: any) => g.uid === milestoneToAttest.uid
                );
                if (milestoneExists) {
                  retries = 0;
                  changeStepperStep("indexed");
                  toast.success(MESSAGES.MILESTONES.CREATE.SUCCESS);
                  changeTab("milestones-and-updates");
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
    } catch (error: any) {
      console.error(error);
      toast.error(MESSAGES.MILESTONES.CREATE.ERROR);
      errorManager(
        `Error creating milestone for grant ${uid} from project ${projectUID}`,
        error
      );
    } finally {
      setIsLoading(false);
      setIsStepper(false);
    }
  };

  return (
    <div className="flex flex-1">
      <div className="flex w-full max-w-3xl flex-col gap-6 rounded-md bg-gray-200 dark:bg-zinc-900 px-4 py-6 max-lg:max-w-full">
        <div className="flex w-full flex-row items-center justify-between">
          <h4 className="text-2xl font-bold text-black dark:text-zinc-100">
            Add milestone
          </h4>
          <Button
            className="bg-transparent p-4 hover:bg-transparent hover:opacity-75 text-black dark:text-zinc-100"
            onClick={() => {
              changeTab("milestones-and-updates");
            }}
          >
            <XMarkIcon className="h-8 w-8" />
          </Button>
        </div>
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
                name="dates.startsAt"
                control={form.control}
                render={({ field, formState, fieldState }) => (
                  <div className="flex w-full flex-col gap-2">
                    <label className={labelStyle}>Start date (optional)</label>
                    <div>
                      <Popover className="relative">
                        <Popover.Button className="max-lg:w-full w-max text-sm flex-row flex gap-2 items-center bg-white dark:bg-zinc-800 px-4 py-2 rounded-md">
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
                        <Popover.Button className="max-lg:w-full w-max text-sm flex-row flex gap-2 items-center bg-white dark:bg-zinc-800 px-4 py-2 rounded-md">
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
                value={description}
                onChange={(newValue: string) => setDescription(newValue || "")}
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
      </div>
    </div>
  );
};
