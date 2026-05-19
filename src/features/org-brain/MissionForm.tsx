"use client";

import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { Button } from "@/components/Utilities/Button";
import { Skeleton } from "@/components/Utilities/Skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
      <div className="rounded border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-4">
        <p className="text-sm text-red-700 dark:text-red-400">
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
        <Input {...register("legalName")} className="mt-1" placeholder="Acme Foundation, Inc." />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="EIN">
          <Input {...register("ein")} className="mt-1" placeholder="12-3456789" />
        </Field>
        <Field label="Year founded">
          <Input
            {...register("yearFounded")}
            inputMode="numeric"
            maxLength={4}
            className="mt-1"
            placeholder="2014"
          />
        </Field>
      </div>

      <Field label="Website">
        <Input
          {...register("website")}
          type="url"
          className="mt-1"
          placeholder="https://acme.org"
        />
      </Field>

      <Field label="Mission statement">
        <Textarea {...register("missionStatement")} className="mt-1" rows={3} />
      </Field>

      <Field label="Theory of change">
        <Textarea {...register("theoryOfChange")} className="mt-1" rows={3} />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Target population">
          <Input {...register("targetPopulation")} className="mt-1" />
        </Field>
        <Field label="Geographic scope">
          <Input {...register("geographicScope")} className="mt-1" />
        </Field>
      </div>

      <Field label="Fiscal sponsor (if any)">
        <Input {...register("fiscalSponsor")} className="mt-1" />
      </Field>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Leadership</legend>
        {leadership.fields.map((field, i) => (
          <div key={field.id} className="grid grid-cols-12 gap-2">
            <Input
              {...register(`leadership.${i}.name` as const)}
              placeholder="Name"
              className="col-span-4"
            />
            <Input
              {...register(`leadership.${i}.role` as const)}
              placeholder="Role"
              className="col-span-7"
            />
            <button
              type="button"
              onClick={() => leadership.remove(i)}
              className="col-span-1 rounded border dark:border-zinc-700 text-sm text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800"
              aria-label="Remove leadership row"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => leadership.append({ name: "", role: "" })}
          className="rounded border dark:border-zinc-700 px-3 py-1.5 text-sm dark:text-zinc-300 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        >
          + Add leader
        </button>
      </fieldset>

      <div className="flex items-center gap-3 border-t dark:border-zinc-800 pt-4">
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
