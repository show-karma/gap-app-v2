"use client"
import type {
  ICommunityResponse,
  IProjectResponse,
  ISearchResponse,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useAccount } from "wagmi"
import { useAuth } from "@/hooks/useAuth"
import { useMobileStore } from "@/store/mobile"
import { groupSimilarCommunities } from "@/utilities/communityHelpers" // You'll need to create this utility function
import { PAGES } from "@/utilities/pages"
import { ProfilePicture } from "../Utilities/ProfilePicture"
/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import { Spinner } from "../Utilities/Spinner"

interface Props {
  data: ISearchResponse // Will be modular in the future
  isOpen: boolean
  isLoading: boolean
  closeSearchList: () => void
  onInteractionStart?: () => void
  onInteractionEnd?: () => void
}

export const SearchList: React.FC<Props> = ({
  data = { communities: [], projects: [] },
  isOpen = false,
  isLoading = true,
  closeSearchList,
  onInteractionStart,
  onInteractionEnd,
}) => {
  const { isConnected } = useAccount()
  const { authenticated: isAuth, login } = useAuth()
  const [shouldOpen, setShouldOpen] = useState(false)
  const router = useRouter()

  const handleItemClick = (e: React.MouseEvent, href: string) => {
    e.preventDefault()
    closeSearchList()
    setIsMobileMenuOpen(false)
    // Use setTimeout to ensure state updates complete before navigation
    setTimeout(() => {
      if (e.currentTarget instanceof HTMLAnchorElement) {
        window.location.href = e.currentTarget.href
      }
    }, 0)
    router.push(href)
  }

  const handleCreateProject = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!isConnected || !isAuth) {
      closeSearchList()
      setIsMobileMenuOpen(false)
      login?.()
      setShouldOpen(true)
      return
    }
    const el = document?.getElementById("new-project-button")
    if (el) {
      closeSearchList()
      setIsMobileMenuOpen(false)
      el.click()
    }
  }

  useEffect(() => {
    if (shouldOpen && isAuth && isConnected) {
      const el = document?.getElementById("new-project-button")
      if (el) el.click()
      setShouldOpen(false)
    }
  }, [isAuth, isConnected, shouldOpen])
  const { isMobileMenuOpen, setIsMobileMenuOpen } = useMobileStore()

  const renderItem = (
    item: IProjectResponse | ICommunityResponse,
    title: string,
    href: string,
    type: "project" | "community"
  ) => {
    const imageURL =
      type === "project"
        ? (item as IProjectResponse).details?.data?.imageURL
        : (item as ICommunityResponse).details?.data?.imageURL

    return (
      <button
        key={item.uid}
        onClick={(e) => handleItemClick(e, href)}
        className="w-full cursor-pointer select-none border-b border-slate-100 transition hover:bg-slate-200 dark:hover:bg-zinc-700"
      >
        <div className="cursor-pointer flex flex-col justify-start select-none border-b border-slate-100 px-4 py-2 transition hover:bg-slate-200 dark:hover:bg-zinc-700">
          <div className="flex flex-row items-center justify-between w-full">
            <div className="flex flex-row items-center gap-3 flex-1">
              <div className="flex-shrink-0">
                <ProfilePicture
                  imageURL={imageURL}
                  name={item.uid || ""}
                  className="w-8 h-8"
                  alt={title}
                />
              </div>
              <b className="max-w-full text-left text-ellipsis font-bold text-black dark:text-zinc-100 line-clamp-1">
                {title}
              </b>
            </div>
            {type === "community" && (
              <div className="flex-shrink-0">
                <span className="px-2 py-1 bg-warning-50 text-warning-700 text-xs font-medium rounded">
                  Community
                </span>
              </div>
            )}
          </div>
        </div>
      </button>
    )
  }

  const groupedCommunities = groupSimilarCommunities(data.communities)

  return (
    isOpen && (
      <div
        role="listbox"
        className="absolute left-0 top-10 mt-3 max-h-64 min-w-full overflow-y-auto rounded-md bg-white dark:bg-zinc-800 py-4 border border-zinc-200 z-50"
        onMouseEnter={() => onInteractionStart?.()}
        onMouseLeave={() => onInteractionEnd?.()}
        onTouchStart={() => onInteractionStart?.()}
        onTouchEnd={() => onInteractionEnd?.()}
      >
        {groupedCommunities.length > 0 &&
          groupedCommunities.map((community) =>
            renderItem(
              community,
              community.details?.data?.name || "Untitled Community",
              PAGES.COMMUNITY.ALL_GRANTS(community.details?.data.slug || community.uid),
              "community"
            )
          )}

        {data.projects.length > 0 &&
          data.projects.map((project) =>
            renderItem(
              project,
              project.details?.data.title || "Untitled Project",
              PAGES.PROJECT.GRANTS(project.details?.data.slug || project.uid),
              "project"
            )
          )}

        {isLoading && (
          <div className="flex justify-center ">
            <Spinner />
          </div>
        )}
        {!isLoading && data.projects.length === 0 && data.communities.length === 0 && (
          <div className="flex flex-col items-center text-center">
            <div className="w-full text-center">No results found.</div>
            <button
              type="button"
              onClick={handleCreateProject}
              className="mt-2 cursor-pointer rounded-sm bg-brand-blue px-3 py-2 text-white font-bold border-none"
            >
              Create a project
            </button>
          </div>
        )}
      </div>
    )
  )
}
