"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { Button } from "@/components/Utilities/Button";
import { Skeleton } from "@/components/Utilities/Skeleton";
import { useOrgBrain, useUpdateBrand } from "@/hooks/useOrgBrain";
import type { BrandData } from "@/lib/hermes-client";

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
      <div className="rounded border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-700">
          {error instanceof Error ? error.message : "Failed to load brand"}
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
      <label className="block">
        <span className="text-sm font-medium text-gray-900">Brand voice</span>
        <span className="mt-1 block text-xs text-gray-500">
          A short description of how the org sounds (e.g. warm, plainspoken, urgent). Employees read
          this before any substantive writing goes out.
        </span>
        <textarea
          {...register("voice")}
          rows={6}
          placeholder="Warm but unsentimental. Concrete numbers over abstract claims. Never corporate."
          className="mt-2 w-full rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-gray-300 focus:ring-2 focus:ring-gray-100"
        />
      </label>

      <div className="flex items-center gap-3 border-t pt-4">
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
