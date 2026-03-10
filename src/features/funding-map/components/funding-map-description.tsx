"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { HEADING_AS_BOLD_COMPONENTS } from "../utils/markdown-heading-components";

interface FundingMapDescriptionProps {
  description: string;
}

function DescriptionSkeleton() {
  return (
    <div className="space-y-2 w-full">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

const MarkdownContent = dynamic(
  () =>
    import("@/components/Utilities/MarkdownPreview").then((mod) => ({
      default: ({ description }: { description: string }) => (
        <mod.MarkdownPreview
          source={description}
          className="text-sm text-muted-foreground line-clamp-3"
          components={HEADING_AS_BOLD_COMPONENTS}
        />
      ),
    })),
  {
    ssr: false,
    loading: () => <DescriptionSkeleton />,
  }
);

export function FundingMapDescription({ description }: FundingMapDescriptionProps) {
  return (
    <div className="w-full">
      <MarkdownContent description={description} />
    </div>
  );
}
