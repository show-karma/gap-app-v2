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
    <Link className={cn("flex-shrink-0 max-w-[96px] max-h-[40px]", className)} href={href}>
      <Image
        className="block w-full h-auto dark:hidden"
        src="/logo/karma-logo-light.svg"
        alt="Karma"
        width={96}
        height={32}
        priority={true}
        quality={100}
      />
      <Image
        className="hidden w-full h-auto dark:block"
        src="/logo/karma-logo-dark.svg"
        alt="Karma"
        width={96}
        height={32}
        priority={true}
      />
    </Link>
  );
}

