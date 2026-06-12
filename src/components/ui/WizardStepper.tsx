"use client";

import { CheckIcon } from "@heroicons/react/24/solid";

/**
 * A single step descriptor for {@link WizardStepper}. `id` is the value the
 * consumer tracks as the current step; `label` is the human-readable text
 * shown in the progress nav.
 */
export interface WizardStep<TId extends string = string> {
  id: TId;
  label: string;
}

interface WizardStepperProps<TId extends string = string> {
  /** Ordered list of steps. Their position determines completed/upcoming state. */
  steps: ReadonlyArray<WizardStep<TId>>;
  /** The id of the active step. */
  current: TId;
  /** Optional accessible name for the progress landmark. */
  ariaLabel?: string;
  className?: string;
}

type StepStatus = "completed" | "current" | "upcoming";

/**
 * Accessible, presentational progress stepper for multi-step wizards.
 *
 * Renders a `<nav aria-label>` landmark wrapping an ordered list where the
 * active step carries `aria-current="step"` and completed steps are marked
 * with an icon + screen-reader text. This makes the wizard's current step
 * programmatically determinable for assistive technology and automated QA
 * (WCAG 2.4.8 Location, 4.1.2 Name/Role/Value) — the semantics the ad-hoc
 * donor-onboarding stepper was missing.
 *
 * Mirrors the proven a11y pattern in
 * `components/Disbursement/DisbursementStepper.tsx`; kept generic so future
 * wizards reuse it instead of re-implementing an indeterminate `<ol>`.
 */
export function WizardStepper<TId extends string = string>({
  steps,
  current,
  ariaLabel = "Progress",
  className,
}: WizardStepperProps<TId>) {
  const currentIndex = steps.findIndex((step) => step.id === current);

  const getStatus = (index: number): StepStatus => {
    if (currentIndex >= 0 && index < currentIndex) {
      return "completed";
    }
    if (index === currentIndex) {
      return "current";
    }
    return "upcoming";
  };

  return (
    <nav aria-label={ariaLabel} className={className}>
      <ol className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {steps.map((step, index) => {
          const status = getStatus(index);
          const isLast = index === steps.length - 1;

          return (
            <li key={step.id} className="flex items-center gap-2">
              <span
                aria-current={status === "current" ? "step" : undefined}
                className={
                  status === "current"
                    ? "flex items-center gap-1 font-medium text-foreground"
                    : status === "completed"
                      ? "flex items-center gap-1 text-foreground/80"
                      : "flex items-center gap-1"
                }
              >
                {status === "completed" ? (
                  <CheckIcon aria-hidden="true" className="h-3.5 w-3.5 text-primary" />
                ) : null}
                <span>
                  {index + 1}. {step.label}
                </span>
                {status === "completed" ? <span className="sr-only">(completed)</span> : null}
              </span>
              {!isLast ? <span aria-hidden="true">→</span> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
