import Image from "next/image";
import { useParams, useSearchParams } from "next/navigation";
import { useCommunityPrograms } from "@/hooks/usePrograms";
import { ReadMore } from "@/utilities/ReadMore";
import { ArrowInIcon } from "./Icons/ArrowIn";
import { ExternalLink } from "./Utilities/ExternalLink";

/**
 * Normalize programId from URL - strips chainId suffix if present for backward compatibility
 * Supports both "programId" (new) and "programId_chainId" (legacy) formats
 */
const normalizeProgramId = (id: string | null): string | null => {
  if (!id) return null;
  // Check if it has a chainId suffix (ends with _<number>)
  const lastUnderscoreIndex = id.lastIndexOf("_");
  if (lastUnderscoreIndex !== -1) {
    const potentialChainId = id.substring(lastUnderscoreIndex + 1);
    if (/^\d+$/.test(potentialChainId)) {
      return id.substring(0, lastUnderscoreIndex);
    }
  }
  return id;
};

export const ProgramBanner = () => {
  const searchParams = useSearchParams();
  const { communityId } = useParams();
  const { data, isLoading } = useCommunityPrograms(communityId as string);
  const rawProgramId = searchParams.get("programId");
  // Normalize to handle both "programId" and legacy "programId_chainId" formats
  const programId = normalizeProgramId(rawProgramId);
  const program = data?.find((program) => program.programId === programId);

  if (!programId || !program) return null;
  return (
    <div className="flex flex-row gap-5 bg-brand-lightblue rounded-xl  px-4 py-4">
      <div className="h-full items-start">
        <Image
          width={32}
          height={32}
          src="/icons/impact.png"
          alt="Rocket icon"
          className="relative top-1"
        />
      </div>
      <div className="flex flex-1 flex-col gap-0">
        <p className="text-brand-darkblue text-base font-semibold">{program.metadata?.title}</p>
        <ReadMore
          readLessText="Read less"
          readMoreText="Read more"
          markdownClass="text-brand-darkblue text-sm font-normal"
          side="left"
        >
          {program.metadata?.description as string}
        </ReadMore>
        {program.metadata?.socialLinks?.grantsSite ? (
          <ExternalLink
            href={
              program.metadata?.socialLinks?.grantsSite?.includes("http")
                ? program.metadata?.socialLinks?.grantsSite
                : `https://${program.metadata?.socialLinks?.grantsSite}`
            }
            className="flex flex-row gap-1 items-center max-w-max w-max"
          >
            <u className="text-brand-blue text-base font-medium">Apply</u>
            <ArrowInIcon className="text-brand-blue w-5 h-5" />
          </ExternalLink>
        ) : null}
      </div>
    </div>
  );
};
