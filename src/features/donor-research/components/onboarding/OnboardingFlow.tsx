"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useDonorAdvisor, useOnboardAdvisor } from "@/hooks/useDonorAdvisor";
import { PAGES } from "@/utilities/pages";
import { DonorResearchLoading } from "../common/DonorResearchLoading";
import { SampleReportPreview } from "./SampleReportPreview";

const TIMEZONE_REGEX = /^[A-Za-z_/+\-0-9]{1,64}$/;

const OnboardingSchema = z.object({
  displayName: z.string().min(1, "Display name is required").max(120),
  orgName: z.string().max(200).optional(),
  timezone: z
    .string()
    .min(1, "Timezone is required")
    .max(64)
    .regex(TIMEZONE_REGEX, "Use an IANA timezone like America/Los_Angeles"),
});

type OnboardingForm = z.infer<typeof OnboardingSchema>;

type Step = "welcome" | "sample" | "form";

const DEFAULT_TIMEZONE =
  typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";

/**
 * 3-screen onboarding (U12). Skips to the index when an advisor row
 * already exists — re-entering the flow is harmless thanks to the
 * idempotent `findOrCreate` upsert on the backend, but routing to the
 * main page keeps the advisor's mental model coherent.
 */
export function OnboardingFlow() {
  const router = useRouter();
  const advisorQuery = useDonorAdvisor();
  const onboard = useOnboardAdvisor();
  const [step, setStep] = useState<Step>("welcome");

  const form = useForm<OnboardingForm>({
    resolver: zodResolver(OnboardingSchema),
    defaultValues: {
      displayName: "",
      orgName: "",
      timezone: DEFAULT_TIMEZONE,
    },
  });

  useEffect(() => {
    if (advisorQuery.isSuccess && advisorQuery.data) {
      router.replace(PAGES.DONOR_RESEARCH.INDEX);
    }
  }, [advisorQuery.isSuccess, advisorQuery.data, router]);

  if (advisorQuery.isLoading) {
    return <DonorResearchLoading label="Checking your account…" />;
  }

  if (advisorQuery.isError) {
    throw advisorQuery.error;
  }

  const onSubmit = async (values: OnboardingForm) => {
    await onboard.mutateAsync({
      displayName: values.displayName,
      orgName: values.orgName || null,
      timezone: values.timezone,
    });
    router.replace(PAGES.DONOR_RESEARCH.INDEX);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <ol className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
        <li className={step === "welcome" ? "font-medium text-foreground" : ""}>1. Welcome</li>
        <span aria-hidden>→</span>
        <li className={step === "sample" ? "font-medium text-foreground" : ""}>2. Sample report</li>
        <span aria-hidden>→</span>
        <li className={step === "form" ? "font-medium text-foreground" : ""}>3. Get started</li>
      </ol>

      {step === "welcome" ? <WelcomeStep onContinue={() => setStep("sample")} /> : null}

      {step === "sample" ? (
        <SampleStep onBack={() => setStep("welcome")} onContinue={() => setStep("form")} />
      ) : null}

      {step === "form" ? (
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="rounded-xl border border-border bg-card p-6"
        >
          <h2 className="mb-2 text-xl font-semibold">Get started</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            We use these to label the reports you share with donors and to display your daily limits
            in your local time.
          </p>
          <div className="grid grid-cols-1 gap-4">
            <Field
              label="Display name"
              hint="Shown in the header of the reports you share with donors."
              error={form.formState.errors.displayName?.message}
            >
              <input
                {...form.register("displayName")}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="Avery Boutique"
              />
            </Field>
            <Field
              label="Organization (optional)"
              hint="The firm or advisory practice you work with."
              error={form.formState.errors.orgName?.message}
            >
              <input
                {...form.register("orgName")}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="Boutique Philanthropy LLC"
              />
            </Field>
            <Field
              label="Timezone"
              hint="Used to display when your daily rate-limit counters reset."
              error={form.formState.errors.timezone?.message}
            >
              <input
                {...form.register("timezone")}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
                placeholder="America/Los_Angeles"
              />
            </Field>
          </div>

          {onboard.isError ? (
            <p className="mt-3 text-sm text-red-600">
              {(onboard.error as Error)?.message || "Couldn't complete onboarding. Try again."}
            </p>
          ) : null}

          <div className="mt-6 flex justify-between">
            <button
              type="button"
              onClick={() => setStep("sample")}
              className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
              disabled={onboard.isPending}
            >
              Back
            </button>
            <button
              type="submit"
              disabled={onboard.isPending}
              className="rounded-md border border-border bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {onboard.isPending ? "Setting up…" : "Continue"}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}

function Field({ label, hint, error, children }: FieldProps) {
  // A `<label>` that wraps its control implicitly associates the visible
  // text with the input, so the field is programmatically accessible.
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: children always contains the input; Biome can't infer this statically
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      {children}
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </label>
  );
}

function WelcomeStep({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="mb-2 text-2xl font-semibold">
        Defensible philanthropy research for your donor clients.
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Karma Donor Research helps boutique advisors produce current, ranked nonprofit
        recommendations grounded in real-time public data — and reach out to organizations directly
        when public data isn't enough.
      </p>
      <ul className="mb-6 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
        <li className="rounded-md border border-border p-3">
          <strong className="block">Composite ranking</strong>
          <span className="text-muted-foreground">
            Freshness, impact-recency, donor match, compliance — every score visible and defensible.
          </span>
        </li>
        <li className="rounded-md border border-border p-3">
          <strong className="block">EIN + mailing address</strong>
          <span className="text-muted-foreground">
            On every recommendation, baked into the report.
          </span>
        </li>
        <li className="rounded-md border border-border p-3">
          <strong className="block">Fast turnaround</strong>
          <span className="text-muted-foreground">
            Ranked recommendations with compliance verification in about ten minutes.
          </span>
        </li>
        <li className="rounded-md border border-border p-3">
          <strong className="block">Share with donors</strong>
          <span className="text-muted-foreground">
            Generate a private, expiring link to share the research with your donor.
          </span>
        </li>
      </ul>
      <button
        type="button"
        onClick={onContinue}
        className="rounded-md border border-border bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Continue
      </button>
    </div>
  );
}

function SampleStep({ onBack, onContinue }: { onBack: () => void; onContinue: () => void }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="mb-2 text-xl font-semibold">What a report looks like</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        A sample report for the criteria "Pacific Northwest climate nonprofits, $25K". Top 3
        recommendations have a one-pager; the full ranked list sits below with per-candidate score
        breakdowns.
      </p>
      <SampleReportPreview />
      <div className="mt-6 flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="rounded-md border border-border bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
