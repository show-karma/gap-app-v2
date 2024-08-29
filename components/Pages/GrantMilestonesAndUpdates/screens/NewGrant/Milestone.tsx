"use client";
/* eslint-disable @next/next/no-img-element */
import { Button } from "@/components/Utilities/Button";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";

import { formatDate } from "@/utilities/formatDate";
import { Popover } from "@headlessui/react";
import { CalendarIcon, PencilIcon } from "@heroicons/react/24/outline";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { zodResolver } from "@hookform/resolvers/zod";
import { type FC, useState, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import type { SubmitHandler } from "react-hook-form";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { useGrantFormStore } from "./store";
import { IMilestone } from "@show-karma/karma-gap-sdk";

interface MilestoneProps {
  currentMilestone: IMilestone;
  index: number;
}

const labelStyle = "text-sm font-bold";
const inputStyle =
  "mt-2 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white";

const milestoneSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters" }),
  dates: z
    .object({
      endsAt: z.date({
        required_error: "Date is required.",
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
  description: z.string().optional(),
});

type MilestoneType = z.infer<typeof milestoneSchema>;

export const Milestone: FC<MilestoneProps> = ({ currentMilestone, index }) => {
  const form = useForm<z.infer<typeof milestoneSchema>>({
    resolver: zodResolver(milestoneSchema),
  });
  const {
    removeMilestone,
    saveMilestone,
    changeMilestoneForm,
    switchMilestoneEditing,
    milestonesForms,
  } = useGrantFormStore();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<MilestoneType>({
    resolver: zodResolver(milestoneSchema),
    reValidateMode: "onChange",
    mode: "onChange",
  });

  const switchEditing = () => {
    switchMilestoneEditing(index);
  };

  const onSubmit: SubmitHandler<MilestoneType> = (data, event) => {
    event?.preventDefault();
    event?.stopPropagation();
    saveMilestone(
      {
        title: data.title,
        description: data.description || "",
        endsAt: data.dates.endsAt.getTime() / 1000,
        startsAt: data.dates.startsAt
          ? data.dates.startsAt.getTime() / 1000
          : undefined,
      },
      index
    );
  };

  useEffect(() => {
    if (isValid) {
      const title = watch("title") || currentMilestone.title;
      const description = watch("description") || currentMilestone.description;
      const endsAt =
        watch("dates.endsAt").getTime() / 1000 || currentMilestone.endsAt;
      const startsAt = watch("dates.startsAt")
        ? watch("dates.startsAt")!.getTime() / 1000
        : currentMilestone.startsAt;
      changeMilestoneForm(index, {
        isValid: isValid,
        isEditing: milestonesForms[index].isEditing,
        data: {
          title,
          description,
          endsAt,
          startsAt,
        },
      });
    }
  }, [isValid]);

  return milestonesForms[index].isEditing ? (
    <div className="flex w-full flex-col gap-6 rounded-md bg-gray-200 dark:bg-zinc-700 px-4 py-6">
      <div className="flex w-full flex-row justify-between">
        <h4 className="text-2xl font-bold">Add milestone {index + 1}</h4>
        <Button
          onClick={() => removeMilestone(index)}
          className="bg-transparent p-4 hover:bg-transparent hover:opacity-75"
        >
          <img src="/icons/close.svg" alt="Close" className="h-4 w-4 " />
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
        <div className="flex w-full flex-col">
          <label htmlFor="milestone-description" className={labelStyle}>
            Milestone description (optional)
          </label>
          <div className="mt-3 w-full bg-transparent" data-color-mode="light">
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
            disabled={!isValid}
            className="flex w-max flex-row bg-slate-700 text-slate-200 dark:bg-slate-900"
          >
            Save Milestone
          </Button>
        </div>
      </form>
    </div>
  ) : (
    <div className="flex w-full flex-row justify-between gap-6 rounded-md bg-gray-200 dark:bg-zinc-800 px-4 py-6">
      <div className="flex w-full flex-col gap-2" data-color-mode="light">
        <div className="flex w-full  flex-row items-center justify-between gap-6">
          <div className="flex flex-col gap-2">
            <h3 className="text-lg font-bold">{currentMilestone.title}</h3>
            <p>
              {currentMilestone.startsAt
                ? `${formatDate(currentMilestone.startsAt * 1000)} - `
                : null}
              {formatDate(currentMilestone.endsAt * 1000)}
            </p>
          </div>
          <div className="flex w-max flex-row justify-center gap-4">
            <Button
              onClick={() => switchEditing()}
              className="bg-transparent text-black dark:text-white p-4 hover:bg-transparent hover:opacity-75"
            >
              <PencilIcon className="h-5 w-5 " />
            </Button>
            <Button
              onClick={() => removeMilestone(index)}
              className="bg-transparent text-black dark:text-white p-1  hover:bg-transparent hover:opacity-75"
            >
              <XMarkIcon className="h-8 w-8" />
            </Button>
          </div>
        </div>
        <MarkdownPreview
          source={currentMilestone.description}
          style={{
            background: "none",
          }}
          className=" max-lg:max-w-[300px]"
        />
      </div>
    </div>
  );
};
