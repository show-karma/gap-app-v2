"use client";

import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { Button } from "@/components/Utilities/Button";
import { Skeleton } from "@/components/Utilities/Skeleton";
import { useOrgBrain, useUpdateMission } from "@/hooks/useOrgBrain";
import type { MissionData } from "@/lib/hermes-client";

interface Props {
  slug: string;
}

const EMPTY: MissionData = {
  legalName: "",
  ein: "",
  missionStatement: "",
  website: "",
  theoryOfChange: "",
  targetPopulation: "",
  geographicScope: "",
  yearFounded: "",
  fiscalSponsor: "",
  leadership: [],
};

export function MissionForm({ slug }: Props) {
  const { data, isLoading, isError, error, refetch } = useOrgBrain<MissionData>(slug, "mission");
  const update = useUpdateMission(slug);

  const form = useForm<MissionData>({ defaultValues: EMPTY });
  const { register, handleSubmit, control, reset, formState } = form;
  const leadership = useFieldArray({ control, name: "leadership" });

  useEffect(() => {
    if (data) reset({ ...EMPTY, ...data.data });
  }, [data, reset]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 rounded" />
        <Skeleton className="h-10 rounded" />
        <Skeleton className="h-24 rounded" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-700">
          {error instanceof Error ? error.message : "Failed to load mission"}
        </p>
        <Button type="button" variant="secondary" onClick={() => refetch()} className="mt-3">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit((values) => {
        const trimmed: MissionData = {
          ...values,
          leadership: (values.leadership ?? []).filter((l) => l.name?.trim()),
        };
        update.mutate(trimmed, {
          onSuccess: () => toast.success("Mission saved."),
          onError: (err) => toast.error(err instanceof Error ? err.message : "Save failed"),
        });
      })}
      className="space-y-6"
    >
      <Field label="Legal name">
        <input
          {...register("legalName")}
          className="mt-1 w-full rounded border px-3 py-2 text-sm"
          placeholder="Acme Foundation, Inc."
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="EIN">
          <input
            {...register("ein")}
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            placeholder="12-3456789"
          />
        </Field>
        <Field label="Year founded">
          <input
            {...register("yearFounded")}
            inputMode="numeric"
            maxLength={4}
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            placeholder="2014"
          />
        </Field>
      </div>

      <Field label="Website">
        <input
          {...register("website")}
          type="url"
          className="mt-1 w-full rounded border px-3 py-2 text-sm"
          placeholder="https://acme.org"
        />
      </Field>

      <Field label="Mission statement">
        <textarea
          {...register("missionStatement")}
          className="mt-1 w-full rounded border px-3 py-2 text-sm"
          rows={3}
        />
      </Field>

      <Field label="Theory of change">
        <textarea
          {...register("theoryOfChange")}
          className="mt-1 w-full rounded border px-3 py-2 text-sm"
          rows={3}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Target population">
          <input
            {...register("targetPopulation")}
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Geographic scope">
          <input
            {...register("geographicScope")}
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
          />
        </Field>
      </div>

      <Field label="Fiscal sponsor (if any)">
        <input
          {...register("fiscalSponsor")}
          className="mt-1 w-full rounded border px-3 py-2 text-sm"
        />
      </Field>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Leadership</legend>
        {leadership.fields.map((field, i) => (
          <div key={field.id} className="grid grid-cols-12 gap-2">
            <input
              {...register(`leadership.${i}.name` as const)}
              placeholder="Name"
              className="col-span-4 rounded border px-3 py-2 text-sm"
            />
            <input
              {...register(`leadership.${i}.role` as const)}
              placeholder="Role"
              className="col-span-7 rounded border px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => leadership.remove(i)}
              className="col-span-1 rounded border text-sm text-gray-600 hover:bg-gray-50"
              aria-label="Remove leadership row"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => leadership.append({ name: "", role: "" })}
          className="rounded border px-3 py-1.5 text-sm"
        >
          + Add leader
        </button>
      </fieldset>

      <div className="flex items-center gap-3 border-t pt-4">
        <Button
          type="submit"
          variant="primary"
          isLoading={update.isPending}
          disabled={update.isPending || !formState.isDirty}
        >
          Save mission
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: children always contains the input; Biome can't infer this statically
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
