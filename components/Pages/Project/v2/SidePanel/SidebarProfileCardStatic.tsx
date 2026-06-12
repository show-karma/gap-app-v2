import Image from "next/image";
import type { Project } from "@/types/v2/project";
import { cn } from "@/utilities/tailwind";

interface SidebarProfileCardStaticProps {
  project: Project;
  isVerified?: boolean;
  className?: string;
}

/**
 * Extract social links from project details as a pure function (no hooks).
 * Mirrors the logic in useProjectSocials but without React.useMemo.
 */
function getProjectSocials(
  links?: Array<{ url: string; type: string }>
): Array<{ name: string; url: string; iconPath: string }> {
  if (!links) return [];

  const typeMap: Record<string, { name: string; iconPath: string }> = {
    twitter: {
      name: "Twitter",
      iconPath:
        "M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z",
    },
    github: {
      name: "Github",
      iconPath:
        "M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4M9 18c-4.51 2-5-2-7-2",
    },
    discord: {
      name: "Discord",
      // Simplified Discord icon path
      iconPath: "",
    },
    website: {
      name: "Website",
      iconPath:
        "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z",
    },
    linkedin: {
      name: "LinkedIn",
      iconPath:
        "M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2zM4 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4z",
    },
    farcaster: {
      name: "Farcaster",
      iconPath: "",
    },
  };

  return links.flatMap((link) => {
    if (!(link.type && typeMap[link.type])) return [];
    const config = typeMap[link.type];
    const url = link.url.startsWith("http") ? link.url : `https://${link.url}`;
    return [{ name: config.name, url, iconPath: config.iconPath }];
  });
}

/**
 * Server-rendered static version of SidebarProfileCard.
 *
 * Renders avatar, name, description, verification badge, and social links
 * using only public project data. No hooks, no interactivity.
 *
 * Uses identical Tailwind classes as the client SidebarProfileCard to prevent CLS
 * when the client version hydrates and replaces this.
 */
export function SidebarProfileCardStatic({
  project,
  isVerified,
  className,
}: SidebarProfileCardStaticProps) {
  const description = project?.details?.description || "";
  const shouldTruncate = description.length > 200;
  const displayDescription = shouldTruncate ? `${description.slice(0, 200)}...` : description;
  const socials = getProjectSocials(project?.details?.links);

  return (
    <div
      className={cn(
        "flex flex-col gap-4 p-6 rounded-lg border bg-background dark:bg-secondary shadow-sm",
        className
      )}
      data-testid="sidebar-profile-card-static"
    >
      {/* Top row: avatar (no share button in static version) */}
      <div className="flex flex-row items-start justify-between gap-4">
        {project?.details?.logoUrl ? (
          <Image
            src={project.details.logoUrl}
            alt={project?.details?.title || "Project"}
            width={64}
            height={64}
            className="h-16 w-16 min-w-16 min-h-16 shrink-0 rounded-full shadow-sm object-cover"
            priority
            sizes="64px"
            data-testid="sidebar-profile-avatar"
          />
        ) : (
          <div
            className="h-16 w-16 min-w-16 min-h-16 shrink-0 rounded-full bg-muted flex items-center justify-center text-lg font-semibold text-muted-foreground"
            data-testid="sidebar-profile-avatar-fallback"
          >
            {(project?.details?.title || "P").charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Project name + verification badge */}
      <h2
        className="text-xl font-semibold text-foreground leading-tight"
        data-testid="sidebar-project-title"
      >
        {project?.details?.title}
        {isVerified && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            className="h-4 w-4 inline-block align-middle ml-2 mt-0.5 shrink-0"
            aria-label="Verified project"
            role="img"
          >
            <path
              d="M3.85 8.62C3.7 7.96 3.73 7.28 3.92 6.63C4.1 5.99 4.45 5.4 4.93 4.92C5.41 4.45 6 4.1 6.64 3.91C7.29 3.72 7.97 3.7 8.63 3.85C8.99 3.28 9.49 2.82 10.08 2.5C10.67 2.17 11.33 2 12 2C12.67 2 13.33 2.17 13.92 2.5C14.51 2.82 15.01 3.28 15.37 3.85C16.03 3.7 16.71 3.72 17.36 3.91C18.01 4.1 18.6 4.45 19.08 4.92C19.55 5.4 19.9 5.99 20.09 6.64C20.28 7.29 20.3 7.97 20.15 8.63C20.72 8.99 21.18 9.49 21.5 10.08C21.83 10.67 22 11.33 22 12C22 12.67 21.83 13.33 21.5 13.92C21.18 14.51 20.72 15.01 20.15 15.37C20.3 16.03 20.28 16.71 20.09 17.36C19.9 18 19.55 18.59 19.08 19.07C18.6 19.55 18.01 19.9 17.37 20.08C16.72 20.27 16.04 20.3 15.38 20.15C15.02 20.72 14.52 21.19 13.93 21.51C13.34 21.83 12.68 22 12.01 22C11.33 22 10.67 21.83 10.08 21.51C9.49 21.19 8.99 20.72 8.63 20.15C7.97 20.3 7.29 20.28 6.64 20.09C6 19.9 5.41 19.55 4.93 19.08C4.45 18.6 4.1 18.01 3.92 17.37C3.73 16.72 3.7 16.04 3.85 15.38C3.28 15.02 2.81 14.52 2.49 13.93C2.16 13.34 1.99 12.67 1.99 12C1.99 11.33 2.16 10.66 2.49 10.07C2.81 9.48 3.28 8.98 3.85 8.62Z"
              stroke="#10B981"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M9 12L11 14L15 10"
              stroke="#10B981"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </h2>

      {/* Description */}
      {description && (
        <div data-testid="sidebar-project-description">
          <p className="text-sm text-muted-foreground leading-relaxed">{displayDescription}</p>
        </div>
      )}

      {/* Social icons */}
      {socials.length > 0 && (
        <div className="flex flex-row items-center gap-3 flex-wrap mt-1">
          {socials.map((social) => (
            <a
              key={social.url}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label={`Visit ${social.name}`}
              data-testid="sidebar-social-link"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d={social.iconPath} />
              </svg>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
