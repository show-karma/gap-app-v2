"use client";

import { memo, useMemo } from "react";
import { MessageResponse } from "@/src/components/ai-elements/message-response";
import { linkifyNarrative } from "../lib/linkify-narrative";
import type { RankedEntity } from "../types/philanthropy";

interface NarrativeBlockProps {
  narrative: string;
  entities: RankedEntity[];
}

export const NarrativeBlock = memo(function NarrativeBlock({
  narrative,
  entities,
}: NarrativeBlockProps) {
  const linked = useMemo(
    () => (entities.length > 0 ? linkifyNarrative(narrative, entities) : narrative),
    [narrative, entities]
  );

  return <MessageResponse>{linked}</MessageResponse>;
});
