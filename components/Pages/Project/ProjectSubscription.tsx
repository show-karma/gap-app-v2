/* eslint-disable @next/next/no-img-element */
import { FC, Fragment, ReactNode, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Button } from "@/components/Utilities/Button";
import { shortAddress } from "@/utilities/shortAddress";
import { z } from "zod";
import { MESSAGES } from "@/utilities/messages";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import toast from "react-hot-toast";
import { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { cn } from "@/utilities/tailwind";
import { errorManager } from "@/components/Utilities/errorManager";

const inputStyle =
  "bg-transparent bg-white dark:bg-zinc-900  w-full text-black dark:text-zinc-200 placeholder:text-zinc-600  dark:placeholder:text-zinc-200";

const labelStyle =
  "text-slate-700 text-sm font-bold leading-tight dark:text-slate-200";

const schema = z.object({
  name: z.string().optional(),
  email: z
    .string()
    .email({
      message: "Invalid email address. Please enter a valid email address.",
    })
    .min(3, { message: MESSAGES.PROJECT.SUBSCRIPTION.EMAIL }),
});

type SchemaType = z.infer<typeof schema>;

interface ProjectSubscriptionProps {
  project: IProjectResponse;
}

export const ProjectSubscription: FC<ProjectSubscriptionProps> = ({
  project,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SchemaType>({
    resolver: zodResolver(schema),
    mode: "onChange",
  });

  const onSubmit = async (data: SchemaType) => {
    try {
      setIsLoading(true);
      const [res, error] = await fetchData(
        INDEXER.PROJECT.SUBSCRIBE(project?.uid as `0x${string}`),
        "POST",
        data
      );
      if (error) throw error;
      toast.success(
        `You have successfully subscribed to ${
          project?.details?.data?.title || "this project"
        }.`
      );
    } catch (error: any) {
      console.log(error);
      const isAlreadySubscribed = error?.includes("422");
      if (isAlreadySubscribed) {
        setError("email", {
          type: "manual",
          message: `You have already subscribed to this project.`,
        });
        toast.error(
          `User already subscribed to ${
            project?.details?.data?.title || "this project"
          }.`
        );
      } else {
        errorManager(
          `Error subscribing to ${
            project?.details?.data?.title || "this project"
          }`,
          error
        );
        toast.error(
          `There was an error subscribing to ${
            project?.details?.data?.title || "this project"
          }.`
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="p-5 flex flex-col gap-1 rounded-lg w-full h-max items-center justify-center text-left bg-[#EFF1F5] dark:bg-zinc-700"
    >
      <p className="mb-1 font-semibold text-[#101828] text-sm dark:text-zinc-300 text-left w-full">
        Get updates on this project
      </p>
      <div className="flex w-full flex-col gap-1">
        <input
          id="name-input"
          type="text"
          className={cn(
            inputStyle,
            "border border-black dark:border-zinc-300 rounded-lg"
          )}
          placeholder="Enter your name (optional)"
          {...register("name")}
        />
        <p className="text-red-500">{errors.name?.message}</p>
      </div>
      <div className="flex flex-col justify-end gap-0 h-max w-full">
        <div className="flex w-full justify-between flex-row gap-0 border rounded-lg border-black dark:border-zinc-300">
          <input
            id="email-input"
            type="text"
            className={cn(
              inputStyle,
              "border-none rounded-l-lg rounded-r-none"
            )}
            placeholder="Enter your email"
            {...register("email")}
          />
          <Button
            type={"submit"}
            className="flex flex-row gap-2 items-center justify-center rounded-l-none rounded-r-md border border-transparent bg-black hover:bg-black/75 px-6 py-2 text-md font-medium text-white hover:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:bg-zinc-800 dark:hover:bg-zinc-800/75"
            isLoading={isLoading}
            disabled={isLoading}
          >
            Subscribe
          </Button>
        </div>
        <p className="text-red-500">{errors.email?.message}</p>
      </div>
    </form>
  );
};
