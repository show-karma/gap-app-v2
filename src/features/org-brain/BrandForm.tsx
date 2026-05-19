"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { Button } from "@/components/Utilities/Button";
import { Skeleton } from "@/components/Utilities/Skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useOrgBrain, useUpdateBrand } from "@/hooks/useOrgBrain";
import type { BrandData } from "@/lib/hermes-client";
import { humanizeApiError } from "@/lib/hermes-error";

interface Props {
  slug: string;
}

interface BrandFormShape {
  voice: string;
}

export function BrandForm({ slug }: Props) {
  const { data, isLoading, isError, error, refetch } = useOrgBrain<BrandData>(slug, "brand");
  const update = useUpdateBrand(slug);

  const { register, handleSubmit, reset, formState } = useForm<BrandFormShape>({
    defaultValues: { voice: "" },
  });

  useEffect(() => {
    if (data) reset({ voice: data.data?.voice ?? "" });
  }, [data, reset]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 rounded" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-4">
        <p className="text-sm text-red-700 dark:text-red-400">
          {humanizeApiError(error, "Failed to load brand")}
        </p>
        <Button type="button" variant="secondary" onClick={() => refetch()} className="mt-3">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit((values) =>
        // Merge with whatever else was on disk so we don't blow away fields
        // that were set by another client (or by us before we slimmed the UI).
        update.mutate(
          {
            ...(data?.data ?? {}),
            voice: values.voice.trim() || undefined,
          },
          {
            onSuccess: () => toast.success("Brand saved."),
            onError: (err) => toast.error(err instanceof Error ? err.message : "Save failed"),
          }
        )
      )}
      className="space-y-6"
    >
      <div>
        <label
          htmlFor="brand-voice"
          className="block text-sm font-medium text-gray-900 dark:text-zinc-100"
        >
          Brand voice
        </label>
        <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
          A short description of how the org sounds (e.g. warm, plainspoken, urgent). Employees read
          this before any substantive writing goes out.
        </p>
        <Textarea
          id="brand-voice"
          {...register("voice")}
          rows={6}
          placeholder="Warm but unsentimental. Concrete numbers over abstract claims. Never corporate."
          className="mt-2 bg-white dark:bg-zinc-900 p-3 text-gray-900 dark:text-zinc-100"
        />
      </div>

      <div className="flex items-center gap-3 border-t dark:border-zinc-800 pt-4">
        <Button
          type="submit"
          variant="primary"
          isLoading={update.isPending}
          disabled={update.isPending || !formState.isDirty}
        >
          Save
        </Button>
      </div>
    </form>
  );
}
