"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { useNonprofitSubmission } from "@/src/features/nonprofits/hooks/use-nonprofit-submission";
import { SOCIALS } from "@/utilities/socials";
import { cn } from "@/utilities/tailwind";

// Accept URLs with or without the protocol; we prepend https:// before
// validation so visitors can paste "yourorg.com" without an error.
const submissionSchema = z.object({
  websiteUrl: z
    .string()
    .min(1, "Website URL is required")
    .transform((raw) => (/^https?:\/\//i.test(raw) ? raw : `https://${raw}`))
    .pipe(z.string().url("Enter a valid website URL")),
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  // Must match the gap-indexer contract's PHONE_PATTERN exactly so client
  // validation never accepts a number the backend will 400 on: a leading
  // "+" or digit, then digits/spaces/()/-/. (min 6 chars total). A leading
  // "(" is intentionally rejected on both sides.
  phone: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => !value || /^[+\d][\d\s()\-.]{5,}$/.test(value),
      "Enter a valid phone number"
    ),
});

type SubmissionInput = z.input<typeof submissionSchema>;
type SubmissionOutput = z.output<typeof submissionSchema>;

const inputClass = cn(
  "w-full rounded-md border border-border bg-background",
  "px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground",
  "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
  "transition-colors"
);

export function NonprofitSubmissionForm() {
  const submission = useNonprofitSubmission();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SubmissionInput, unknown, SubmissionOutput>({
    resolver: zodResolver(submissionSchema),
    mode: "onBlur",
  });

  // The third useForm generic types `values` as the zod OUTPUT, so the
  // transformed websiteUrl/trimmed phone arrive here already normalized.
  // mutate (not mutateAsync) so a failed request surfaces through
  // submission.isError instead of rejecting out of handleSubmit.
  const onSubmit = handleSubmit((values) => {
    submission.mutate({
      websiteUrl: values.websiteUrl,
      email: values.email,
      phone: values.phone || undefined,
    });
  });

  if (submission.isSuccess) {
    return (
      <output
        className={cn(
          "w-full max-w-xl rounded-2xl border border-border bg-secondary",
          "p-6 md:p-8 flex flex-col items-start gap-3"
        )}
        aria-live="polite"
      >
        <div className="flex items-center gap-2 text-foreground">
          <CheckCircle2 className="h-5 w-5" />
          <p className="font-semibold text-base">Thank you.</p>
        </div>
        <p className="text-sm text-muted-foreground leading-[150%]">
          We will index your site and reach out with any questions. If donors request additional
          info, we will reach out too.
        </p>
      </output>
    );
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-xl flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="nonprofit-url" className="text-sm font-medium text-foreground">
          Your website
        </label>
        <input
          id="nonprofit-url"
          type="text"
          autoComplete="url"
          inputMode="url"
          placeholder="yournonprofit.org"
          aria-invalid={Boolean(errors.websiteUrl)}
          aria-describedby={errors.websiteUrl ? "nonprofit-url-error" : undefined}
          className={inputClass}
          {...register("websiteUrl")}
        />
        {errors.websiteUrl ? (
          <p id="nonprofit-url-error" className="text-xs text-destructive">
            {errors.websiteUrl.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="nonprofit-email" className="text-sm font-medium text-foreground">
          Your email
        </label>
        <input
          id="nonprofit-email"
          type="email"
          autoComplete="email"
          placeholder="you@yournonprofit.org"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "nonprofit-email-error" : undefined}
          className={inputClass}
          {...register("email")}
        />
        {errors.email ? (
          <p id="nonprofit-email-error" className="text-xs text-destructive">
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="nonprofit-phone" className="text-sm font-medium text-foreground">
          Phone <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <input
          id="nonprofit-phone"
          type="tel"
          autoComplete="tel"
          placeholder="+1 555 123 4567"
          aria-invalid={Boolean(errors.phone)}
          aria-describedby={errors.phone ? "nonprofit-phone-error" : undefined}
          className={inputClass}
          {...register("phone")}
        />
        {errors.phone ? (
          <p id="nonprofit-phone-error" className="text-xs text-destructive">
            {errors.phone.message}
          </p>
        ) : null}
      </div>

      {submission.isError ? (
        <p className="text-sm text-destructive" role="alert">
          Something went wrong while submitting. Please try again or email us at{" "}
          {SOCIALS.SUPPORT_EMAIL}.
        </p>
      ) : null}

      <Button
        type="submit"
        className="rounded-md font-semibold px-6 py-2.5 mt-2"
        disabled={isSubmitting || submission.isPending}
      >
        {isSubmitting || submission.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Submitting…
          </>
        ) : (
          "Add your nonprofit free"
        )}
      </Button>

      <p className="text-xs text-muted-foreground leading-[150%]">
        We index your public site to build a funder-facing profile. We will email you if anything is
        missing or if a donor asks for more.
      </p>
    </form>
  );
}
