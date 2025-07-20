"use client";
import { useProjectStore } from "@/features/projects/lib/store";
import { useOwnerStore } from "@/features/contract-owner/lib/owner";
import { Spinner } from "@/components/ui/spinner";
import { useContactInfo } from "@/hooks/useContactInfo";
import useProjectPermissions from "../../hooks/use-project-permissions";
import { ContactInfoSubscription } from "./contact-info-subscription";

const ContactInfoPage = () => {
  const isOwnerLoading = useOwnerStore((state) => state.isOwnerLoading);
  const { isLoading: isPermissionLoading } = useProjectPermissions();
  const project = useProjectStore((state) => state.project);
  const isAuthorized = useProjectStore((state) => state.isProjectAdmin);

  const projectId = project?.uid;
  const { data: contactsInfo, isLoading } = useContactInfo(
    projectId,
    isAuthorized
  );
  const isAuthorizationLoading = isOwnerLoading || isPermissionLoading;

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
        <ContactInfoSubscription
          contactInfo={contactsInfo?.[contactsInfo.length - 1]}
        />
      )}
    </div>
  );
};

export default ContactInfoPage;
