"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MailsIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { z } from "zod";
import { errorManager } from "@/components/Utilities/errorManager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Project } from "@/types/v2/project";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { cn } from "@/utilities/tailwind";

const schema = z.object({
  name: z.string().max(50, { message: MESSAGES.PROJECT.SUBSCRIPTION.NAME.MAX }).optional(),
  email: z
    .string()
    .email({ message: "Please enter a valid email address." })
    .min(3, { message: MESSAGES.PROJECT.SUBSCRIPTION.EMAIL }),
});

type SchemaType = z.infer<typeof schema>;

interface SubscribeSectionProps {
  project: Project;
  className?: string;
}

/**
 * SubscribeSection provides a form for users to subscribe to project updates.
 * Matches Figma design with Lucide icons and neutral color palette.
 */
export function SubscribeSection({ project, className }: SubscribeSectionProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { address } = useAccount();

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<SchemaType>({
    resolver: zodResolver(schema),
    mode: "onChange",
  });

  const onSubmit = async (data: SchemaType) => {
    try {
      setIsLoading(true);
      const [_res, error] = await fetchData(
        INDEXER.PROJECT.SUBSCRIBE(project?.uid as `0x${string}`),
        "POST",
        data
      );
      if (error) throw error;
      toast.success(
        `You have successfully subscribed to ${project?.details?.title || "this project"}.`
      );
      reset();
    } catch (error: unknown) {
      const errorString = error instanceof Error ? error.message : String(error);
      const isAlreadySubscribed = errorString?.includes("422");
      if (isAlreadySubscribed) {
        setError("email", {
          type: "manual",
          message: "You have already subscribed to this project.",
        });
        toast.error(`User already subscribed to ${project?.details?.title || "this project"}.`);
      } else {
        errorManager(
          `Error subscribing to ${project?.details?.title || "this project"}`,
          error,
          { projectUID: project.uid, address },
          {
            error: MESSAGES.PROJECT.SUBSCRIPTION.ERROR(project?.details?.title || "this project"),
          }
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={cn("flex flex-col gap-4", className)}
      data-testid="subscribe-section"
    >
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex flex-row items-center gap-2">
          <MailsIcon className="h-6 w-6 text-neutral-700 dark:text-neutral-300" />
          <span className="text-xl font-semibold text-neutral-900 dark:text-white tracking-tight">
            Stay updated
          </span>
        </div>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Get project updates in your inbox
        </p>
      </div>

      {/* Stay Updated Form */}
      <div className="flex flex-col gap-2 items-end">
        {/* Name Input */}
        <div className="flex flex-col gap-1 w-full">
          <Input
            type="text"
            placeholder="First name"
            {...register("name")}
            className="w-full bg-white dark:bg-zinc-900 border-neutral-200 dark:border-zinc-700 rounded-lg shadow-sm"
            data-testid="subscribe-name-input"
          />
          {errors.name && (
            <p className="text-xs text-red-500" data-testid="subscribe-name-error">
              {errors.name.message}
            </p>
          )}
        </div>

        {/* Email Input */}
        <div className="flex flex-col gap-1 w-full">
          <Input
            type="email"
            placeholder="your@email.com*"
            {...register("email")}
            className="w-full bg-white dark:bg-zinc-900 border-neutral-200 dark:border-zinc-700 rounded-lg shadow-sm"
            data-testid="subscribe-email-input"
          />
          {errors.email && (
            <p className="text-xs text-red-500" data-testid="subscribe-email-error">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Subscribe Button */}
        <Button
          type="submit"
          disabled={isLoading}
          isLoading={isLoading}
          className="bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 rounded-lg px-3"
          data-testid="subscribe-button"
        >
          Subscribe
        </Button>
      </div>
    </form>
  );
}
