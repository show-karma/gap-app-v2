import { ShieldCheck } from "lucide-react";
import {
  BTN_BASE,
  BTN_MD,
  BTN_PRIMARY,
  THUMB_BASE,
} from "@/components/Pages/Dashboard/v3/soft-classes";
import { Link } from "@/src/components/navigation/Link";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";

export function SuperAdminSection() {
  return (
    <div className="flex flex-col gap-4 rounded-sf-card bg-sf-card p-6 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <div className={cn(THUMB_BASE, "h-12 w-12 rounded-[14px]")}>
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-lg font-bold tracking-[-0.01em] text-sf-heading">Admin panel</h2>
          <p className="text-[13.5px] text-sf-muted">
            Manage communities, users, and platform settings
          </p>
        </div>
      </div>
      <Link className={cn(BTN_BASE, BTN_MD, BTN_PRIMARY, "shrink-0")} href={PAGES.ADMIN.LIST}>
        Open admin panel
      </Link>
    </div>
  );
}
