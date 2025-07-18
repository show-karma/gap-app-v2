import { useState, useEffect, useRef } from "react";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { linkName, mapLinks } from "./utils/links";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import { useProjectStore } from "@/src/features/projects/lib/store";
import { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";

export interface ProjectWithExternal extends IProjectResponse {
  external?: {
    network_addresses?: string[];
  };
}

export const GroupedLinks = ({ proofs }: { proofs: string[] }) => {
  const { project } = useProjectStore();
  const links = mapLinks(
    proofs,
    (project as ProjectWithExternal)?.external?.network_addresses
  );
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>(
    {}
  );
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Group links by their names
  const groupedLinks = links.reduce((acc, link) => {
    const name = linkName(link as string);
    if (!acc[name]) {
      acc[name] = [];
    }
    acc[name].push(link as string);
    return acc;
  }, {} as Record<string, string[]>);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      Object.entries(dropdownRefs.current).forEach(([name, ref]) => {
        if (ref && !ref.contains(event.target as Node) && openDropdowns[name]) {
          setOpenDropdowns((prev) => ({ ...prev, [name]: false }));
        }
      });
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openDropdowns]);

  const toggleDropdown = (name: string) => {
    setOpenDropdowns((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  return (
    <>
      {Object.entries(groupedLinks).map(([name, urls], groupIndex) => (
        <div
          key={groupIndex}
          className="relative flex items-center gap-1 mr-2 mb-1"
        >
          {urls.length === 1 ? (
            <ExternalLink
              href={urls[0]}
              className="text-sm text-gray-500 dark:text-zinc-400 underline truncate"
            >
              {name}
            </ExternalLink>
          ) : (
            <div
              ref={(el) => {
                if (el) {
                  dropdownRefs.current[name] = el;
                }
              }}
              className="relative"
            >
              <button
                onClick={() => toggleDropdown(name)}
                className="text-sm text-gray-500 dark:text-zinc-400 underline truncate flex items-center gap-1 hover:text-gray-700 dark:hover:text-zinc-300"
              >
                {name} ({urls.length})
                {openDropdowns[name] ? (
                  <ChevronUpIcon className="h-3 w-3" />
                ) : (
                  <ChevronDownIcon className="h-3 w-3" />
                )}
              </button>

              {openDropdowns[name] && (
                <div className="absolute left-0 z-10 mt-1 py-1 w-max min-w-full bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded shadow-lg">
                  {urls.map((url, i) => (
                    <ExternalLink
                      key={i}
                      href={url}
                      className="block px-4 py-2 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700"
                    >
                      {name} #{i + 1}
                    </ExternalLink>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </>
  );
};
