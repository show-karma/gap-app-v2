import Image, { type ImageProps } from "next/image";
import { cn } from "@/utilities/tailwind";

interface ThemeImageProps extends Omit<ImageProps, "src"> {
  /**
   * Base image path (without -drk suffix)
   * Example: "/images/homepage/builder-hero.png"
   * Dark mode version will be automatically found by adding -drk before .png
   * Example: "/images/homepage/builder-hero-drk.png"
   */
  src: string;
  /**
   * Optional: Explicit dark mode image path
   * If not provided, will automatically derive from src by inserting -drk before file extension
   */
  darkSrc?: string;
  /**
   * Optional: Force disable dark mode switching
   * When true, only the light image will be rendered
   */
  disableDarkMode?: boolean;
}

/**
 * ThemeImage component that automatically switches between light and dark mode images
 *
 * This is a server component that renders both images and uses CSS classes to show/hide them.
 * This eliminates the flash of incorrect theme that occurs with client-side theme detection.
 *
 * Usage:
 * ```tsx
 * <ThemeImage
 *   src="/images/homepage/builder-hero.png"
 *   alt="Builder Hero"
 *   width={420}
 *   height={420}
 * />
 * ```
 *
 * This will automatically use builder-hero-drk.png in dark mode.
 */
export function ThemeImage({
  src,
  darkSrc,
  disableDarkMode = false,
  className,
  alt,
  ...props
}: ThemeImageProps) {
  const getDarkSrc = () => {
    if (darkSrc) return darkSrc;
    if (disableDarkMode) return null;

    const lastDotIndex = src.lastIndexOf(".");
    if (lastDotIndex === -1) return null;

    const basePath = src.substring(0, lastDotIndex);
    const extension = src.substring(lastDotIndex);
    return `${basePath}-drk${extension}`;
  };

  const darkImageSrc = getDarkSrc();

  if (disableDarkMode || !darkImageSrc) {
    return <Image src={src} alt={alt || ""} className={cn(className)} {...props} />;
  }

  const hasFill = "fill" in props && props.fill === true;
  const Wrapper = hasFill ? "div" : "span";

  return (
    <Wrapper className={cn("relative", hasFill ? "w-full h-full" : "inline-block")}>
      <Image
        src={src}
        alt={alt || ""}
        className={cn(
          hasFill ? "absolute inset-0" : "block",
          "dark:invisible",
          hasFill ? "" : "dark:absolute dark:inset-0",
          className
        )}
        {...props}
      />
      <Image
        src={darkImageSrc}
        alt={alt || ""}
        className={cn(
          "absolute inset-0 invisible dark:visible",
          hasFill ? "" : "dark:relative",
          className
        )}
        {...props}
      />
    </Wrapper>
  );
}
