const SKELETON_IDS = [
  "skeleton-1",
  "skeleton-2",
  "skeleton-3",
  "skeleton-4",
  "skeleton-5",
  "skeleton-6",
  "skeleton-7",
  "skeleton-8",
  "skeleton-9",
  "skeleton-10",
  "skeleton-11",
  "skeleton-12",
];

export const ProjectsLoading = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {SKELETON_IDS.map((id) => (
        <div
          key={id}
          className="border border-gray-200 dark:border-zinc-700 rounded-lg overflow-hidden bg-white dark:bg-zinc-900 animate-pulse"
        >
          <div className="h-2 bg-gray-200 dark:bg-zinc-700" />
          <div className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gray-200 dark:bg-zinc-700 rounded-full" />
              <div className="h-5 bg-gray-200 dark:bg-zinc-700 rounded w-3/4 flex-1" />
            </div>
            <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded mb-3 w-1/2" />
            <div className="space-y-2 mb-4">
              <div className="h-3 bg-gray-200 dark:bg-zinc-700 rounded" />
              <div className="h-3 bg-gray-200 dark:bg-zinc-700 rounded w-5/6" />
              <div className="h-3 bg-gray-200 dark:bg-zinc-700 rounded w-4/6" />
            </div>
            <div className="flex gap-2">
              <div className="h-6 bg-gray-200 dark:bg-zinc-700 rounded-full w-24" />
              <div className="h-6 bg-gray-200 dark:bg-zinc-700 rounded-full w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
