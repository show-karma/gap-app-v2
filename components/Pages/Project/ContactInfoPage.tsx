"use client";
import { useOwnerStore, useProjectStore } from "@/store";
import { ContactInfoSubscription } from "@/components/ContactInfoSubscription";
import { Spinner } from "@/components/Utilities/Spinner";

const ContactInfoPage = () => {
  const contactsInfo = useProjectStore((state) => state.projectContactsInfo);
  const contactInfoLoading = useProjectStore(
    (state) => state.contactInfoLoading
  );
  const refreshContactInfo = useProjectStore(
    (state) => state.refreshContactInfo
  );

  const isOwnerLoading = useOwnerStore((state) => state.isOwnerLoading);
  const isProjectOwnerLoading = useProjectStore(
    (state) => state.isProjectOwnerLoading
  );
  const isAuthorizationLoading = isOwnerLoading || isProjectOwnerLoading;

  return (
    <div className="pt-5 pb-20">
      {contactInfoLoading || isAuthorizationLoading ? (
        <div className="px-4 py-4 rounded-md border border-transparent dark:bg-zinc-800  dark:border flex flex-col gap-4 items-start">
          <h3 className="text-xl font-bold leading-6 text-gray-900 dark:text-zinc-100">
            Loading contact info...
          </h3>
          <Spinner />
        </div>
      ) : (
        <ContactInfoSubscription
          contactInfo={contactsInfo?.[contactsInfo.length - 1]}
          existingContacts={contactsInfo}
          refreshContactInfo={refreshContactInfo}
        />
      )}
    </div>
  );
};

export default ContactInfoPage;
