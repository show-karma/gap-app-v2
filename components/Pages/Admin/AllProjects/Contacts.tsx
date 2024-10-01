import { TelegramIcon } from "@/components/Icons";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { Contact } from "@/types/project";
import { cn } from "@/utilities/tailwind";
import { AtSymbolIcon, InboxArrowDownIcon } from "@heroicons/react/24/solid";
import { FC } from "react";

interface ContactsProps {
  contacts: Contact[];
}

const rowClass =
  "text-normal  text-zinc-800 dark:text-zinc-200 text-base break-normal line-clamp-2 w-full max-w-[320px] px-0 py-0";

export const ProjectContacts: FC<ContactsProps> = ({ contacts }) => {
  const isLink = (link?: string) => {
    if (!link) return false;
    if (
      link.includes("http://") ||
      link.includes("https://") ||
      link.includes("www.")
    ) {
      return true;
    }
    return false;
  };
  return (
    <div>
      {contacts.map((contact) => (
        <div
          key={contact.id + contact.name + contact.email}
          className="flex flex-col gap-1 my-2"
        >
          <p className={cn(rowClass, "pb-0 font-semibold")}>{contact?.name}</p>
          <div className="flex flex-col gap-1">
            {contact?.email ? (
              <div className="flex flex-row gap-1 items-center">
                <AtSymbolIcon className="w-3 h-3 text-black dark:text-white" />
                <p className={cn(rowClass)}>{contact?.email}</p>
              </div>
            ) : null}
            {contact?.telegram ? (
              <div className="flex flex-row gap-1 items-center">
                <TelegramIcon className="w-3 h-3 text-black dark:text-white" />
                {isLink(contact?.telegram) ? (
                  <ExternalLink
                    href={
                      contact?.telegram.includes("http")
                        ? contact?.telegram
                        : `https://${contact?.telegram}`
                    }
                    className={cn(rowClass, "underline text-blue-500")}
                  >
                    {contact?.telegram}
                  </ExternalLink>
                ) : (
                  <ExternalLink
                    href={`https://t.me/${contact?.telegram}`}
                    className={cn(rowClass, "underline text-blue-500")}
                  >
                    {contact?.telegram}
                  </ExternalLink>
                )}
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
};
