import Image from "next/image";
import type { FC } from "react";
import { cn } from "@/utilities/tailwind";

interface ImageThemeProps {
  lightSrc: string;
  darkSrc: string;
  alt: string;
  className?: string;
}
export const ImageTheme: FC<ImageThemeProps> = (props) => {
  const { lightSrc, darkSrc, alt, className } = props;
  return (
    <div className={cn("relative", className)}>
      <Image src={lightSrc} alt={alt} fill className={cn(className, "dark:hidden")} />
      <Image src={darkSrc} alt={alt} fill className={cn(className, "hidden dark:block")} />
    </div>
  );
};
