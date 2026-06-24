"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useDonorAdvisor, useOnboardAdvisor } from "@/hooks/useDonorAdvisor";
import type { WizardStep } from "@/src/components/ui/WizardStepper";
import { WizardStepper } from "@/src/components/ui/WizardStepper";
import { PAGES } from "@/utilities/pages";
import { DonorResearchLoading } from "../common/DonorResearchLoading";
import { SampleReportPreview } from "./SampleReportPreview";

const TIMEZONE_REGEX = /^[A-Za-z_/+\-0-9]{1,64}$/;

const OnboardingSchema = z.object({
  displayName: z.string().min(1, "Display name is required").max(120),
  email: z.string().min(1, "Email is required").email("Enter a valid email").max(254),
  orgName: z.string().max(200).optional(),
  timezone: z
    .string()
    .min(1, "Timezone is required")
    .max(64)
    .regex(TIMEZONE_REGEX, "Use an IANA timezone like America/Los_Angeles"),
});

type OnboardingForm = z.infer<typeof OnboardingSchema>;

type Step = "welcome" | "sample" | "form";

const ONBOARDING_STEPS: ReadonlyArray<WizardStep<Step>> = [
  { id: "welcome", label: "Welcome" },
  { id: "sample", label: "Sample report" },
  { id: "form", label: "Get started" },
];

const DEFAULT_TIMEZONE =
  typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";

/**
 * 3-screen onboarding (U12). Skips to the index when an advisor row
 * already exists — re-entering the flow is harmless thanks to the
 * idempotent `findOrCreate` upsert on the backend, but routing to the
 * main page keeps the advisor's mental model coherent.
 *
 * Step identity, transitions, and validation outcomes are all made
 * programmatically determinable (aria-current on the stepper, focus moved
 * to the active step's heading on change, role="alert" on errors) so that
 * assistive technology and automated QA can tell the steps apart — see
 * issue #1587.
 */
export function OnboardingFlow() {
  const router = useRouter();
  const advisorQuery = useDonorAdvisor();
  const onboard = useOnboardAdvisor();
  const [step, setStep] = useState<Step>("welcome");

  // A single ref is shared across all three step headings because exactly one
  // step <section> is mounted at a time, so only one heading ever binds it.
  const headingRef = useRef<HTMLHeadingElement>(null);
  const headingBaseId = useId();
  const welcomeHeadingId = `${headingBaseId}-welcome`;
  const sampleHeadingId = `${headingBaseId}-sample`;
  const formHeadingId = `${headingBaseId}-form`;

  const form = useForm<OnboardingForm>({
    resolver: zodResolver(OnboardingSchema),
    defaultValues: {
      displayName: "",
      email: "",
      orgName: "",
      timezone: DEFAULT_TIMEZONE,
    },
  });

  useEffect(() => {
    if (advisorQuery.isSuccess && advisorQuery.data) {
      router.replace(PAGES.DONOR_RESEARCH.INDEX);
    }
    // `router` is kept in the deps: the app-router instance is referentially
    // stable so it never causes a re-run, and listing it satisfies the
    // exhaustive-deps gate (react-doctor) rather than fighting it.
  }, [advisorQuery.isSuccess, advisorQuery.data, router]);

  // Move focus to the active step's heading on every transition. This is the
  // canonical wizard focus pattern (WCAG 2.4.3 Focus Order) and gives any
  // assistive tech / automated QA an unambiguous "the step changed" signal.
  // Keyed on the `step` primitive per the repo rule about primitive deps.
  //
  // The initial mount is skipped: focus must only move in response to a real
  // step change, never be stolen on first page load — which otherwise fires
  // inconsistently depending on whether the advisor query resolved from a warm
  // React Query cache (staleTime 5 min) before the first commit.
  const isInitialStep = useRef(true);
  useEffect(() => {
    if (isInitialStep.current) {
      isInitialStep.current = false;
      return;
    }
    headingRef.current?.focus({ preventScroll: false });
  }, [step]);

  if (advisorQuery.isLoading) {
    return <DonorResearchLoading label="Checking your account…" />;
  }

  if (advisorQuery.isError) {
    throw advisorQuery.error;
  }

  const onSubmit = (values: OnboardingForm) => {
    // `mutate` (not `mutateAsync`) keeps the redirect in the success callback
    // so a server error never escapes as an unhandled rejection — failures
    // surface through `onboard.isError` (the announced role="alert" below).
    onboard.mutate(
      {
        displayName: values.displayName,
        email: values.email,
        orgName: values.orgName || null,
        timezone: values.timezone,
      },
      {
        onSuccess: () => {
          router.replace(PAGES.DONOR_RESEARCH.INDEX);
        },
      }
    );
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <WizardStepper
        steps={ONBOARDING_STEPS}
        current={step}
        ariaLabel="Onboarding progress"
        className="mb-6"
      />

      {step === "welcome" ? (
        <section aria-labelledby={welcomeHeadingId}>
          <WelcomeStep
            headingId={welcomeHeadingId}
            headingRef={headingRef}
            onContinue={() => setStep("sample")}
          />
        </section>
      ) : null}

      {step === "sample" ? (
        <section aria-labelledby={sampleHeadingId}>
          <SampleStep
            headingId={sampleHeadingId}
            headingRef={headingRef}
            onBack={() => setStep("welcome")}
            onContinue={() => setStep("form")}
          />
        </section>
      ) : null}

      {step === "form" ? (
        <section aria-labelledby={formHeadingId}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="rounded-xl border border-border bg-card p-6"
          >
            <h2
              id={formHeadingId}
              ref={headingRef}
              tabIndex={-1}
              className="mb-2 text-xl font-semibold outline-none"
            >
              Get started
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
              We use these to label the reports you share with donors and to display your daily
              limits in your local time.
            </p>
            <div className="grid grid-cols-1 gap-4">
              <Field
                id="onboarding-display-name"
                label="Display name"
                hint="Shown in the header of the reports you share with donors."
                error={form.formState.errors.displayName?.message}
              >
                {(field) => (
                  <input
                    {...form.register("displayName")}
                    {...field}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    placeholder="Avery Boutique"
                  />
                )}
              </Field>
              <Field
                id="onboarding-email"
                label="Email"
                hint="Where we send notifications about your reports."
                error={form.formState.errors.email?.message}
              >
                {(field) => (
                  <input
                    {...form.register("email")}
                    {...field}
                    type="email"
                    autoComplete="email"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    placeholder="you@example.com"
                  />
                )}
              </Field>
              <Field
                id="onboarding-org-name"
                label="Organization (optional)"
                hint="The firm or advisory practice you work with."
                error={form.formState.errors.orgName?.message}
              >
                {(field) => (
                  <input
                    {...form.register("orgName")}
                    {...field}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    placeholder="Boutique Philanthropy LLC"
                  />
                )}
              </Field>
              <Field
                id="onboarding-timezone"
                label="Timezone"
                hint="Used to display when your daily rate-limit counters reset."
                error={form.formState.errors.timezone?.message}
              >
                {(field) => (
                  <input
                    {...form.register("timezone")}
                    {...field}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
                    placeholder="America/Los_Angeles"
                  />
                )}
              </Field>
            </div>

            {onboard.isError ? (
              <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
                {onboard.error?.message || "Couldn't complete onboarding. Try again."}
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
        </section>
      ) : null}
    </div>
  );
}

interface FieldChildProps {
  id: string;
  "aria-invalid": boolean;
  "aria-describedby"?: string;
}

interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: (props: FieldChildProps) => React.ReactNode;
}

function Field({ id, label, hint, error, children }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  // A `<label>` that wraps its control implicitly associates the visible
  // text with the input; `htmlFor` + `id` makes the association explicit so
  // the field stays programmatically accessible. `aria-invalid` and
  // `aria-describedby` wire the input to its error/hint so screen readers
  // (and automated QA) observe validation state, and the error span is an
  // `role="alert"` live region so it's announced on submit.
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      {children({ id, "aria-invalid": Boolean(error), "aria-describedby": describedBy })}
      {hint ? (
        <span id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={errorId} role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </span>
      ) : null}
    </label>
  );
}

interface StepHeadingProps {
  headingId: string;
  headingRef: React.Ref<HTMLHeadingElement>;
}

function WelcomeStep({
  headingId,
  headingRef,
  onContinue,
}: StepHeadingProps & { onContinue: () => void }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h2
        id={headingId}
        ref={headingRef}
        tabIndex={-1}
        className="mb-2 text-2xl font-semibold outline-none"
      >
        Defensible philanthropy research for your donor clients.
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Karma Nonprofit Research helps boutique advisors produce current, ranked nonprofit
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
        aria-label="Continue to sample report"
        className="rounded-md border border-border bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Continue
      </button>
    </div>
  );
}

function SampleStep({
  headingId,
  headingRef,
  onBack,
  onContinue,
}: StepHeadingProps & { onBack: () => void; onContinue: () => void }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h2
        id={headingId}
        ref={headingRef}
        tabIndex={-1}
        className="mb-2 text-xl font-semibold outline-none"
      >
        What a report looks like
      </h2>
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
          aria-label="Continue to setup"
          className="rounded-md border border-border bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
