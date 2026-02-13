"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/utilities/tailwind";

interface LogoProps {
  className?: string;
  href?: string;
}

export function Logo({ className, href = "/" }: LogoProps) {
  return (
    <Link className={cn("flex-shrink-0 w-[96px] h-[32px]", className)} href={href}>
      <Image
        className="block w-[96px] h-[32px] dark:hidden"
        src="/logo/karma-logo-light.svg"
        alt="Karma"
        width={96}
        height={32}
        priority={true}
        quality={100}
      />
      <Image
        className="hidden w-[96px] h-[32px] dark:block"
        src="/logo/karma-logo-dark.svg"
        alt="Karma"
        width={96}
        height={32}
        priority={true}
      />
    </Link>
  );
}
