import type { ReactNode } from "react";

export default function SolutionsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full flex-col flex-1 items-center bg-background">
      <div className="w-full max-w-[1920px] flex-1">{children}</div>
    </div>
  );
}
