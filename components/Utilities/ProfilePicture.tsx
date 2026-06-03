"use client";

import Avatar from "boring-avatars";
import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/utilities/tailwind";

interface ProfilePictureProps {
  imageURL?: string;
  name: string;
  size?: string;
  className?: string;
  alt?: string;
  /** Set to true for above-fold images to prioritize loading */
  priority?: boolean;
  /** Responsive sizes hint for Next.js Image optimization */
  sizes?: string;
}

const AVATAR_COLORS = ["#92A1C6", "#146A7C", "#F0AB3D", "#C271B4", "#C20D90"];

const ALLOWED_HTTP_IMAGE_HOSTS = new Set(["api.unavatar.io"]);

const isAllowedImageUrl = (url?: string): boolean => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:") return true;
    if (parsed.protocol === "http:") {
      return ALLOWED_HTTP_IMAGE_HOSTS.has(parsed.hostname);
    }
    if (parsed.protocol === "data:") return true;
    return false;
  } catch {
    return false;
  }
};

export const ProfilePicture = ({
  imageURL,
  name,
  size = "32",
  className,
  alt,
  priority = false,
  sizes,
}: ProfilePictureProps) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [imageURL]);

  const isValid = isAllowedImageUrl(imageURL);
  const numericSize = Number.parseInt(size, 10) || 32;

  if (isValid && imageURL && !hasError) {
    return (
      <Image
        key={imageURL}
        alt={alt || name || "Profile"}
        src={imageURL}
        width={numericSize}
        height={numericSize}
        className={cn("rounded-full object-cover", className)}
        priority={priority}
        sizes={sizes}
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <div className={cn("rounded-full overflow-hidden", className)}>
      <Avatar size={size} name={name} variant="marble" colors={AVATAR_COLORS} />
    </div>
  );
};
