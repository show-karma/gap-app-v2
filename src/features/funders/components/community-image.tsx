"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * Component for rendering a community logo with error fallback.
 */
export function CommunityImage({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="relative w-6 h-6 rounded-full overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center">
        <span className="text-[10px] text-muted-foreground font-semibold">
          {alt.slice(0, 2).toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    <div className="relative w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
      <Image src={src} alt={alt} fill className="object-cover" onError={() => setError(true)} />
    </div>
  );
}
