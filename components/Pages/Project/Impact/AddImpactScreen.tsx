/* eslint-disable @next/next/no-img-element */
import { Button } from "@/components/Utilities/Button";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { getGapClient, useGap } from "@/hooks";
import { useProjectStore } from "@/store";
import { useSigner, walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { formatDate } from "@/utilities/formatDate";
import { MESSAGES } from "@/utilities/messages";
import { Popover } from "@headlessui/react";
import { CalendarIcon } from "@heroicons/react/24/outline";
import { zodResolver } from "@hookform/resolvers/zod";
import { ProjectImpact } from "@show-karma/karma-gap-sdk/core/class/entities/ProjectImpact";
import { getWalletClient } from "@wagmi/core";
import { useRouter } from "next/router";
import { useQueryState } from "nuqs";
import type { FC } from "react";
import { useState } from "react";
import { DayPicker } from "react-day-picker";
import type { SubmitHandler } from "react-hook-form";
import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useAccount, useNetwork, useSwitchNetwork } from "wagmi";
import { z } from "zod";

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

  const { address } = useAccount();
  const { chain } = useNetwork();
  const { switchNetworkAsync } = useSwitchNetwork();
  const project = useProjectStore((state) => state.project);
  const refreshProject = useProjectStore((state) => state.refreshProject);
  const [, changeTab] = useQueryState("tab");
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting, isValid },
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

  const onSubmit: SubmitHandler<UpdateType> = async (data, event) => {
    event?.preventDefault();
    event?.stopPropagation();
    const { completedAt, startedAt } = data;
    if (!address || !project) return;
    setIsLoading(true);
    let gapClient = gap;
    try {
      if (chain && chain.id !== project.chainID) {
        await switchNetworkAsync?.(project.chainID);
        gapClient = getGapClient(project.chainID);
      }
      const walletClient = await getWalletClient({
        chainId: project.chainID,
      });
      if (!walletClient || !address || !gapClient) return;
      const walletSigner = await walletClientToSigner(walletClient);
      const dataToAttest = {
        work,
        impact,
        proof,
        startedAt: startedAt.getTime() / 1000,
        completedAt: completedAt.getTime() / 1000,
      };
      const newImpact = new ProjectImpact({
        data: dataToAttest,
        recipient: address,
        attester: address,
        schema: gapClient!.findSchema("ProjectImpact"),
        refUID: project.uid,
        createdAt: new Date(),
      });
      await newImpact.attest(walletSigner as any).then(async () => {
        toast.success(MESSAGES.PROJECT.IMPACT.SUCCESS);
        const newImpacts = [...project.impacts, newImpact];
        const ordered = newImpacts.sort((a, b) => {
          return b.data.completedAt - a.data.completedAt;
        });
        project.impacts = ordered;
        changeTab(null);
      });
    } catch (error) {
      console.log(error);
      toast.error(MESSAGES.PROJECT.IMPACT.ERROR);
    } finally {
      setIsLoading(false);
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
                className="bg-transparent"
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
              render={({ field, formState, fieldState }) => (
                <div className="flex w-full flex-col gap-2 mr-2">
                  <label className={labelStyle}>Started at *</label>
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
                            setValue("startedAt", e, {
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
                    {formState.errors.startedAt?.message}
                  </p>
                </div>
              )}
            />

            <Controller
              name="completedAt"
              control={control}
              render={({ field, formState, fieldState }) => (
                <div className="flex w-full flex-col gap-2">
                  <label className={labelStyle}>Completed at *</label>
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
                            setValue("completedAt", e, {
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
                className="bg-transparent"
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
                className="bg-transparent"
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
