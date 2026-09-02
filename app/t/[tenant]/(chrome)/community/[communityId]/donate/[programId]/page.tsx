import { notFound } from "next/navigation";
import { CommunityGrantsDonate } from "@/components/CommunityGrantsDonate";
import { pagesOnRoot } from "@/utilities/pagesOnRoot";
import { getCommunityProjectsCached } from "@/utilities/queries/v2/getCommunityData.cached";

type Props = {
  params: Promise<{
    communityId: string;
    programId: string;
  }>;
};

export default async function Page(props: Props) {
  const { communityId, programId } = await props.params;

  if (pagesOnRoot.includes(communityId)) {
    notFound();
  }

  // The cached twin, not the raw loader: `api.*` is axios, so it never reaches
  // Next's patched fetch and no fetch-cache option applies -- "use cache" is the
  // only lever, and every argument here is part of the cache key, so the
  // per-program grid gets its own entry rather than colliding with the default.
  const initialProjects = await getCommunityProjectsCached(communityId, {
    page: 1,
    limit: 12,
    selectedProgramId: programId,
  });

  return (
    <main className="flex flex-col w-full max-w-full sm:px-3 md:px-4 px-6 py-2">
      <CommunityGrantsDonate initialProjects={initialProjects} />
    </main>
  );
}
