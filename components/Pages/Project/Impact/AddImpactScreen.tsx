/* eslint-disable @next/next/no-img-element */
import { Button } from "@/components/Utilities/Button";
import { errorManager } from "@/components/Utilities/errorManager";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { getGapClient, useGap } from "@/hooks/useGap";
import { useProjectStore } from "@/store";
import { useStepper } from "@/store/modals/txStepper";
import fetchData from "@/utilities/fetchData";
import { formatDate } from "@/utilities/formatDate";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { sanitizeObject } from "@/utilities/sanitize";
import { config } from "@/utilities/wagmi/config";
import { Popover } from "@headlessui/react";
import { CalendarIcon } from "@heroicons/react/24/outline";
import { zodResolver } from "@hookform/resolvers/zod";
import { ProjectImpact } from "@show-karma/karma-gap-sdk/core/class/entities/ProjectImpact";
import { getWalletClient } from "@wagmi/core";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";
import { useQueryState } from "nuqs";
import type { FC } from "react";
import { useState } from "react";
import { DayPicker } from "react-day-picker";
import type { SubmitHandler } from "react-hook-form";
import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Hex } from "viem";

import { z } from "zod";
import { DatePicker } from "@/components/Utilities/DatePicker";
import { useWallet } from "@/hooks/useWallet";

const updateSchema = z.object({
  startedAt: z.date({
    required_error: MESSAGES.PROJECT.IMPACT.FORM.DATE,
  }),
  completedAt: z.date({
    required_error: MESSAGES.PROJECT.IMPACT.FORM.DATE,
  }),
});

const labelStyle = "text-sm font-bold text-black dark:text-zinc-100";
const inputStyle =
  "mt-2 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-300";

type UpdateType = z.infer<typeof updateSchema>;

interface AddImpactScreenProps {}

export const AddImpactScreen: FC<AddImpactScreenProps> = () => {
  const [proof, setProof] = useState("");
  const [impact, setImpact] = useState("");
  const [work, setWork] = useState("");

  const { address, chain, switchChainAsync, getSigner } = useWallet();
  const project = useProjectStore((state) => state.project);
  const refreshProject = useProjectStore((state) => state.refreshProject);
  const [, changeTab] = useQueryState("tab");
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting, isValid },
    watch,
  } = useForm<UpdateType>({
    resolver: zodResolver(updateSchema),
    reValidateMode: "onChange",
    mode: "onChange",
    defaultValues: {
      startedAt: new Date(),
      completedAt: new Date(),
    },
  });
  const [isLoading, setIsLoading] = useState(false);
  const { gap } = useGap();
  const { changeStepperStep, setIsStepper } = useStepper();

  const onSubmit: SubmitHandler<UpdateType> = async (data, event) => {
    event?.preventDefault();
    event?.stopPropagation();
    const { completedAt, startedAt } = data;
    if (!address || !project) return;
    setIsLoading(true);
    let gapClient = gap;
    try {
      if (chain?.id !== project.chainID) {
        await switchChainAsync?.({ chainId: project.chainID });
        gapClient = getGapClient(project.chainID);
      }

      const { walletClient, error } = await safeGetWalletClient(
        project.chainID as number
      );

      if (error || !walletClient || !gapClient) {
        throw new Error("Failed to connect to wallet", { cause: error });
      }

      const walletSigner = await getSigner();
      const dataToAttest = sanitizeObject({
        work,
        impact,
        proof,
        startedAt: Math.floor(startedAt.getTime() / 1000),
        completedAt: Math.floor(completedAt.getTime() / 1000),
        verified: [],
      });
      const newImpact = new ProjectImpact({
        data: dataToAttest,
        recipient: address as `0x${string}`,
        attester: address as `0x${string}`,
        schema: gapClient!.findSchema("ProjectImpact"),
        refUID: project.uid,
        createdAt: new Date(),
      });
      await newImpact
        .attest(walletSigner as any, changeStepperStep)
        .then(async (res) => {
          const txHash = res?.tx[0]?.hash;
          if (txHash) {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(txHash, newImpact.chainID),
              "POST",
              {}
            );
          }
          let retries = 1000;
          changeStepperStep("indexing");
          let fetchedProject = null;
          while (retries > 0) {
            fetchedProject = await gapClient!.fetch
              .projectById(project.uid as Hex)
              .catch(() => null);
            if (
              fetchedProject?.impacts?.find(
                (impact) => impact.uid === newImpact.uid
              )
            ) {
              retries = 0;
              changeStepperStep("indexed");
              changeTab(null);
              await refreshProject();
            }
            retries -= 1;
            // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
        });
    } catch (error: any) {
      errorManager(
        MESSAGES.PROJECT.IMPACT.ERROR,
        error,
        {
          projectUID: project.uid,
          address,
        },
        {
          error: MESSAGES.PROJECT.IMPACT.ERROR,
        }
      );
    } finally {
      setIsLoading(false);
      setIsStepper(false);
    }
  };

  const isDescriptionValid = !!proof.length || !!impact.length;

  return (
    <div className="flex flex-1">
      <div className="flex w-full max-w-3xl flex-col gap-6 rounded-md bg-gray-200 dark:bg-zinc-900  px-4 py-6 max-lg:max-w-full">
        <div className="flex w-full flex-row justify-between">
          <h4 className="text-2xl font-bold text-black dark:text-zinc-100">
            Add impact work
          </h4>
          <button
            className="bg-transparent p-4 hover:bg-transparent hover:opacity-75"
            onClick={() => {
              changeTab(null);
            }}
          >
            <img src="/icons/close.svg" alt="Close" className="h-5 w-5 " />
          </button>
        </div>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex w-full flex-col gap-4"
        >
          <div className="flex w-full flex-col">
            <label htmlFor="work" className={labelStyle}>
              Explain the work you did *
            </label>
            <div className="w-full bg-transparent" data-color-mode="light">
              <MarkdownEditor
                value={work}
                onChange={(newValue: string) => setWork(newValue || "")}
                placeholderText="Organized an onboarding event"
              />
            </div>
          </div>
          <div className="flex w-full flex-row">
            <Controller
              name="startedAt"
              control={control}
              render={({ field, formState }) => (
                <div className="flex w-full flex-col gap-2 mr-2">
                  <label className={labelStyle}>Started at *</label>
                  <DatePicker
                    selected={field.value}
                    onSelect={(date) => {
                      setValue("startedAt", date, {
                        shouldValidate: true,
                      });
                      field.onChange(date);
                    }}
                    minDate={new Date("2000-01-01")}
                    placeholder="Pick a date"
                    buttonClassName="w-full text-base bg-white dark:bg-zinc-800"
                  />
                  <p className="text-base text-red-400">
                    {formState.errors.startedAt?.message}
                  </p>
                </div>
              )}
            />

            <Controller
              name="completedAt"
              control={control}
              render={({ field, formState }) => (
                <div className="flex w-full flex-col gap-2">
                  <label className={labelStyle}>Completed at *</label>
                  <DatePicker
                    selected={field.value}
                    onSelect={(date) => {
                      setValue("completedAt", date, {
                        shouldValidate: true,
                      });
                      field.onChange(date);
                    }}
                    minDate={watch("startedAt")}
                    placeholder="Pick a date"
                    buttonClassName="w-full text-base bg-white dark:bg-zinc-800"
                  />
                  <p className="text-base text-red-400">
                    {formState.errors.completedAt?.message}
                  </p>
                </div>
              )}
            />
          </div>

          <div className="flex w-full gap-2 flex-col">
            <label htmlFor="impact" className={labelStyle}>
              What impact did your work have? *
            </label>
            <div className="w-full bg-transparent" data-color-mode="light">
              <MarkdownEditor
                value={impact}
                onChange={(newValue: string) => setImpact(newValue || "")}
                placeholderText="We onboarded 100 users on to the platform (Add as much details as possible)."
              />
            </div>
          </div>
          <div className="flex w-full gap-2 flex-col">
            <label htmlFor="proof" className={labelStyle}>
              Add Proof of Impact *
            </label>
            <div className="w-full bg-transparent" data-color-mode="light">
              <MarkdownEditor
                value={proof}
                onChange={(newValue: string) => setProof(newValue || "")}
                placeholderText="Add links to charts, videos, dashboards etc. that evaluators can check to verify your work and impact"
              />
            </div>
          </div>
          <div className="flex w-full flex-row-reverse">
            <Button
              type="submit"
              className="flex w-max flex-row bg-slate-600 text-slate-200 hover:bg-slate-800 hover:text-slate-200"
              disabled={
                isSubmitting ||
                !isValid ||
                !isDescriptionValid ||
                !work.length ||
                !proof.length ||
                !impact.length
              }
              isLoading={isSubmitting || isLoading}
            >
              Add impact
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
