import Image from "next/image";
import { SocialLinks } from "@/features/programs/components/social-links";

interface SocialLinksData {
  twitter?: string;
  discord?: string;
  telegram?: string;
}

interface ProgramBylineProps {
  tenantName: string;
  tenantLogo?: string;
  socialLinks?: SocialLinksData;
}

export function ProgramByline({
  tenantName,
  tenantLogo,
  socialLinks,
}: ProgramBylineProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">by</span>
        {tenantLogo ? (
          <div className="relative h-5 w-5 overflow-hidden rounded-full">
            <Image
              src={tenantLogo}
              alt={tenantName}
              fill
              className="object-cover"
            />
          </div>
        ) : null}
        <span className="font-medium">{tenantName}</span>
      </div>

      <SocialLinks socialLinks={socialLinks} />
    </div>
  );
}
