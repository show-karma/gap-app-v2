"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useOrgBrain, useUpdateBrand } from "@/hooks/useOrgBrain";
import type { BrandData } from "@/lib/hermes-client";

interface Props {
  slug: string;
}

interface BrandFormShape {
  voice: string;
  tones: { donor_email: string; proposal: string; social: string };
  boilerplates: string;
  wordDos: string;
  wordDonts: string;
  taglines: string;
  sensitiveTopics: string;
}

const EMPTY: BrandFormShape = {
  voice: "",
  tones: { donor_email: "", proposal: "", social: "" },
  boilerplates: "",
  wordDos: "",
  wordDonts: "",
  taglines: "",
  sensitiveTopics: "",
};

function toForm(data: BrandData | undefined): BrandFormShape {
  if (!data) return EMPTY;
  return {
    voice: data.voice ?? "",
    tones: {
      donor_email: data.tones?.donor_email ?? "",
      proposal: data.tones?.proposal ?? "",
      social: data.tones?.social ?? "",
    },
    boilerplates: (data.boilerplates ?? [])
      .map((b) => b.body)
      .join("\n\n"),
    wordDos: (data.wordDos ?? []).join(", "),
    wordDonts: (data.wordDonts ?? []).join(", "),
    taglines: (data.taglines ?? []).join("\n"),
    sensitiveTopics: data.sensitiveTopics ?? "",
  };
}

function fromForm(values: BrandFormShape): BrandData {
  const splitLines = (s: string) =>
    s
      .split(/\n\s*\n/)
      .map((x) => x.trim())
      .filter(Boolean);
  const splitCsv = (s: string) =>
    s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  const splitNl = (s: string) =>
    s
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
  return {
    voice: values.voice.trim() || undefined,
    tones: {
      donor_email: values.tones.donor_email.trim() || undefined,
      proposal: values.tones.proposal.trim() || undefined,
      social: values.tones.social.trim() || undefined,
    },
    boilerplates: splitLines(values.boilerplates).map((body, i) => ({
      name: `Boilerplate ${i + 1}`,
      body,
    })),
    wordDos: splitCsv(values.wordDos),
    wordDonts: splitCsv(values.wordDonts),
    taglines: splitNl(values.taglines),
    sensitiveTopics: values.sensitiveTopics.trim() || undefined,
  };
}

export function BrandForm({ slug }: Props) {
  const { data, isLoading, isError, error, refetch } = useOrgBrain<BrandData>(
    slug,
    "brand"
  );
  const update = useUpdateBrand(slug);

  const { register, handleSubmit, reset, formState } = useForm<BrandFormShape>({
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (data) reset(toForm(data.data));
  }, [data, reset]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-24 animate-pulse rounded bg-gray-100" />
        <div className="h-10 animate-pulse rounded bg-gray-100" />
        <div className="h-10 animate-pulse rounded bg-gray-100" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-700">
          {error instanceof Error ? error.message : "Failed to load brand"}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-3 rounded border px-3 py-1 text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit((values) => update.mutate(fromForm(values)))}
      className="space-y-6"
    >
      <Field
        label="Brand voice"
        hint="A short description of how the org sounds (e.g. warm, plainspoken, urgent)."
      >
        <textarea
          {...register("voice")}
          rows={2}
          className="mt-1 w-full rounded border px-3 py-2 text-sm"
        />
      </Field>

      <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <legend className="col-span-full text-sm font-medium">Tone by channel</legend>
        <Field label="Donor email">
          <input
            {...register("tones.donor_email")}
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Proposal">
          <input
            {...register("tones.proposal")}
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Social">
          <input
            {...register("tones.social")}
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
          />
        </Field>
      </fieldset>

      <Field
        label="Boilerplate paragraphs"
        hint="One paragraph per block, separated by a blank line."
      >
        <textarea
          {...register("boilerplates")}
          rows={6}
          className="mt-1 w-full rounded border px-3 py-2 text-sm font-mono"
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Words / phrases to use" hint="Comma-separated.">
          <input
            {...register("wordDos")}
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Words / phrases to avoid" hint="Comma-separated.">
          <input
            {...register("wordDonts")}
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
          />
        </Field>
      </div>

      <Field label="Taglines" hint="One per line.">
        <textarea
          {...register("taglines")}
          rows={3}
          className="mt-1 w-full rounded border px-3 py-2 text-sm"
        />
      </Field>

      <Field
        label="Sensitive topics or framing notes"
        hint="What employees should escalate to humans before writing about."
      >
        <textarea
          {...register("sensitiveTopics")}
          rows={3}
          className="mt-1 w-full rounded border px-3 py-2 text-sm"
        />
      </Field>

      <div className="flex items-center gap-3 border-t pt-4">
        <button
          type="submit"
          disabled={update.isPending || !formState.isDirty}
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {update.isPending ? "Saving…" : "Save brand"}
        </button>
        {update.isError ? (
          <span className="text-sm text-red-600">
            {update.error instanceof Error ? update.error.message : "Save failed"}
          </span>
        ) : null}
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-gray-500">{hint}</span> : null}
    </label>
  );
}
