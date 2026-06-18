"use client";

/**
 * DeepResearchForm — intake form for /nonprofits/find-funders-deep-research.
 * Collects a free-text research brief plus the requester's email and submits
 * via a React Query mutation to the indexer (which emails the Karma team).
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Sparkles } from "lucide-react";
import { type SubmitHandler, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";
import { Spinner } from "@/components/ui/spinner";
import {
  deepResearchErrorMessage,
  useDeepResearchRequest,
} from "../hooks/use-deep-research-request";

const schema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
  query: z
    .string()
    .trim()
    .min(10, "Please describe what you're looking for in a little more detail.")
    .max(5000, "Please keep your request under 5000 characters."),
});

type FormValues = z.infer<typeof schema>;

const labelStyle = "text-sm font-medium text-zinc-900 dark:text-zinc-100";
const inputStyle =
  "mt-2 w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand-subtle focus:outline-none focus:ring-2 focus:ring-brand/30 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100";

export function DeepResearchForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onSubmit",
    defaultValues: { email: "", query: "" },
  });

  const { mutate, isPending, isSuccess } = useDeepResearchRequest();

  const onSubmit: SubmitHandler<FormValues> = (values) => {
    mutate(values, {
      onError: (error) => {
        toast.error(deepResearchErrorMessage(error));
      },
    });
  };

  if (isSuccess) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
          <CheckCircle2 className="size-6" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Request received
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Thanks — our team will review your deep research request and follow up by email.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex flex-col gap-5">
        <div>
          <label htmlFor="deep-research-query" className={labelStyle}>
            What are you looking for?
          </label>
          <textarea
            id="deep-research-query"
            rows={8}
            className={`${inputStyle} resize-y`}
            placeholder="Tell us as much as you can — your mission, the kind of funders you're after, geography, check size, timelines, and anything that's worked or not worked so far."
            aria-invalid={errors.query ? "true" : "false"}
            {...register("query")}
          />
          {errors.query && <p className="mt-1.5 text-sm text-red-500">{errors.query.message}</p>}
        </div>

        <div>
          <label htmlFor="deep-research-email" className={labelStyle}>
            Your email
          </label>
          <input
            id="deep-research-email"
            type="email"
            className={inputStyle}
            placeholder="you@organization.org"
            aria-invalid={errors.email ? "true" : "false"}
            {...register("email")}
          />
          {errors.email && <p className="mt-1.5 text-sm text-red-500">{errors.email.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 rounded-lg !bg-brand px-5 py-3 text-sm font-semibold !text-white transition-colors hover:!bg-brand-emphasis focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-60"
        >
          {isPending ? (
            <>
              <Spinner className="size-4" />
              Submitting…
            </>
          ) : (
            <>
              <Sparkles className="size-4" />
              Perform deep research
            </>
          )}
        </button>
      </div>
    </form>
  );
}
