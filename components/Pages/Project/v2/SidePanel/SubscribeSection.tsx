"use client";

import { EnvelopeIcon } from "@heroicons/react/24/solid";
import { zodResolver } from "@hookform/resolvers/zod";
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
      className={cn(
        "flex flex-col gap-4 p-4 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800",
        className
      )}
      data-testid="subscribe-section"
    >
      {/* Header */}
      <div className="flex flex-row items-center gap-2">
        <EnvelopeIcon className="h-5 w-5 text-blue-500" />
        <span className="text-sm font-semibold text-gray-900 dark:text-white">Stay Updated</span>
      </div>

      {/* Name Input */}
      <div className="flex flex-col gap-1">
        <Input
          type="text"
          placeholder="First name (optional)"
          {...register("name")}
          className="w-full"
          data-testid="subscribe-name-input"
        />
        {errors.name && (
          <p className="text-xs text-red-500" data-testid="subscribe-name-error">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Email Input */}
      <div className="flex flex-col gap-1">
        <Input
          type="email"
          placeholder="Email address"
          {...register("email")}
          className="w-full"
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
        className="w-full bg-blue-500 hover:bg-blue-600 text-white"
        data-testid="subscribe-button"
      >
        Subscribe
      </Button>
    </form>
  );
}
