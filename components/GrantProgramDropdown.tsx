import { useEffect, useState } from "react"
import type { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList"
import fetchData from "@/utilities/fetchData"
import { INDEXER } from "@/utilities/indexer"

export function SearchGrantProgram({
  communityUID,
  setSelectedProgram,
}: {
  communityUID: string
  setSelectedProgram: any
}) {
  const [allPrograms, setAllPrograms] = useState<GrantProgram[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)

  useEffect(() => {
    ;(async () => {
      setIsLoading(true)
      const [result, error] = await fetchData(INDEXER.COMMUNITY.PROGRAMS(communityUID))
      if (error) {
      }
      const sortedAlphabetically = result.sort((a: GrantProgram, b: GrantProgram) => {
        const aTitle = a.metadata?.title || ""
        const bTitle = b.metadata?.title || ""
        if (aTitle < bTitle) return -1
        if (aTitle > bTitle) return 1
        return 0
      })
      setAllPrograms(sortedAlphabetically)
      setIsLoading(false)
    })()
  }, [communityUID])

  return (
    <div className="w-full max-w-[400px]">
      {isLoading ? (
        <div className="bg-zinc-100 p-3 text-sm ring-1 ring-zinc-200 rounded dark:bg-zinc-900">
          Loading Grants...
        </div>
      ) : !communityUID ? (
        <div className="bg-zinc-100 p-3 text-sm ring-1 ring-zinc-200 rounded dark:bg-zinc-900">
          Select a community to proceed
        </div>
      ) : (
        <div>
          <select
            className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-md shadow-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:text-zinc-100 transition-colors"
            onChange={(e) => {
              const selected = allPrograms.find((program) => program.programId === e.target.value)
              setSelectedProgram(selected)
            }}
            defaultValue=""
          >
            <option value="" disabled>
              Select a grant program
            </option>
            {allPrograms.map((program) => (
              <option key={program.programId} value={program.programId}>
                {program.metadata?.title}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
