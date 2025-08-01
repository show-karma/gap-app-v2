"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { FolderIcon } from "@/components/Icons/Folder";

interface ImageWithFallbackProps {
  src?: string;
  alt: string;
  className: string;
}

export const ImageWithFallback = ({ src, alt, className }: ImageWithFallbackProps) => {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div className="w-8 h-8 flex items-center justify-center">
        <FolderIcon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
    />
  );
}; 