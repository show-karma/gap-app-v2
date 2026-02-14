"use client";

import Avatar from "boring-avatars";
import Image from "next/image";
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

const isValidUrl = (url?: string): boolean => {
  if (!url) return false;
  try {
    new URL(url);
    return true;
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
  const isValid = isValidUrl(imageURL);
  const numericSize = Number.parseInt(size, 10) || 32;

  if (isValid && imageURL) {
    return (
      <Image
        alt={alt || name || "Profile"}
        src={imageURL}
        width={numericSize}
        height={numericSize}
        className={cn("rounded-full object-cover", className)}
        priority={priority}
        sizes={sizes || `${numericSize}px`}
      />
    );
  }

  return (
    <div className={cn("rounded-full overflow-hidden", className)}>
      <Avatar
        size={size}
        name={name}
        variant="marble"
        colors={["#92A1C6", "#146A7C", "#F0AB3D", "#C271B4", "#C20D90"]}
      />
    </div>
  );
};
