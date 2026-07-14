"use client";

import type React from "react";
import type { Hex } from "viem";

export function SoftShell({ children }: { address?: Hex; children: React.ReactNode }) {
  return (
    <div className="dashv3 min-h-[calc(100vh-var(--navbar-height,64px))] bg-sf-panel">
      <div className="mx-auto max-w-[1920px] px-4 sm:px-8 lg:px-24">
        <div className="pb-12 pt-8">{children}</div>
      </div>
    </div>
  );
}
