"use client";

import { useParams, useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import { FollowUpActivity } from "@/components/FundingPlatform/FollowUp/FollowUpActivity";
import { FollowUpPlaybookEditor } from "@/components/FundingPlatform/FollowUp/FollowUpPlaybookEditor";
import { SettingsSidebar, type SidebarTabKey } from "@/components/FundingPlatform/Sidebar";
import { Spinner } from "@/components/Utilities/Spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCommunityAdminAccess } from "@/hooks/communities/useCommunityAdminAccess";
import { useFundingPrograms } from "@/hooks/useFundingPlatform";
import { useKycConfig } from "@/hooks/useKycStatus";
import { FundingPlatformGuard } from "@/src/core/rbac";
import { usePermissionContext } from "@/src/core/rbac/context/permission-context";
import { Permission } from "@/src/core/rbac/types";
import { layoutTheme } from "@/src/helper/theme";
import { PAGES } from "@/utilities/pages";

export default function ProgramFollowUpPage() {
  const { communityId, programId: combinedProgramId } = useParams() as {
    communityId: string;
    programId: string;
  };
  const programId = combinedProgramId.includes("_")
    ? combinedProgramId.slice(0, combinedProgramId.lastIndexOf("_"))
    : combinedProgramId;

  const { isLoading: isLoadingPermissions, can } = usePermissionContext();
  const [tab, setTab] = useQueryState("tab", { defaultValue: "activity", clearOnDefault: true });
  const {
    programs = [],
    isLoading: isLoadingPrograms,
    error: programsError,
  } = useFundingPrograms(communityId);
  const { isEnabled: kycEnabled } = useKycConfig(communityId);
  const { hasAccess: hasCommunityAdminAccess } = useCommunityAdminAccess(communityId);
  const router = useRouter();

  const openSettingsTab = (tab: SidebarTabKey) => {
    const base = PAGES.MANAGE.FUNDING_PLATFORM.QUESTION_BUILDER(communityId, combinedProgramId);
    router.push(tab === "build" ? base : `${base}?tab=${tab}`);
  };

  if (isLoadingPermissions || isLoadingPrograms) {
    return (
      <div className="flex min-h-[400px] w-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (programsError) {
    return (
      <div className={layoutTheme.padding}>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-red-700 dark:text-red-300">
            Failed to load program data. Please try again.
          </p>
        </div>
      </div>
    );
  }

  const program = programs.find((p) => p.programId === programId);
  const programName = program?.metadata?.title || program?.name || "Untitled Program";

  return (
    <FundingPlatformGuard>
      <div className="flex min-h-full">
        <SettingsSidebar
          activeTab="follow-up"
          onTabChange={openSettingsTab}
          communityId={communityId}
          programId={combinedProgramId}
          programTitle={programName}
          kycEnabled={kycEnabled}
          showNotificationConfig={hasCommunityAdminAccess}
        />
        <div className="min-w-0 flex-1 p-6">
          <div className="max-w-6xl">
            <h1 className="text-2xl font-bold text-foreground">Follow-up agent</h1>
            <p className="mt-1 text-muted-foreground">
              What the assistant did to get &quot;{programName}&quot; milestones reviewed, and where
              it needs you.
            </p>
            <Tabs
              value={tab === "playbook" ? "playbook" : "activity"}
              onValueChange={(value) => void setTab(value)}
              className="mt-6"
            >
              <TabsList>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="playbook">Playbook</TabsTrigger>
              </TabsList>
              <TabsContent value="activity" className="mt-5">
                <FollowUpActivity programId={programId} />
              </TabsContent>
              <TabsContent value="playbook" className="mt-5">
                <FollowUpPlaybookEditor
                  programId={programId}
                  canEdit={can(Permission.PROGRAM_EDIT)}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </FundingPlatformGuard>
  );
}
