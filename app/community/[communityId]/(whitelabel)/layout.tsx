import { layoutTheme } from "@/src/helper/theme";
import { cn } from "@/utilities/tailwind";

export default function WhitelabelLayout({ children }: { children: React.ReactNode }) {
  return <div className={cn(layoutTheme.padding, "w-full max-w-full")}>{children}</div>;
}
