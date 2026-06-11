/**
 * Skeleton shown while the grant-completion permission check resolves.
 *
 * Used both as the route-level `loading.tsx` for the `complete-grant/` segment
 * and inline in `CompleteGrant` while owner status is loading, so the two stay
 * visually identical and avoid layout shift inside the grant detail layout.
 */
export const ProjectGrantsCompleteGrantLoading = () => {
  return (
    <div className="mt-9 flex flex-1">
      <div className="flex w-full max-w-3xl flex-col gap-6 rounded-md bg-gray-200 dark:bg-zinc-800 px-4 py-6 max-lg:max-w-full">
        <div className="animate-pulse h-8 w-64 bg-gray-300 dark:bg-zinc-700 rounded" />
        <div className="animate-pulse h-40 w-full bg-gray-300 dark:bg-zinc-700 rounded" />
        <div className="animate-pulse h-11 w-48 bg-gray-300 dark:bg-zinc-700 rounded self-end" />
      </div>
    </div>
  );
};
