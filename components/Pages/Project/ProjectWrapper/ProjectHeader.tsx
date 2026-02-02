"use client";

import Image from "next/image";
import type React from "react";
import { Globe } from "@/components/Icons";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { ProfilePicture } from "@/components/Utilities/ProfilePicture";
import type { Project } from "@/types/v2/project";
import { ensureProtocol } from "@/utilities/ensureProtocol";

interface SocialLink {
  name: string;
  url: string;
  icon: React.FC<{ className?: string }>;
}

interface CustomLink {
  url: string;
  name?: string;
  type?: string;
}

export interface ProjectHeaderProps {
  project: Project | undefined;
  socials: SocialLink[];
  customLinks: CustomLink[];
  isProjectAdmin: boolean;
}

export const ProjectHeader = ({
  project,
  socials,
  customLinks,
  isProjectAdmin,
}: ProjectHeaderProps) => {
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <ProfilePicture
          imageURL={project?.details?.logoUrl}
          name={project?.uid || ""}
          size="56"
          className="h-12 w-12 min-w-12 min-h-12 sm:h-14 sm:w-14 sm:min-w-14 sm:min-h-14 shrink-0 border-2 border-white shadow-lg"
          alt={project?.details?.title || "Project"}
          priority
          sizes="(max-width: 640px) 48px, 56px"
        />
        <div className="flex flex-col gap-3 items-center sm:items-start">
          <h1 className="text-xl font-bold leading-tight line-clamp-2 sm:text-3xl">
            {project?.details?.title}
          </h1>
          {(socials.length > 0 || customLinks.length > 0) && (
            <div className="flex flex-row gap-4 items-center">
              {socials
                .filter((social) => social?.url)
                .map((social, index) => (
                  <a
                    key={social?.url || index}
                    href={social?.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {social?.icon && (
                      <social.icon className="h-5 w-5 fill-black text-black dark:text-white dark:fill-zinc-200" />
                    )}
                  </a>
                ))}

              {customLinks.length > 0 && (
                <div className="relative group">
                  <Globe className="h-5 w-5 text-black dark:text-white dark:fill-zinc-200 cursor-pointer" />

                  <div className="absolute left-0 top-6 mt-1 w-48 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                    <div className="py-2">
                      {customLinks.map((link, index) => (
                        <a
                          key={link.url || index}
                          href={ensureProtocol(link.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block px-4 py-2 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors duration-150"
                        >
                          {link.name}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {project?.details?.tags?.length ? (
            <div className="flex items-center gap-1 flex-wrap justify-center sm:justify-start">
              {project?.details?.tags?.map((tag) => (
                <span
                  key={tag}
                  className="rounded bg-gray-100 px-2 py-1 text-sm font-normal text-slate-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <div className="flex flex-col gap-3 items-end justify-end">
        <div className="flex flex-row gap-6 max-lg:flex-col max-lg:gap-3">
          {isProjectAdmin ? (
            <ExternalLink
              href="https://tally.so/r/w8e6GP"
              className="bg-black dark:bg-zinc-800 text-white justify-center items-center dark:text-zinc-400 flex flex-row gap-2.5 py-2 px-5 rounded-full w-max min-w-max"
            >
              <Image
                src="/icons/alert.png"
                alt="Looking for help"
                className="w-5 h-5"
                width={20}
                height={20}
              />
              <p>
                Are you <b>looking for help?</b>
              </p>
            </ExternalLink>
          ) : null}
        </div>
      </div>
    </div>
  );
};
