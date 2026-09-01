import { DonorResearchLoading } from "@/src/features/donor-research/components/common/DonorResearchLoading";

export default function Loading() {
  // Onboarding renders outside the section shell, so it frames its own pane.
  // `w-full` is required — the app's page wrapper is a flex row, so a bare
  // `max-w-*` box collapses to content width.
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12">
      <DonorResearchLoading label="Preparing onboarding…" variant="form" />
    </div>
  );
}
