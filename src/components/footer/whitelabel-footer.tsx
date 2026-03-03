"use client";

import Image from "next/image";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";

export function WhitelabelFooter() {
  const [, copy] = useCopyToClipboard();

  return (
    <footer className="w-full flex-col gap-4 flex items-center justify-center py-3 mb-8">
      <a
        className="flex items-center gap-3 text-current"
        href="https://karmahq.xyz"
        target="_blank"
        rel="noopener noreferrer"
      >
        <span className="text-zinc-600 dark:text-zinc-400">Powered by</span>
        <Image
          src="/logo/karma-logo-light.svg"
          alt="Karma"
          width={60}
          height={20}
          className="hidden dark:block"
        />
        <Image
          src="/images/karma-logo-dark.svg"
          alt="Karma"
          width={60}
          height={20}
          className="block dark:hidden"
        />
      </a>
      <div className="flex flex-col justify-center items-center gap-0">
        <p className="text-md text-center text-zinc-600 dark:text-zinc-400">
          Building transparent funding infrastructure for ecosystems.
        </p>
        <button
          type="button"
          className="text-sm text-blue-500 font-medium cursor-pointer hover:underline"
          onClick={() => copy("info@karmahq.xyz")}
        >
          info@karmahq.xyz
        </button>
      </div>
    </footer>
  );
}
