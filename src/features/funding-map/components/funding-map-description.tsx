import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";

interface FundingMapDescriptionProps {
  description: string;
}

export function FundingMapDescription({ description }: FundingMapDescriptionProps) {
  return (
    <div className="w-full">
      <MarkdownPreview
        source={description}
        className="text-sm text-muted-foreground line-clamp-3"
      />
    </div>
  );
}
