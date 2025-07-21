/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils/cn";
import { FC } from "react";

interface ImageThemeProps {
  lightSrc: string;
  darkSrc: string;
  alt: string;
  className?: string;
}
export const ImageTheme: FC<ImageThemeProps> = (props) => {
  const { lightSrc, darkSrc, alt, className } = props;
  return (
    <div className={className}>
      <img src={lightSrc} alt={alt} className={cn(className, "dark:hidden")} />
      <img
        src={darkSrc}
        alt={alt}
        className={cn(className, "hidden dark:block")}
      />
    </div>
  );
};
