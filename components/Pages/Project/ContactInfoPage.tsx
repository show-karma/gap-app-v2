"use client";
import { ContactInfoSubscription } from "@/components/ContactInfoSubscription";
import { Spinner } from "@/components/Utilities/Spinner";
import { useAuth } from "@/hooks/useAuth";
import { useContactInfo } from "@/hooks/useContactInfo";
import { useProjectPermissions } from "@/hooks/useProjectPermissions";
import { usePermissionsQuery } from "@/src/core/rbac/hooks/use-permissions";
import { Role } from "@/src/core/rbac/types";
import { useOwnerStore, useProjectStore } from "@/store";

const ContactInfoPage = () => {
  const isOwnerLoading = useOwnerStore((state) => state.isOwnerLoading);
  const { isLoading: isPermissionLoading } = useProjectPermissions();
  const project = useProjectStore((state) => state.project);
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const isContractOwner = useOwnerStore((state) => state.isOwner);
  const { authenticated } = useAuth();
  const { data: permissions, isLoading: isPermissionsLoading } = usePermissionsQuery(
    {},
    { enabled: authenticated }
  );
  const isSuperAdmin = permissions?.roles.roles.includes(Role.SUPER_ADMIN) ?? false;
  const isAuthorized = isProjectAdmin || isProjectOwner || isContractOwner || isSuperAdmin;

  const projectId = project?.uid;
  const { data: contactsInfo, isLoading } = useContactInfo(projectId, isAuthorized);
  const isAuthorizationLoading = isOwnerLoading || isPermissionLoading || isPermissionsLoading;

  return (
    <div className="pt-5 pb-20">
      {isLoading || isAuthorizationLoading ? (
        <div className="px-4 py-4 rounded-md border border-transparent dark:bg-zinc-800  dark:border flex flex-col gap-4 items-start">
          <h3 className="text-xl font-bold leading-6 text-gray-900 dark:text-zinc-100">
            Loading contact info...
          </h3>
          <Spinner />
        </div>
      ) : (
        <ContactInfoSubscription contactInfo={contactsInfo?.[contactsInfo.length - 1]} />
      )}
    </div>
  );
};

export default ContactInfoPage;
