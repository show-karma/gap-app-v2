"use client";

import {
  ChevronDownIcon,
  EnvelopeIcon,
  IdentificationIcon,
  PaperAirplaneIcon,
  UsersIcon,
} from "@heroicons/react/20/solid";
import type { FC } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { InboxContact } from "@/hooks/useInboxContacts";
import { telegramHref } from "@/utilities/applicationContacts";
import { shortAddress } from "@/utilities/shortAddress";

const channelClass =
  "inline-flex max-w-full items-center gap-1.5 text-gray-600 transition-colors hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 dark:text-gray-300 dark:hover:text-primary-300";

const ContactRow: FC<{ contact: InboxContact }> = ({ contact }) => {
  const tg = contact.telegram ? telegramHref(contact.telegram) : null;
  const hasChannel = contact.email || contact.telegram || contact.address;
  return (
    <div className="flex flex-col gap-1 py-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="truncate text-sm font-medium text-gray-900 dark:text-white">
          {contact.name || "Unknown"}
        </span>
        {contact.role && (
          <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-normal text-gray-500 dark:bg-zinc-800 dark:text-gray-400">
            {contact.role}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-0.5 text-xs">
        {contact.email && (
          <a href={`mailto:${contact.email}`} className={channelClass}>
            <EnvelopeIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{contact.email}</span>
          </a>
        )}
        {contact.telegram &&
          (tg ? (
            <a href={tg} target="_blank" rel="noopener noreferrer" className={channelClass}>
              <PaperAirplaneIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{contact.telegram}</span>
            </a>
          ) : (
            <span className="inline-flex max-w-full items-center gap-1.5 text-gray-500 dark:text-gray-400">
              <PaperAirplaneIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{contact.telegram}</span>
            </span>
          ))}
        {contact.address && (
          <span className="inline-flex max-w-full items-center gap-1.5 font-mono text-gray-500 dark:text-gray-400">
            <IdentificationIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{shortAddress(contact.address)}</span>
          </span>
        )}
        {!hasChannel && <span className="text-gray-400 dark:text-gray-500">No contact info</span>}
      </div>
    </div>
  );
};

export const InboxContactsPopover: FC<{
  applicationContact: InboxContact | null;
  members: InboxContact[];
}> = ({ applicationContact, members }) => {
  const total = (applicationContact ? 1 : 0) + members.length;
  if (total === 0) return null;

  const triggerName = applicationContact?.name || members[0]?.name || "Contacts";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          aria-label="View contacts"
          className="group inline-flex h-auto w-max max-w-full items-center justify-start gap-1.5 rounded-md p-0 text-xs font-normal text-gray-500 hover:bg-transparent hover:text-primary-700 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:text-gray-400 dark:hover:bg-transparent dark:hover:text-primary-300"
        >
          <UsersIcon className="shrink-0" aria-hidden="true" />
          <span className="truncate">{triggerName}</span>
          {total > 1 && (
            <span className="shrink-0 rounded-full bg-gray-100 px-1.5 text-xs font-medium text-gray-500 dark:bg-zinc-800 dark:text-gray-400">
              {total}
            </span>
          )}
          <ChevronDownIcon
            className="shrink-0 text-gray-400 transition-transform group-data-[state=open]:rotate-180"
            aria-hidden="true"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <div className="max-h-96 overflow-y-auto p-3">
          {applicationContact && (
            <section>
              <h4 className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                Application contact
              </h4>
              <ContactRow contact={applicationContact} />
            </section>
          )}
          {members.length > 0 && (
            <section className="mt-2 border-t border-gray-100 pt-2 dark:border-zinc-800">
              <h4 className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                Project members ({members.length})
              </h4>
              <div className="divide-y divide-gray-100 dark:divide-zinc-800">
                {members.map((member) => (
                  <ContactRow
                    key={member.address || member.email || member.name}
                    contact={member}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
