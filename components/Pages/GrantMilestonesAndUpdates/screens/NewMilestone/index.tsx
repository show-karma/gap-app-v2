/* eslint-disable @next/next/no-img-element */
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Milestone,
  type Grant,
  MilestoneCompleted,
} from "@show-karma/karma-gap-sdk";
import type { FC } from "react";
import { useEffect, useState } from "react";
import type { SubmitHandler } from "react-hook-form";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { useOwnerStore, useProjectStore } from "@/store";
import { MESSAGES, PAGES, formatDate, useSigner } from "@/utilities";
import { useAccount, useNetwork, useSwitchNetwork } from "wagmi";
import { useGap } from "@/hooks";
import { Hex } from "viem";
import { checkNetworkIsValid } from "@/utilities/checkNetworkIsValid";
import toast from "react-hot-toast";
import { useRouter } from "next/router";
import { Button } from "@/components/Utilities/Button";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { Popover } from "@headlessui/react";
import { DayPicker } from "react-day-picker";
import { CalendarIcon } from "@heroicons/react/24/outline";
import { XMarkIcon } from "@heroicons/react/24/solid";

const milestoneSchema = z.object({
  title: z.string().min(3, { message: MESSAGES.MILESTONES.FORM.TITLE }),
  endsAt: z.date({
    required_error: MESSAGES.MILESTONES.FORM.DATE,
  }),
});

const labelStyle = "text-sm font-bold text-black dark:text-zinc-100";
const inputStyle =
  "mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100";

type MilestoneType = z.infer<typeof milestoneSchema>;

interface NewMilestoneProps {
  grant: Grant;
}

export const NewMilestone: FC<NewMilestoneProps> = ({
  grant: { uid, chainID, recipient: grantRecipient },
}) => {
  const form = useForm<z.infer<typeof milestoneSchema>>({
    resolver: zodResolver(milestoneSchema),
  });
  const isOwner = useOwnerStore((state) => state.isOwner);
  const [description, setDescription] = useState("");
  const [recipient, setRecipient] = useState("");
  const [completedUpdate, setCompletedUpdate] = useState("");

  const { address } = useAccount();
  const signer = useSigner();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting, isValid },
  } = useForm<MilestoneType>({
    resolver: zodResolver(milestoneSchema),
    reValidateMode: "onChange",
    mode: "onChange",
  });
  const [isLoading, setIsLoading] = useState(false);
  const { gap } = useGap();
  const { chain } = useNetwork();
  const { switchNetworkAsync } = useSwitchNetwork();
  const selectedProject = useProjectStore((state) => state.project);
  const router = useRouter();

  const refreshProject = useProjectStore((state) => state.refreshProject);

  const onSubmit: SubmitHandler<MilestoneType> = async (data, event) => {
    event?.preventDefault();
    event?.stopPropagation();
    setIsLoading(true);
    if (!address) return;
    if (!gap) throw new Error("Please, connect a wallet");
    const milestone = {
      title: data.title,
      description,
      endsAt: data.endsAt.getTime() / 1000,
      completedText: completedUpdate,
    };

    const milestoneToAttest = new Milestone({
      refUID: uid,
      schema: gap.findSchema("Milestone"),
      recipient: (recipient as Hex) || address,
      data: {
        description: milestone.description,
        endsAt: milestone.endsAt,
        title: milestone.title,
      },
    });
    if (milestone.completedText) {
      milestoneToAttest.completed = new MilestoneCompleted({
        refUID: milestoneToAttest.uid,
        schema: gap.findSchema("MilestoneCompleted"),
        recipient: (recipient as Hex) || address,
        data: {
          reason: milestone.completedText,
          type: "completed",
        },
      });
    }
    try {
      if (!checkNetworkIsValid(chain?.id) || chain?.id !== chainID) {
        await switchNetworkAsync?.(chainID);
      }
      await milestoneToAttest.attest(signer as any).then(async () => {
        toast.success(MESSAGES.MILESTONES.CREATE.SUCCESS);
        await refreshProject().then(() => {
          router.push(
            PAGES.PROJECT.TABS.SELECTED_TAB(
              selectedProject?.uid as string,
              uid,
              "milestones-and-updates"
            )
          );
        });
      });

      const currentGrant = selectedProject?.grants.find(
        (grant) => grant.uid === uid
      );

      currentGrant?.milestones?.push(milestoneToAttest);
    } catch (error) {
      toast.error(MESSAGES.MILESTONES.CREATE.ERROR);
    } finally {
      setIsLoading(false);
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
              router.push(
                PAGES.PROJECT.TABS.SELECTED_TAB(
                  selectedProject?.uid as string,
                  uid,
                  "milestones-and-updates"
                )
              );
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
              Milestone title
            </label>
            <input
              id="milestone-title"
              className={inputStyle}
              placeholder="Ex: Finalize requirements"
              {...register("title")}
            />
            <p className="text-base text-red-400">{errors.title?.message}</p>
          </div>
          <div className="flex w-full flex-row justify-between gap-4">
            <Controller
              name="endsAt"
              control={form.control}
              render={({ field, formState, fieldState }) => (
                <div className="flex w-full flex-col gap-2">
                  <label className={labelStyle}>End date</label>
                  <div>
                    <Popover className="relative">
                      <Popover.Button className="w-max text-sm flex-row flex gap-2 items-center bg-white dark:bg-zinc-800 px-4 py-2 rounded-md">
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
                            setValue("endsAt", e, { shouldValidate: true });
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
                    {formState.errors.endsAt?.message}
                  </p>
                </div>
              )}
            />
          </div>
          {isOwner && (
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
                className="bg-transparent"
                value={description}
                onChange={(newValue: string) => setDescription(newValue || "")}
                placeholderText="Please provide a concise description of your objectives for this milestone"
              />
            </div>
          </div>
          <div className="flex w-full flex-col">
            <label htmlFor="milestone-completed-update" className={labelStyle}>
              Milestone update (optional)
            </label>
            <div className="mt-2 w-full bg-transparent" data-color-mode="light">
              <MarkdownEditor
                className="bg-transparent"
                value={completedUpdate}
                onChange={(newValue: string) =>
                  setCompletedUpdate(newValue || "")
                }
                placeholderText="If this milestone is complete, please provide details for the community to understand more about its completion. Alternatively, you can post an update about this milestone at a later date"
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
