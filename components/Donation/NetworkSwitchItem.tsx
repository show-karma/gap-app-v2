interface NetworkSwitchItemProps {
  index: number
  chainName: string
  projectCount: number
  needsSwitch: boolean
}

export function NetworkSwitchItem({
  index,
  chainName,
  projectCount,
  needsSwitch,
}: NetworkSwitchItemProps) {
  return (
    <div
      className="flex items-center justify-between rounded-md bg-white/50 p-2 text-xs dark:bg-black/20"
      role="listitem"
    >
      <div className="flex items-center gap-2">
        <span className="font-mono font-medium text-amber-900 dark:text-amber-100">
          {index + 1}.
        </span>
        <span className="font-medium text-amber-900 dark:text-amber-100">{chainName}</span>
        {needsSwitch && (
          <span
            className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/60 dark:text-amber-300"
            aria-label="Network switch required"
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
            Switch required
          </span>
        )}
      </div>
      <span
        className="text-amber-700 dark:text-amber-300"
        aria-label={`${projectCount} ${projectCount === 1 ? "project" : "projects"}`}
      >
        {projectCount} {projectCount === 1 ? "project" : "projects"}
      </span>
    </div>
  )
}
