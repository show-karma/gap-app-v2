"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * Component for rendering a customer avatar with error fallback.
 */
export function CustomerAvatar({ src, alt }: { src: string; alt: string }) {
    const [error, setError] = useState(false);

    if (error) {
        return (
            <div className="relative w-6 h-6 rounded-full overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center">
                <span className="text-xs text-muted-foreground">
                    {alt.charAt(0).toUpperCase()}
                </span>
            </div>
        );
    }

    return (
        <div className="relative w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
            <Image
                src={src}
                alt={alt}
                fill
                className="object-cover"
                onError={() => setError(true)}
            />
        </div>
    );
}

