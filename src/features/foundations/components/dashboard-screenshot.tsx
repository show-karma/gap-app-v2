import { ThemeImage } from "@/src/components/ui/theme-image";
import { cn } from "@/utilities/tailwind";

/**
 * The program manager dashboard (/community/[slug]/manage overview), framed
 * for the homepage hero. Captured from the real UI with Filecoin's program
 * list and illustrative counts; `-drk` variant ships alongside for dark mode.
 */
export function DashboardScreenshot({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "w-full max-w-[1080px] mx-auto rounded-xl overflow-hidden border border-border shadow-xl bg-background",
        // ThemeImage wraps its light/dark pair in an inline-block span; make it
        // span the frame so the image scales to the container width.
        "[&>span]:block [&>span]:w-full",
        className
      )}
    >
      <ThemeImage
        src="/images/homepage/manage-dashboard.png"
        alt="Karma program manager dashboard showing active programs, applications pending review, and per-program progress"
        width={1440}
        height={820}
        sizes="(min-width: 1120px) 1080px, 100vw"
        priority
        className="w-full h-auto"
      />
    </div>
  );
}
