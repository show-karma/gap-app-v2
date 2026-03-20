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

  return links
    .filter((link) => link.type && typeMap[link.type])
    .map((link) => {
      const config = typeMap[link.type];
      const url = link.url.startsWith("http") ? link.url : `https://${link.url}`;
      return { name: config.name, url, iconPath: config.iconPath };
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
              d="M3.85019 8.62001C3.70423 7.96253 3.72665 7.27885 3.91535 6.63235C4.10405 5.98584 4.45294 5.39745 4.92966 4.92173C5.40638 4.446 5.9955 4.09835 6.6424 3.911C7.2893 3.72365 7.97303 3.70267 8.63019 3.85001C8.9919 3.28431 9.4902 2.81876 10.0791 2.49629C10.6681 2.17382 11.3287 2.00479 12.0002 2.00479C12.6716 2.00479 13.3323 2.17382 13.9212 2.49629C14.5102 2.81876 15.0085 3.28431 15.3702 3.85001C16.0284 3.70203 16.7133 3.72292 17.3612 3.91072C18.0091 4.09852 18.599 4.44715 19.076 4.92416C19.5531 5.40117 19.9017 5.99108 20.0895 6.63901C20.2773 7.28694 20.2982 7.97184 20.1502 8.63001C20.7159 8.99171 21.1814 9.49001 21.5039 10.079C21.8264 10.6679 21.9954 11.3286 21.9954 12C21.9954 12.6715 21.8264 13.3321 21.5039 13.9211C21.1814 14.51 20.7159 15.0083 20.1502 15.37C20.2975 16.0272 20.2765 16.7109 20.0892 17.3578C19.9018 18.0047 19.5542 18.5938 19.0785 19.0705C18.6027 19.5473 18.0144 19.8961 17.3679 20.0848C16.7213 20.2736 16.0377 20.296 15.3802 20.15C15.019 20.7179 14.5203 21.1854 13.9303 21.5093C13.3404 21.8332 12.6782 22.0031 12.0052 22.0031C11.3322 22.0031 10.67 21.8332 10.0801 21.5093C9.49011 21.1854 8.99143 20.7179 8.63019 20.15C7.97303 20.2973 7.2893 20.2764 6.6424 20.089C5.9955 19.9017 5.40638 19.554 4.92966 19.0783C4.45294 18.6026 4.10405 18.0142 3.91535 17.3677C3.72665 16.7212 3.70423 16.0375 3.85019 15.38C3.28015 15.0192 2.81061 14.5202 2.48524 13.9292C2.15988 13.3383 1.98926 12.6746 1.98926 12C1.98926 11.3254 2.15988 10.6617 2.48524 10.0708C2.81061 9.47983 3.28015 8.98076 3.85019 8.62001Z"
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
