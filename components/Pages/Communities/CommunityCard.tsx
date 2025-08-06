import Link from "next/link";
import { ChevronRightIcon } from "@heroicons/react/24/solid";
import { ImageTheme } from "@/components/Utilities/ImageTheme";
import { PAGES } from "@/utilities/pages";

interface CommunityCardProps {
  community: {
    name: string;
    slug: string;
    uid: string;
    imageURL: {
      light: string;
      dark: string;
    };
    stats: {
      grants: number;
      projects: number;
      members: number;
    };
  };
}

export const CommunityCard = ({ community }: CommunityCardProps) => {
  return (
    <div
      className="flex flex-col p-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 ease-in-out w-full min-w-0"
      style={{ height: '318px' }}
    >
      {/* Community Image */}
      <div className="flex justify-center mb-3">
        <ImageTheme
          alt={community.name}
          lightSrc={community.imageURL.light}
          darkSrc={community.imageURL.dark}
          className="w-[72px] h-[72px] rounded-full object-cover flex-shrink-0"
        />
      </div>

      {/* Community Name */}
      <div className="text-center mb-3 min-w-0">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white line-clamp-2 break-words">
          {community.name}
        </h3>
      </div>

      {/* Category Tag */}
      <div className="flex justify-center mb-3">
        <span className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-sm font-medium rounded-sm flex-shrink-0">
          Infrastructure
        </span>
      </div>

      {/* Stats */}
      <div className="flex justify-center space-x-4 mb-3 min-w-0">
        <div className="text-center min-w-0">
          <div className="text-base font-bold text-neutral-600 dark:text-neutral-400">
            {community.stats.grants}
          </div>
          <div className="text-base font-normal text-neutral-600 dark:text-neutral-400 truncate">
            grants
          </div>
        </div>
        <div className="text-center min-w-0">
          <div className="text-base font-bold text-neutral-600 dark:text-neutral-400">
            {community.stats.projects}
          </div>
          <div className="text-base font-normal text-neutral-600 dark:text-neutral-400 truncate">
            projects
          </div>
        </div>
        <div className="text-center min-w-0">
          <div className="text-base font-bold text-neutral-600 dark:text-neutral-400">
            +{(community.stats.members / 1000).toFixed(0)}k
          </div>
          <div className="text-base font-normal text-neutral-600 dark:text-neutral-400 truncate">
            members
          </div>
        </div>
      </div>

      {/* Go Button */}
      <div className="flex justify-end mt-auto pt-2">
        <Link
          href={PAGES.COMMUNITY.ALL_GRANTS(community.slug || community.uid)}
          className="flex items-center justify-center w-20 h-10 bg-primary-100 dark:bg-primary-900 text-primary-500 dark:text-primary-400 text-sm font-semibold rounded flex-shrink-0"
        >
          <span>Go</span>
          <ChevronRightIcon className="h-4 w-4 ml-1" />
        </Link>
      </div>
    </div>
  );
}; 