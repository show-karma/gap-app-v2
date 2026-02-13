import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PAGES } from "@/utilities/pages";

export function SuperAdminSection() {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 rounded-xl border border-border p-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <ShieldCheck className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold text-foreground">Admin Panel</h2>
            <p className="text-sm text-muted-foreground">
              Manage communities, users, and platform settings
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href={PAGES.ADMIN.LIST}>Open Admin Panel</Link>
        </Button>
      </div>
    </section>
  );
}
