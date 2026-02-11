import Link from "next/link";
import { ProfilePicture } from "@/components/Utilities/ProfilePicture";
import { Button } from "@/components/ui/button";
import type { DashboardAdminCommunity } from "@/hooks/useDashboardAdmin";

interface CommunityHealthCardProps {
  community: DashboardAdminCommunity;
}

export function CommunityHealthCard({ community }: CommunityHealthCardProps) {
  return (
    <div className="flex h-full flex-col gap-4 rounded-xl border border-border p-4">
      <div className="flex items-center gap-3">
        <ProfilePicture
          imageURL={community.logoUrl}
          name={community.name}
          size="40"
          className="h-10 w-10 min-h-10 min-w-10 border border-border"
          alt={community.name}
        />
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-foreground">{community.name}</p>
        </div>
      </div>

      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
        <span>{community.activeProgramsCount} active programs</span>
        <span>{community.pendingApplicationsCount} pending applications</span>
      </div>

      <Button asChild variant="outline" size="sm">
        <Link href={community.manageUrl}>Manage</Link>
      </Button>
    </div>
  );
}
