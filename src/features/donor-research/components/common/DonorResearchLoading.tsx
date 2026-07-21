import { SK } from "@/components/Pages/Dashboard/v3/soft-classes";
import { cn } from "@/utilities/tailwind";

export type DonorResearchLoadingVariant = "home" | "list" | "report" | "form" | "generic";

interface DonorResearchLoadingProps {
  /** Status announced to screen readers (visually hidden). */
  label?: string;
  /** Which route shape to mirror so content resolves in place. */
  variant?: DonorResearchLoadingVariant;
}

function SkeletonRows({ count }: { count: number }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-sf-tile border border-sf-line bg-sf-card">
      {Array.from({ length: count }, (_, i) => (
        <div
          className="flex items-center gap-[14px] px-4 py-[15px] [&+&]:border-t [&+&]:border-sf-line"
          key={`dr-sk-row-${i}`}
        >
          <span className={cn(SK, "h-9 w-9 !rounded-[9px]")} />
          <div className="min-w-0 flex-1">
            <span className={cn(SK, "mb-2 block h-[13px] w-3/5")} />
            <span className={cn(SK, "block h-[11px] w-[35%]")} />
          </div>
        </div>
      ))}
    </div>
  );
}

function HomeSkeleton() {
  return (
    <>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
        {[0, 1, 2, 3].map((i) => (
          <div className={cn(SK, "h-[104px] w-full rounded-sf-tile")} key={i} />
        ))}
      </div>
      <div className={cn(SK, "h-5 w-40")} />
      <SkeletonRows count={4} />
    </>
  );
}

function ListSkeleton() {
  return (
    <>
      <div className="flex items-center justify-between">
        <div className={cn(SK, "h-6 w-40")} />
        <div className={cn(SK, "h-9 w-28 rounded-lg")} />
      </div>
      <SkeletonRows count={4} />
    </>
  );
}

function ReportSkeleton() {
  return (
    <>
      <div className={cn(SK, "h-10 w-2/3")} />
      <div className={cn(SK, "h-4 w-1/3")} />
      <div className={cn(SK, "h-64 w-full rounded-sf-card")} />
      <div className={cn(SK, "h-40 w-full rounded-sf-card")} />
    </>
  );
}

function FormSkeleton() {
  return (
    <>
      <div className={cn(SK, "h-7 w-1/3")} />
      <div className={cn(SK, "h-11 w-full rounded-lg")} />
      <div className={cn(SK, "h-11 w-full rounded-lg")} />
      <div className={cn(SK, "h-72 w-full rounded-sf-card")} />
    </>
  );
}

function GenericSkeleton() {
  return (
    <>
      <div className={cn(SK, "h-8 w-1/3")} />
      <div className={cn(SK, "h-4 w-2/3")} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div className={cn(SK, "h-32 rounded-sf-card")} key={i} />
        ))}
      </div>
    </>
  );
}

const VARIANT_SKELETONS: Record<DonorResearchLoadingVariant, () => React.JSX.Element> = {
  home: HomeSkeleton,
  list: ListSkeleton,
  report: ReportSkeleton,
  form: FormSkeleton,
  generic: GenericSkeleton,
};

/**
 * Shared skeleton used by every donor-research route's `loading.tsx`.
 * Each variant mirrors its route's real layout in Soft-system tokens so
 * content resolves in place with no geometry jump. Carries the `dashv3`
 * scope class itself: the `--sf-*` variables it depends on are only defined
 * under `.dashv3`, and standalone contexts (session boundary, onboarding)
 * render outside the shell that normally provides it.
 */
export function DonorResearchLoading({
  label = "Loading…",
  variant = "generic",
}: DonorResearchLoadingProps) {
  const Skeleton = VARIANT_SKELETONS[variant];
  return (
    <div className="dashv3 flex w-full flex-col gap-6 bg-transparent">
      <Skeleton />
      <p className="sr-only" aria-live="polite">
        {label}
      </p>
    </div>
  );
}
